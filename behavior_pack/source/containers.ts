import {
	type Block,
	BlockComponentTypes,
	type BlockInventoryComponent,
	type Container,
	type DimensionLocation,
	type Entity,
	EntityComponentTypes,
	type EntityEnderInventoryComponent,
	type EntityEquippableComponent,
	type EntityInventoryComponent,
	type EntityIsTamedComponent,
	EquipmentSlot,
	type ItemStack,
	Player,
} from "@minecraft/server";
import { getSelectorName, prettyTypeId, vector3ToString } from "./prettyTypeId";
import { type BooleanWithMessage, type SlotData, SlotName } from "./types";

function addItemsToContainer(
	selector: Entity | Block,
	container: Container,
	itemStack: ItemStack,
	amountToGive: number,
): BooleanWithMessage {
	if (!selector.isValid || !container.isValid) {
		return {
			bool: false,
			message: `Unable to give ${prettyTypeId(itemStack.typeId)} to invalid selector`,
		};
	}
	let amountLeft: number = amountToGive;
	while (amountLeft > 0) {
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		let result: ItemStack | undefined;
		try {
			// Returns ItemStack on failure
			result = container.addItem(itemStack);
		} catch (error) {
			let message: string = `Unable to add ${prettyTypeId(itemStack.typeId)} to container of ${getSelectorName(selector)}`;
			if (error instanceof Error) {
				message += `: ${error.message}`;
			}
			return {
				bool: false,
				message: message,
			};
		}
		if (result !== undefined) {
			// Inventory is full
			amountLeft -= itemStack.amount - result.amount; // In case a partial itemStack was given
			break;
		}
		amountLeft -= itemStack.amount;
	}
	while (amountLeft > 0) {
		// Spawn remaining items as entities
		if (!selector.isValid) {
			return {
				bool: false,
				message: `Only gave ${prettyTypeId(itemStack.type.id)} * ${amountToGive - amountLeft}/${amountToGive} to ${getSelectorName(selector)}. Unable to spawn items on invalid selector.`,
			};
		}
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		try {
			selector.dimension.spawnItem(itemStack, selector.location);
		} catch (error) {
			let message: string = `Unable to spawn ${prettyTypeId(itemStack.typeId)} on ${getSelectorName(selector)}`;
			if (error instanceof Error) {
				message += `: ${error.message}`;
			}
			return {
				bool: false,
				message: message,
			};
		}
		amountLeft -= itemStack.amount;
	}
	return {
		bool: true,
		message: `Gave ${prettyTypeId(itemStack.type.id)} * ${amountToGive} to ${getSelectorName(selector)}`,
	};
}

function setItemInContainerSlot(
	selector: Entity | Block,
	container: Container,
	item: ItemStack,
	slot: SlotData,
): BooleanWithMessage {
	if (!container.isValid) {
		return {
			bool: false,
			message: `${getSelectorName(selector)} container is invalid`,
		};
	}
	if (slot.id === undefined) {
		if (slot.name !== SlotName.Hotbar) {
			return addItemsToContainer(selector, container, item, item.amount);
		} else {
			let firstEmptySlot: number | undefined = container.firstEmptySlot();
			if (firstEmptySlot === undefined || firstEmptySlot > 8) {
				firstEmptySlot = 8;
			}
			slot.id = firstEmptySlot;
			return setItemInContainerSlot(selector, container, item, slot);
		}
	}
	if (slot.id < 0 || slot.id >= container.size) {
		return {
			bool: false,
			message: `slotId "${slot.id}" is invalid for ${getSelectorName(selector)}. Must be between 0 and ${container.size - 1}`,
		};
	}
	let oldItem: ItemStack | undefined;
	if (slot.keepOldItem) {
		oldItem = container.getItem(slot.id);
	}
	container.setItem(slot.id, item);
	let oldItemGiveResult: BooleanWithMessage | undefined;
	if (oldItem) {
		oldItemGiveResult = addItemsToContainer(selector, container, oldItem, oldItem.amount);
	}
	let message: string = `Replaced item in slot ${slot.id}`;
	if (oldItemGiveResult !== undefined && !oldItemGiveResult.bool) {
		message += `\nHowever, ${oldItemGiveResult.message}`;
	}
	return {
		bool: true,
		message: message,
	};
}

function setItemInventory(entity: Entity, item: ItemStack, slot: SlotData): BooleanWithMessage {
	const inventory: EntityInventoryComponent | undefined = entity.getComponent(
		EntityComponentTypes.Inventory,
	);
	if (inventory === undefined || !inventory.isValid) {
		return {
			bool: false,
			message: `Unable to get inventory of ${getSelectorName(entity)}`,
		};
	}
	return setItemInContainerSlot(entity, inventory.container, item, slot);
}

