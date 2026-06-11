import "@minecraft/server";
import {
	type Container,
	type Entity,
	EntityComponentTypes,
	EquipmentSlot,
	type ItemStack,
	Player,
} from "@minecraft/server";
import { prettyTypeId } from "./prettyTypeId";
import { type BooleanWithMessage, type SlotData, SlotName } from "./types";

// Cannot be used in restricted execution
export function giveItem(
	entity: Entity,
	container: Container,
	itemStack: ItemStack,
	amountToGive: number = 1,
): BooleanWithMessage {
	if (!entity.isValid || !container.isValid) {
		return {
			bool: false,
			message: `Unable to give ${prettyTypeId(itemStack.typeId)} to invalid entity`,
		};
	}
	let amountLeft: number = amountToGive;
	while (amountLeft > 0) {
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		// Returns ItemStack on failure
		const result = container.addItem(itemStack);
		// Inventory is full
		if (result !== undefined) {
			// In case a partial itemStack was given
			amountLeft -= itemStack.amount - result.amount;
			break;
		}
		amountLeft -= itemStack.amount;
	}
	const entityName = entity instanceof Player ? entity.name : prettyTypeId(entity.typeId);
	// Spawn items as entities
	while (amountLeft > 0) {
		if (!entity.isValid) {
			return {
				bool: false,
				message: `Only gave ${prettyTypeId(itemStack.type.id)} * ${amountToGive - amountLeft}/${amountToGive} to ${entityName}§r. Unable to spawn items on invalid entity.`,
			};
		}
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		entity.dimension.spawnItem(itemStack, entity.location);
		amountLeft -= itemStack.amount;
	}
	return {
		bool: true,
		message: `Gave ${prettyTypeId(itemStack.type.id)} * ${amountToGive} to ${entityName}`,
	};
}

function firstEmptySlotWithinRange(
	container: Container,
	min: number,
	max: number,
): number | undefined {
	if (
		min < 0 ||
		min >= container.size ||
		max < min ||
		max >= container.size ||
		!container.isValid
	) {
		return undefined;
	}
	for (let i = min; i < max; i++) {
		const slot = container.getSlot(i);
		if (!slot.hasItem()) {
			return i;
		}
	}
	return undefined;
}

// Cannot be used in restricted execution
function setItemInContainer(
	entity: Entity,
	container: Container,
	item: ItemStack,
	slotId: number | undefined,
	destroyOldItem: boolean,
	manualMinSlotId?: number,
	manualMaxSlotId?: number,
): BooleanWithMessage {
	if (!container.isValid) {
		return {
			bool: false,
			message: `${entity.typeId} container is invalid`,
		};
	}
	const minSlotId = manualMinSlotId ?? 0;
	const maxSlotId = manualMaxSlotId ?? container.size - 1;
	if (slotId === undefined) {
		const firstEmptySlot: number | undefined = firstEmptySlotWithinRange(
			container,
			minSlotId,
			maxSlotId,
		);
		if (firstEmptySlot !== undefined) {
			slotId = firstEmptySlot;
		} else {
			return {
				bool: false,
				message: `Unable to find valid slot id in ${entity.typeId} within range ${minSlotId}-${maxSlotId}`,
			};
		}
	}
	let oldItem: ItemStack | undefined;
	if (!destroyOldItem) {
		oldItem = container.getItem(slotId);
	}
	container.setItem(slotId, item);
	let oldItemGiveResult: BooleanWithMessage | undefined;
	if (oldItem) {
		oldItemGiveResult = giveItem(entity, container, oldItem, oldItem.amount);
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

function replaceItemInventory(entity: Entity, item: ItemStack, slot: SlotData): BooleanWithMessage {
	const inventory = entity.getComponent(EntityComponentTypes.Inventory);
	if (inventory === undefined || !inventory.isValid) {
		return {
			bool: false,
			message: `Unable to get inventory of ${entity.typeId}`,
		};
	}
	return setItemInContainer(entity, inventory.container, item, slot.id, slot.replaceItem ?? true);
}

function replaceItemHotbar(entity: Entity, item: ItemStack, slot: SlotData): BooleanWithMessage {
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
	const minHotbarId: number = 0;
	const maxHotbarId: number = 8;
	return setItemInContainer(
		entity,
		inventory.container,
		item,
		slot.id,
		slot.replaceItem ?? true,
		minHotbarId,
		maxHotbarId,
	);
}

const MobChestEntityTypes: string[] = ["minecraft:llama", "minecraft:donkey", "minecraft:mule"];

// Includes SlotName.Saddle, SlotName.Armor, and SlotName.MobChest
// Don't want to include custom tameable mobs here. My implementation was forced to be too oddly specific.
function replaceItemTameable(entity: Entity, item: ItemStack, slot: SlotData): BooleanWithMessage {
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
			message: `Unable to get ${slot.name} from ${entity.typeId}. Only accessible on tamed entities.`,
		};
	}
	if (slot.name === SlotName.MobChest) {
		if (!MobChestEntityTypes.includes(entity.typeId)) {
			return {
				bool: false,
				message: `Unable to get ${slot.name} from ${entity.typeId}`,
			};
		}
		if (slot.id) {
			// Account for saddle/carpet slot (slot 0);
			slot.id++;
		}
		const minSlotId: number = 1;
		return setItemInContainer(
			entity,
			inventory.container,
			item,
			slot.id,
			slot.replaceItem ?? true,
			minSlotId,
		);
	}
	if (slot.name === SlotName.Saddle) {
		// Saddle is inventory slot 0 on tameable mobs.
		slot.id = 0;
	} else if (slot.name === SlotName.Armor) {
		// Horse Armor is inventory slot 1 on tameable mobs.
		slot.id = 1;
	}
	const result = setItemInContainer(
		entity,
		inventory.container,
		item,
		slot.id,
		slot.replaceItem ?? true,
		slot.id,
		slot.id,
	);
	return {
		bool: result.bool,
		message: result.bool
			? `Gave ${entity.typeId}§r ${item.typeId}§r in ${slot.name}`
			: result.message,
	};
}

