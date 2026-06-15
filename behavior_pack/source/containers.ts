import {
	type Block,
	BlockComponentTypes,
	type Container,
	type Entity,
	EntityComponentTypes,
	EquipmentSlot,
	type ItemStack,
	Player,
} from "@minecraft/server";
import {
	copyItemStackProperties,
	runReplaceItemCommand,
	setDataValueItemInContainer as setDataValueItemInSlot,
} from "./dataValueItems";
import { getRecieverName, prettyTypeId, vector3ToString } from "./prettyTypeId";
import { type BooleanWithMessage, type SlotData, SlotName } from "./types";

// Cannot be used in restricted execution
function addItemsToContainer(
	reciever: Entity | Block,
	container: Container,
	itemStack: ItemStack,
	amountToGive: number,
	dataValue: number,
): BooleanWithMessage {
	if (!reciever.isValid || !container.isValid) {
		return {
			bool: false,
			message: `Unable to give ${prettyTypeId(itemStack.typeId)} to invalid reciever`,
		};
	}
	if (dataValue !== 0) {
		const slotForItem = container.firstEmptySlot();
		if (slotForItem === undefined) {
			return {
				bool: false,
				message: `Unable to give ${itemStack} with data value ${dataValue}. Container is full and no way to spawn data value item as entity.`,
			};
		}
		// Just giving 1 with /replaceitem to get the itemstack
		itemStack.amount = 1;
		const result = setDataValueItemInSlot(
			reciever,
			container,
			itemStack,
			slotForItem,
			dataValue,
		);
		if (!result.bool) {
			return {
				bool: false,
				message: result.message,
			};
		}
		if (result.itemStack === undefined) {
			return {
				bool: false,
				message: `Gave ${prettyTypeId(itemStack.typeId)} * 1 to ${getRecieverName(reciever)} but was unable to apply custom properties, so did not give the rest.`,
			};
		}
		itemStack = result.itemStack; // This itemstack now has the data value attached internally.
		amountToGive--; // Since one item was given using the function above.
	}
	let amountLeft: number = amountToGive;
	while (amountLeft > 0) {
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		// Returns ItemStack on failure
		let result: ItemStack | undefined;
		try {
			result = container.addItem(itemStack);
		} catch (error) {
			if (error instanceof Error) {
				return {
					bool: false,
					message: error.message,
				};
			} else {
				return {
					bool: false,
					message: `Unknown error occured while trying to add ${prettyTypeId(itemStack.typeId)} to container of ${getRecieverName(reciever)}`,
				};
			}
		}
		// Inventory is full
		if (result !== undefined) {
			// In case a partial itemStack was given
			amountLeft -= itemStack.amount - result.amount;
			break;
		}
		amountLeft -= itemStack.amount;
	}
	// Spawn items as entities
	while (amountLeft > 0) {
		if (!reciever.isValid) {
			return {
				bool: false,
				message: `Only gave ${prettyTypeId(itemStack.type.id)} * ${amountToGive - amountLeft}/${amountToGive} to ${getRecieverName(reciever)}. Unable to spawn items on invalid reciever.`,
			};
		}
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		try {
			reciever.dimension.spawnItem(itemStack, reciever.location);
		} catch (error) {
			if (error instanceof Error) {
				return {
					bool: false,
					message: error.message,
				};
			} else {
				return {
					bool: false,
					message: `Unknown error occured while trying to spawn ${prettyTypeId(itemStack.typeId)} on ${getRecieverName(reciever)}`,
				};
			}
		}
		amountLeft -= itemStack.amount;
	}
	return {
		bool: true,
		message: `Gave ${prettyTypeId(itemStack.type.id)} * ${amountToGive} to ${getRecieverName(reciever)}`,
	};
}

// Cannot be used in restricted execution
function setItemInSlot(
	reciever: Entity | Block,
	container: Container,
	item: ItemStack,
	slotId: number,
	keepOldItem: boolean,
	dataValue: number,
): BooleanWithMessage {
	if (!container.isValid) {
		return {
			bool: false,
			message: `${getRecieverName(reciever)} container is invalid`,
		};
	}
	if (slotId < 0 || slotId >= container.size) {
		return {
			bool: false,
			message: `slotId "${slotId}" is invalid for ${getRecieverName(reciever)}. Must be between 0 and ${container.size - 1}`,
		};
	}
	let oldItem: ItemStack | undefined;
	if (keepOldItem) {
		oldItem = container.getItem(slotId);
	}
	if (dataValue === 0) {
		container.setItem(slotId, item);
	} else {
		const dataValueItemResult = setDataValueItemInSlot(
			reciever,
			container,
			item,
			slotId,
			dataValue,
		);
		if (!dataValueItemResult.bool) {
			return {
				bool: false,
				message: dataValueItemResult.message,
			};
		}
	}
	let oldItemGiveResult: BooleanWithMessage | undefined;
	if (oldItem) {
		oldItemGiveResult = addItemsToContainer(reciever, container, oldItem, oldItem.amount, 0);
	}
	let message: string = `Replaced item in slot ${slotId}`;
	if (oldItemGiveResult && !oldItemGiveResult.bool) {
		message += `\nHowever, ${oldItemGiveResult.message}`;
	}
	return {
		bool: true,
		message: message,
	};
}