function setItemHotbar(entity: Entity, item: ItemStack, slot: SlotData): BooleanWithMessage {
	if (!(entity instanceof Player)) {
		return {
			bool: false,
			message: `Cannot access hotbar of ${getSelectorName(entity)}. Only players have a hotbar.`,
		};
	}
	if (slot.id !== undefined && (slot.id < 0 || slot.id > 8)) {
		return {
			bool: false,
			message: `Invalid hotbar slot id "${slot.id}". Must be between 0 and 8.`,
		};
	}
	return setItemInventory(entity, item, slot);
}

// Don't want to include custom tameable mobs here. My implementation was forced to be too oddly specific.
const MobChestEntityTypes: string[] = ["minecraft:llama", "minecraft:donkey", "minecraft:mule"];

// Includes SlotName.Saddle, SlotName.Armor, and SlotName.MobChest
function setItemTameable(entity: Entity, item: ItemStack, slot: SlotData): BooleanWithMessage {
	const inventory: EntityInventoryComponent | undefined = entity.getComponent(
		EntityComponentTypes.Inventory,
	);
	const isTamed: EntityIsTamedComponent | undefined = entity.getComponent(
		EntityComponentTypes.IsTamed,
	);
	if (
		inventory === undefined ||
		!inventory.isValid ||
		isTamed === undefined ||
		!isTamed.isValid
	) {
		return {
			bool: false,
			message: `Unable to get ${slot.name} from ${getSelectorName(entity)}. Only accessible on vanilla tamed entities.`,
		};
	}
	if (slot.name === SlotName.MobChest) {
		if (!MobChestEntityTypes.includes(entity.typeId)) {
			return {
				bool: false,
				message: `Unable to get ${slot.name} from ${getSelectorName(entity)}. Only accessible on vanilla tamed entities.`,
			};
		}
		if (slot.id) {
			// Account for saddle/carpet slot (slot 0);
			slot.id++;
		}
		return setItemInContainerSlot(entity, inventory.container, item, slot);
	}
	if (slot.name === SlotName.Saddle) {
		// Saddle is inventory slot 0 on tameable mobs.
		slot.id = 0;
	} else if (slot.name === SlotName.Armor) {
		// Horse Armor is inventory slot 1 on tameable mobs.
		slot.id = 1;
	}
	const result: BooleanWithMessage = setItemInContainerSlot(
		entity,
		inventory.container,
		item,
		slot,
	);
	return {
		bool: result.bool,
		message: result.bool
			? `Gave ${getSelectorName(entity)} ${item.typeId} in ${slot.name}`
			: result.message,
	};
}

function slotNameToEquipmentSlot(name: string): EquipmentSlot | undefined {
	switch (name) {
		case SlotName.Mainhand:
			return EquipmentSlot.Mainhand;
		case SlotName.Offhand:
			return EquipmentSlot.Offhand;
		case SlotName.Head:
			return EquipmentSlot.Head;
		case SlotName.Chest:
			return EquipmentSlot.Chest;
		case SlotName.Legs:
			return EquipmentSlot.Legs;
		case SlotName.Feet:
			return EquipmentSlot.Feet;
		default:
			return undefined;
	}
}

function setItemEquippable(entity: Entity, item: ItemStack, slot: SlotData): BooleanWithMessage {
	const equippable: EntityEquippableComponent | undefined = entity.getComponent(
		EntityComponentTypes.Equippable,
	);
	if (equippable === undefined) {
		return {
			bool: false,
			message: `Unable to get equippable component of ${getSelectorName(entity)}\n(Equippable component doesn't work on vanilla mobs. Blame Mojang)`,
		};
	}
	const equipmentSlot: EquipmentSlot | undefined = slotNameToEquipmentSlot(slot.name);
	if (equipmentSlot === undefined) {
		return {
			bool: false,
			message: `Unable to convert ${slot.name} to EquipmentSlot for ${getSelectorName(entity)}`,
		};
	}
	let oldItem: ItemStack | undefined;
	if (slot.keepOldItem) {
		oldItem = equippable.getEquipment(equipmentSlot);
	}
	const equippableResult: boolean = equippable.setEquipment(equipmentSlot, item);
	if (!equippableResult) {
		return {
			bool: false,
			message: `Unable to equip ${prettyTypeId(item.typeId)} in ${slot.name}`,
		};
	}
	let oldItemGiveResult: BooleanWithMessage | undefined;
	if (oldItem) {
		const inventory: EntityInventoryComponent | undefined = entity.getComponent(
			EntityComponentTypes.Inventory,
		);
		let addItemsResult: BooleanWithMessage | undefined;
		if (inventory?.isValid && inventory.container.isValid) {
			addItemsResult = addItemsToContainer(entity, inventory.container, item, item.amount);
		}
		if (inventory === undefined || (addItemsResult && !addItemsResult.bool)) {
			oldItemGiveResult = {
				bool: true,
				message: "Spawned old item as entity",
			};
			try {
				entity.dimension.spawnItem(item, entity.location);
			} catch (error) {
				let message: string = "Unable to spawn old item as entity";
				if (error instanceof Error) {
					message += `: ${error.message}`;
				}
				oldItemGiveResult.bool = false;
				oldItemGiveResult.message = message;
			}
		}
	}
	let message: string = `Equipped ${item.typeId} in slot ${slot.name}`;
	if (oldItemGiveResult && !oldItemGiveResult.bool) {
		message += `\nHowever, ${oldItemGiveResult.message}`;
	}
	return {
		bool: true,
		message: message,
	};
}