// Returns formatted minecraft:can_destroy, minecraft:item_lock, and/or minecraft:keep_on_death
function getCommandJson(item: ItemStack): string {
	const canPlaceOn = item.getCanPlaceOn();
	const canDestroy = item.getCanDestroy();
	if (!item.keepOnDeath && canPlaceOn.length === 0 && canDestroy.length === 0) {
		return "";
	}
	let str: string = "{";
	if (item.keepOnDeath) {
		// For some reason its an empty object instead of a boolean.
		str += '"keep_on_death":{},';
	}
	if (canPlaceOn.length > 0) {
		str += '"can_place_on":{"blocks":[';
		for (const block of canPlaceOn) {
			str += `"${block}",`;
		}
		// Remove final comma and add closing brackets
		str = `${str.slice(0, str.length - 1)}]},`;
	}
	if (canDestroy.length > 0) {
		str += '"can_destroy":{"blocks":[';
		for (const block of canDestroy) {
			str += `"${block}",`;
		}
		// Remove final comma and add closing brackets
		str = `${str.slice(0, str.length - 1)}]},`;
	}
	// Remove final comma and add closing bracket
	str = `${str.slice(0, str.length - 1)}}`;
	// Final bracket is valid syntax despite the color being off on vscode
	return str;
}

function replaceItemEquippable(
	entity: Entity,
	item: ItemStack,
	slot: SlotData,
): BooleanWithMessage {
	const equippable = entity.getComponent(EntityComponentTypes.Equippable);
	if (equippable === undefined) {
		entity.runCommand(
			`/replaceitem entity @s ${slot.name} ${slot.id ?? 0} ${item.typeId} ${item.amount} 0 ${getCommandJson(item)}`,
		);
		return {
			bool: false,
			message: `Ran replaceitem command on ${entity.typeId} for ${item.typeId}. Any special properties were omitted.\n(Equippable doesn't work on mobs. Blame Mojang)`,
		};
	}
	const equipmentSlot: EquipmentSlot | undefined = slotNameToEquipmentSlot(slot.name);
	if (equipmentSlot === undefined) {
		return {
			bool: false,
			message: `Unable to convert ${slot.name} to EquipmentSlot`,
		};
	}
	let oldItem: ItemStack | undefined;
	// use === false to avoid running on undefined
	if (slot.replaceItem === false) {
		oldItem = equippable.getEquipment(equipmentSlot);
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
		} else {
			oldItemGiveResult = giveItem(entity, inventory.container, item, item.amount);
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
export function replaceItem(entity: Entity, item: ItemStack, slot: SlotData): BooleanWithMessage {
	if (!entity.isValid) {
		return {
			bool: false,
			message: `Entity ${entity.typeId} is invalid (Might be unloaded)`,
		};
	}
	switch (slot.name) {
		case SlotName.Inventory:
			return replaceItemInventory(entity, item, slot);
		case SlotName.Hotbar:
			return replaceItemHotbar(entity, item, slot);
		case SlotName.Saddle:
		case SlotName.Armor:
		case SlotName.MobChest:
			return replaceItemTameable(entity, item, slot);
		case SlotName.Head:
		case SlotName.Chest:
		case SlotName.Legs:
		case SlotName.Feet:
		case SlotName.Mainhand:
		case SlotName.Offhand:
			return replaceItemEquippable(entity, item, slot);
	}
}