function replaceItemInventory(
	entity: Entity,
	item: ItemStack,
	slot: SlotData,
	itemDataValue: number,
): BooleanWithMessage {
	const inventory = entity.getComponent(EntityComponentTypes.Inventory);
	if (inventory === undefined || !inventory.isValid) {
		return {
			bool: false,
			message: `Unable to get inventory of ${getRecieverName(entity)}`,
		};
	}
	return setItemInSlot(
		entity,
		inventory.container,
		item,
		slot.id,
		slot.keepOldItem,
		itemDataValue,
	);
}

function replaceItemHotbar(
	entity: Entity,
	item: ItemStack,
	slot: SlotData,
	itemDataValue: number,
): BooleanWithMessage {
	if (!(entity instanceof Player)) {
		return {
			bool: false,
			message: "Only players have a hotbar",
		};
	}
	const inventory = entity.getComponent(EntityComponentTypes.Inventory);
	if (inventory === undefined || !inventory.isValid) {
		return {
			bool: false,
			message: `Unable to get inventory of ${entity.name}`,
		};
	}
	if (slot.id < 0 || slot.id > 8) {
		return {
			bool: false,
			message: `Invalid hotbar slot id "${slot.id}". Must be between 0 and 8`,
		};
	}
	return setItemInSlot(
		entity,
		inventory.container,
		item,
		slot.id,
		slot.keepOldItem,
		itemDataValue,
	);
}

const MobChestEntityTypes: string[] = ["minecraft:llama", "minecraft:donkey", "minecraft:mule"];

// Includes SlotName.Saddle, SlotName.Armor, and SlotName.MobChest
// Don't want to include custom tameable mobs here. My implementation was forced to be too oddly specific.
function replaceItemTameable(
	entity: Entity,
	item: ItemStack,
	slot: SlotData,
	itemDataValue: number,
): BooleanWithMessage {
	const inventory = entity.getComponent(EntityComponentTypes.Inventory);
	const isTamed = entity.getComponent(EntityComponentTypes.IsTamed);
	if (
		inventory === undefined ||
		!inventory.isValid ||
		isTamed === undefined ||
		!isTamed.isValid
	) {
		return {
			bool: false,
			message: `Unable to get ${slot.name} from ${getRecieverName(entity)}.`,
		};
	}
	if (slot.name === SlotName.MobChest) {
		if (!MobChestEntityTypes.includes(entity.typeId)) {
			return {
				bool: false,
				message: `Unable to get ${slot.name} from ${getRecieverName(entity)}. Only accessible on vanilla tamed entities.`,
			};
		}
		if (slot.id) {
			// Account for saddle/carpet slot (slot 0);
			slot.id++;
		}
		return setItemInSlot(
			entity,
			inventory.container,
			item,
			slot.id,
			slot.keepOldItem,
			itemDataValue,
		);
	}
	if (slot.name === SlotName.Saddle) {
		// Saddle is inventory slot 0 on tameable mobs.
		slot.id = 0;
	} else if (slot.name === SlotName.Armor) {
		// Horse Armor is inventory slot 1 on tameable mobs.
		slot.id = 1;
	}
	const result = setItemInSlot(
		entity,
		inventory.container,
		item,
		slot.id,
		slot.keepOldItem,
		itemDataValue,
	);
	return {
		bool: result.bool,
		message: result.bool
			? `Gave ${getRecieverName(entity)} ${item.typeId} in ${slot.name}`
			: result.message,
	};
}

