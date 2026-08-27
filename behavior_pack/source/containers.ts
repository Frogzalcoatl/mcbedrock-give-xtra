import {
	type Block,
	BlockComponentTypes,
	type BlockInventoryComponent,
	type Container,
	type CustomCommandResult,
	CustomCommandStatus,
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
import { SlotName } from "./items/slot";
import { getSelectorName, prettyTypeId, vector3ToString } from "./prettyTypeId";

function addItemsToContainer(
	selector: Entity | Block,
	container: Container,
	itemStack: ItemStack,
	amountToGive: number,
): CustomCommandResult {
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
				message: message,
				status: CustomCommandStatus.Failure,
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
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		try {
			selector.dimension.spawnItem(itemStack, selector.location);
		} catch (error) {
			let message: string = `Unable to spawn ${prettyTypeId(itemStack.typeId)} on ${getSelectorName(selector)}`;
			if (error instanceof Error) {
				message += `: ${error.message}`;
			}
			return {
				message: message,
				status: CustomCommandStatus.Failure,
			};
		}
		amountLeft -= itemStack.amount;
	}
	return {
		message: `Gave ${prettyTypeId(itemStack.type.id)} * ${amountToGive} to ${getSelectorName(selector)}`,
		status: CustomCommandStatus.Success,
	};
}

function setItemInContainerSlot(
	selector: Entity | Block,
	container: Container,
	item: ItemStack,
	slot: SlotName,
	slotId: number | undefined,
	replaceMode: "keep" | "destroy",
): CustomCommandResult {
	if (slotId === undefined) {
		if (slot !== SlotName.Hotbar) {
			return addItemsToContainer(selector, container, item, item.amount);
		} else {
			let firstEmptySlot: number | undefined = container.firstEmptySlot();
			if (firstEmptySlot === undefined || firstEmptySlot > 8) {
				firstEmptySlot = 8;
			}
			slotId = firstEmptySlot;
			return setItemInContainerSlot(selector, container, item, slot, slotId, replaceMode);
		}
	}
	if (slotId < 0 || slotId >= container.size) {
		return {
			message: `slotId "${slotId}" is invalid for ${getSelectorName(selector)}. Must be between 0 and ${container.size - 1}`,
			status: CustomCommandStatus.Failure,
		};
	}
	let oldItem: ItemStack | undefined;
	if (replaceMode === "keep") {
		oldItem = container.getItem(slotId);
	}
	container.setItem(slotId, item);
	let oldItemGiveResult: CustomCommandResult | undefined;
	if (oldItem) {
		oldItemGiveResult = addItemsToContainer(selector, container, oldItem, oldItem.amount);
	}
	let message: string = `Replaced item in slot ${slotId}`;
	if (
		oldItemGiveResult !== undefined &&
		oldItemGiveResult.status === CustomCommandStatus.Failure
	) {
		message += `\nHowever, ${oldItemGiveResult.message}`;
	}
	return {
		message: message,
		status: CustomCommandStatus.Success,
	};
}