function setItemEndChest(entity: Entity, item: ItemStack, slot: SlotData): BooleanWithMessage {
	const enderInventory: EntityEnderInventoryComponent | undefined = entity.getComponent(
		EntityComponentTypes.EnderInventory,
	);
	if (
		enderInventory === undefined ||
		!enderInventory.isValid ||
		!enderInventory.container.isValid
	) {
		return {
			bool: false,
			message: `Unable to get valid ender inventory from ${getSelectorName(entity)}`,
		};
	}
	return setItemInContainerSlot(entity, enderInventory.container, item, slot);
}

export function giveItemToEntity(
	entity: Entity,
	item: ItemStack,
	amount: number,
	slot: SlotData | undefined,
): BooleanWithMessage {
	if (!entity.isValid) {
		return {
			bool: false,
			message: `Entity ${getSelectorName(entity)} is invalid (Might be unloaded)`,
		};
	}
	if (slot === undefined) {
		// Just add item to free slots in inventory
		const inventory: EntityInventoryComponent | undefined = entity.getComponent(
			EntityComponentTypes.Inventory,
		);
		if (inventory === undefined || !inventory.isValid || !inventory.container.isValid) {
			return {
				bool: false,
				message: `Unable to get ${entity.typeId} inventory`,
			};
		}
		return addItemsToContainer(entity, inventory.container, item, amount);
	}
	switch (slot.name) {
		case SlotName.Inventory:
			return setItemInventory(entity, item, slot);
		case SlotName.Hotbar:
			return setItemHotbar(entity, item, slot);
		case SlotName.Saddle:
		case SlotName.Armor:
		case SlotName.MobChest:
			return setItemTameable(entity, item, slot);
		case SlotName.Head:
		case SlotName.Chest:
		case SlotName.Legs:
		case SlotName.Feet:
		case SlotName.Mainhand:
		case SlotName.Offhand:
			return setItemEquippable(entity, item, slot);
		case SlotName.EndChest:
			return setItemEndChest(entity, item, slot);
		default:
			return {
				bool: false,
				message: `Invalid slot name "${slot.name}"`,
			};
	}
}

export function giveItemToBlock(
	block: Block,
	item: ItemStack,
	amount: number,
	slot: SlotData | undefined,
): BooleanWithMessage {
	if (!block.isValid) {
		return {
			bool: false,
			message: `Block at location ${vector3ToString(block.location, 0)} is invalid.`,
		};
	}
	const inventory: BlockInventoryComponent | undefined = block.getComponent(
		BlockComponentTypes.Inventory,
	);
	if (inventory === undefined || !inventory.isValid || inventory.container === undefined) {
		return {
			bool: false,
			message: `${prettyTypeId(block.typeId)} at location ${vector3ToString(block.location, 0)} does not have a valid inventory`,
		};
	}
	if (slot) {
		return setItemInContainerSlot(block, inventory.container, item, slot);
	} else {
		return addItemsToContainer(block, inventory.container, item, amount);
	}
}

export function spawnItemAtDimensionLocation(
	location: DimensionLocation,
	itemStack: ItemStack,
	itemAmount: number,
): BooleanWithMessage {
	try {
		itemStack.amount = itemAmount;
		location.dimension.spawnItem(itemStack, {
			x: location.x,
			y: location.y,
			z: location.z,
		});
	} catch (error) {
		let message: string = "Unable to spawn item";
		if (error instanceof Error) {
			message += `: ${error.message}`;
		}
		return {
			bool: false,
			message: message,
		};
	}
	return {
		bool: true,
		message: "",
	};
}