function slotNameToEquipmentSlot(name: SlotName): EquipmentSlot | undefined {
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

function replaceItemEquippable(
	entity: Entity,
	item: ItemStack,
	slot: SlotData,
	itemDataValue: number,
): BooleanWithMessage {
	const equippable = entity.getComponent(EntityComponentTypes.Equippable);
	if (equippable === undefined) {
		runReplaceItemCommand(entity, item, slot.name, slot.id, itemDataValue);
		return {
			bool: false,
			message: `Ran replaceitem command on ${getRecieverName(entity)} for ${item.typeId} in ${slot.name}. Special properties were omitted.\n(Equippable component doesn't work on mobs. Blame Mojang)`,
		};
	}
	const equipmentSlot: EquipmentSlot | undefined = slotNameToEquipmentSlot(slot.name);
	if (equipmentSlot === undefined) {
		return {
			bool: false,
			message: `Unable to convert ${slot.name} to EquipmentSlot for ${getRecieverName(entity)}`,
		};
	}
	let oldItem: ItemStack | undefined;
	if (slot.keepOldItem) {
		oldItem = equippable.getEquipment(equipmentSlot);
	}
	if (itemDataValue !== 0) {
		const replaceItemResult: boolean = runReplaceItemCommand(
			entity,
			item,
			slot.name,
			slot.id,
			itemDataValue,
		);
		if (!replaceItemResult) {
			return {
				bool: false,
				message: `Unable to run replaceitem command for ${item.typeId} with data value ${itemDataValue} for ${getRecieverName(entity)}`,
			};
		}
		const itemStackInSlot = equippable.getEquipment(equipmentSlot);
		if (itemStackInSlot !== undefined) {
			copyItemStackProperties(item, itemStackInSlot);
			// itemStack now has special properties and data value internally
			item = itemStackInSlot;
		}
	}
	const equippableResult: boolean = equippable.setEquipment(equipmentSlot, item);
	if (!equippableResult) {
		return {
			bool: false,
			message: `Unable to equip ${item.typeId} in ${slot.name}`,
		};
	}
	let oldItemGiveResult: BooleanWithMessage | undefined;
	if (oldItem) {
		const inventory = entity.getComponent(EntityComponentTypes.Inventory);
		if (inventory === undefined) {
			const itemEntity = entity.dimension.spawnItem(item, entity.location);
			oldItemGiveResult = {
				bool: itemEntity.isValid,
				message: itemEntity.isValid
					? "Spawned old item as entity"
					: "Unable to spawn old item as entity",
			};
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

// Cannot be used in restricted execution
export function giveItemToEntity(
	entity: Entity,
	item: ItemStack,
	amount: number,
	slot: SlotData | undefined,
	itemDataValue: number,
): BooleanWithMessage {
	if (!entity.isValid) {
		return {
			bool: false,
			message: `Entity ${getRecieverName(entity)} is invalid (Might be unloaded)`,
		};
	}
	// Just give item to free slots in inventory
	if (slot === undefined) {
		const inventory = entity.getComponent(EntityComponentTypes.Inventory);
		if (inventory === undefined || !inventory.isValid) {
			return {
				bool: false,
				message: `Unable to get ${entity.typeId} inventory`,
			};
		}
		return addItemsToContainer(entity, inventory.container, item, amount, itemDataValue);
	}
	switch (slot.name) {
		case SlotName.Inventory:
			return replaceItemInventory(entity, item, slot, itemDataValue);
		case SlotName.Hotbar:
			return replaceItemHotbar(entity, item, slot, itemDataValue);
		case SlotName.Saddle:
		case SlotName.Armor:
		case SlotName.MobChest:
			return replaceItemTameable(entity, item, slot, itemDataValue);
		case SlotName.Head:
		case SlotName.Chest:
		case SlotName.Legs:
		case SlotName.Feet:
		case SlotName.Mainhand:
		case SlotName.Offhand:
			return replaceItemEquippable(entity, item, slot, itemDataValue);
	}
}

export function giveItemToBlock(
	block: Block,
	item: ItemStack,
	amount: number,
	slot: SlotData | undefined,
	itemDataValue: number,
): BooleanWithMessage {
	if (!block.isValid) {
		return {
			bool: false,
			message: `Block at location ${vector3ToString(block.location, 0)} is invalid.`,
		};
	}
	const inventory = block.getComponent(BlockComponentTypes.Inventory);
	if (inventory === undefined || !inventory.isValid || inventory.container === undefined) {
		return {
			bool: false,
			message: `${prettyTypeId(block.typeId)} at location ${vector3ToString(block.location, 0)} does not have a valid inventory`,
		};
	}
	if (slot) {
		return setItemInSlot(
			block,
			inventory.container,
			item,
			slot.id,
			slot.keepOldItem,
			itemDataValue,
		);
	} else {
		return addItemsToContainer(block, inventory.container, item, amount, itemDataValue);
	}
}