function setItemInventory(
	entity: Entity,
	item: ItemStack,
	slot: SlotName,
	slotId: number | undefined,
	replaceMode: "keep" | "destroy",
): CustomCommandResult {
	const inventory: EntityInventoryComponent | undefined = entity.getComponent(
		EntityComponentTypes.Inventory,
	);
	if (inventory === undefined) {
		return {
			message: `Unable to get inventory of ${getSelectorName(entity)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	return setItemInContainerSlot(entity, inventory.container, item, slot, slotId, replaceMode);
}

function setItemHotbar(
	entity: Entity,
	item: ItemStack,
	slot: SlotName,
	slotId: number | undefined,
	replaceMode: "keep" | "destroy",
): CustomCommandResult {
	if (!(entity instanceof Player)) {
		return {
			message: `Cannot access hotbar of ${getSelectorName(entity)}. Only players have a hotbar.`,
			status: CustomCommandStatus.Failure,
		};
	}
	if (slotId !== undefined && (slotId < 0 || slotId > 8)) {
		return {
			message: `Invalid hotbar slot id "${slotId}". Must be between 0 and 8.`,
			status: CustomCommandStatus.Failure,
		};
	}
	return setItemInventory(entity, item, slot, slotId, replaceMode);
}

// Don't want to include custom tameable mobs here. My implementation was forced to be too oddly specific.
const MobChestEntityTypes: string[] = ["minecraft:llama", "minecraft:donkey", "minecraft:mule"];

// Includes SlotName.Saddle, SlotName.Armor, and SlotName.MobChest
function setItemTameable(
	entity: Entity,
	item: ItemStack,
	slot: SlotName,
	slotId: number | undefined,
	replaceMode: "keep" | "destroy",
): CustomCommandResult {
	const inventory: EntityInventoryComponent | undefined = entity.getComponent(
		EntityComponentTypes.Inventory,
	);
	const isTamed: EntityIsTamedComponent | undefined = entity.getComponent(
		EntityComponentTypes.IsTamed,
	);
	if (inventory === undefined || isTamed === undefined) {
		return {
			message: `Unable to get ${slot} from ${getSelectorName(entity)}. Only accessible on vanilla tamed entities.`,
			status: CustomCommandStatus.Failure,
		};
	}
	if (slot === SlotName.MobChest) {
		if (!MobChestEntityTypes.includes(entity.typeId)) {
			return {
				message: `Unable to get ${slot} from ${getSelectorName(entity)}. Only accessible on vanilla tamed entities.`,
				status: CustomCommandStatus.Failure,
			};
		}
		if (slotId) {
			// Account for saddle/carpet slot (slot 0);
			slotId++;
		}
		return setItemInContainerSlot(entity, inventory.container, item, slot, slotId, replaceMode);
	}
	if (slot === SlotName.Saddle) {
		// Saddle is inventory slot 0 on tameable mobs.
		slotId = 0;
	} else if (slot === SlotName.Armor) {
		// Horse Armor is inventory slot 1 on tameable mobs.
		slotId = 1;
	}
	const result: CustomCommandResult = setItemInContainerSlot(
		entity,
		inventory.container,
		item,
		slot,
		slotId,
		replaceMode,
	);
	return {
		message:
			result.status === CustomCommandStatus.Success
				? `Gave ${getSelectorName(entity)} ${item.typeId} in ${slot}`
				: (result.message ?? ""),
		status: result.status,
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

function setItemEquippable(
	entity: Entity,
	item: ItemStack,
	slot: SlotName,
	replaceMode: "keep" | "destroy",
): CustomCommandResult {
	const equippable: EntityEquippableComponent | undefined = entity.getComponent(
		EntityComponentTypes.Equippable,
	);
	if (equippable === undefined) {
		return {
			message: `Unable to get equippable component of ${getSelectorName(entity)}\n(Equippable component doesn't work on vanilla mobs. Blame Mojang)`,
			status: CustomCommandStatus.Failure,
		};
	}
	const equipmentSlot: EquipmentSlot | undefined = slotNameToEquipmentSlot(slot);
	if (equipmentSlot === undefined) {
		return {
			message: `Unable to convert ${slot} to EquipmentSlot for ${getSelectorName(entity)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	let oldItem: ItemStack | undefined;
	if (replaceMode === "keep") {
		oldItem = equippable.getEquipment(equipmentSlot);
	}
	const equippableResult: boolean = equippable.setEquipment(equipmentSlot, item);
	if (!equippableResult) {
		return {
			message: `Unable to equip ${prettyTypeId(item.typeId)} in ${slot}`,
			status: CustomCommandStatus.Failure,
		};
	}
	let oldItemGiveResult: CustomCommandResult | undefined;
	if (oldItem) {
		const inventory: EntityInventoryComponent | undefined = entity.getComponent(
			EntityComponentTypes.Inventory,
		);
		let addItemsResult: CustomCommandResult | undefined;
		if (inventory !== undefined) {
			addItemsResult = addItemsToContainer(entity, inventory.container, item, item.amount);
		}
		if (
			inventory === undefined ||
			(addItemsResult !== undefined && addItemsResult.status === CustomCommandStatus.Failure)
		) {
			oldItemGiveResult = {
				message: "Spawned old item as entity",
				status: CustomCommandStatus.Success,
			};
			try {
				entity.dimension.spawnItem(item, entity.location);
			} catch (error) {
				let message: string = "Unable to spawn old item as entity";
				if (error instanceof Error) {
					message += `: ${error.message}`;
				}
				oldItemGiveResult.status = CustomCommandStatus.Failure;
				oldItemGiveResult.message = message;
			}
		}
	}
	let message: string = `Equipped ${item.typeId} in slot ${slot}`;
	if (
		oldItemGiveResult !== undefined &&
		oldItemGiveResult.status === CustomCommandStatus.Failure
	) {
		message += `\nHowever, ${oldItemGiveResult.message}`;
	}
	return {
		message: message,
		status: CustomCommandStatus.Success,
	};
}

function setItemEndChest(
	entity: Entity,
	item: ItemStack,
	slot: SlotName,
	slotId: number | undefined,
	replaceMode: "keep" | "destroy",
): CustomCommandResult {
	const enderInventory: EntityEnderInventoryComponent | undefined = entity.getComponent(
		EntityComponentTypes.EnderInventory,
	);
	if (enderInventory === undefined) {
		return {
			message: `Unable to get valid ender inventory from ${getSelectorName(entity)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	return setItemInContainerSlot(
		entity,
		enderInventory.container,
		item,
		slot,
		slotId,
		replaceMode,
	);
}

export function giveItemToEntity(
	entity: Entity,
	item: ItemStack,
	amount: number,
	slot: SlotName | undefined,
	slotId: number | undefined,
	replaceMode: "keep" | "destroy",
): CustomCommandResult {
	if (slot === undefined) {
		// Just add item to free slots in inventory
		const inventory: EntityInventoryComponent | undefined = entity.getComponent(
			EntityComponentTypes.Inventory,
		);
		if (inventory === undefined) {
			return {
				message: `Unable to get ${entity.typeId} inventory`,
				status: CustomCommandStatus.Failure,
			};
		}
		return addItemsToContainer(entity, inventory.container, item, amount);
	}
	switch (slot) {
		case SlotName.Inventory:
			return setItemInventory(entity, item, slot, slotId, replaceMode);
		case SlotName.Hotbar:
			return setItemHotbar(entity, item, slot, slotId, replaceMode);
		case SlotName.Saddle:
		case SlotName.Armor:
		case SlotName.MobChest:
			return setItemTameable(entity, item, slot, slotId, replaceMode);
		case SlotName.Head:
		case SlotName.Chest:
		case SlotName.Legs:
		case SlotName.Feet:
		case SlotName.Mainhand:
		case SlotName.Offhand:
			return setItemEquippable(entity, item, slot, replaceMode);
		case SlotName.EndChest:
			return setItemEndChest(entity, item, slot, slotId, replaceMode);
		default:
			return {
				message: `Invalid slot "${slot}"`,
				status: CustomCommandStatus.Failure,
			};
	}
}

export function giveItemToBlock(
	block: Block,
	item: ItemStack,
	amount: number,
	slotId: number | undefined,
	replaceMode: "keep" | "destroy",
): CustomCommandResult {
	const inventory: BlockInventoryComponent | undefined = block.getComponent(
		BlockComponentTypes.Inventory,
	);
	if (inventory === undefined || inventory.container === undefined) {
		let message: string = `${prettyTypeId(block.typeId)} at location ${vector3ToString(block.location, 0)} does not have a valid inventory`;
		if (block.typeId === "minecraft:ender_chest") {
			message += `\nTo access Ender Chest slots, use /givex:givex with slot ${SlotName.EndChest}`;
		}
		return {
			message: message,
			status: CustomCommandStatus.Failure,
		};
	}
	if (slotId !== undefined) {
		return setItemInContainerSlot(
			block,
			inventory.container,
			item,
			SlotName.Inventory,
			slotId,
			replaceMode,
		);
	} else {
		return addItemsToContainer(block, inventory.container, item, amount);
	}
}

export function spawnItemAtDimensionLocation(
	location: DimensionLocation,
	itemStack: ItemStack,
	itemAmount: number,
): CustomCommandResult {
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
			message: message,
			status: CustomCommandStatus.Failure,
		};
	}
	return {
		status: CustomCommandStatus.Success,
	};
}
