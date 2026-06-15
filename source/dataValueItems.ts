import {
	type Container,
	type Entity,
	ItemComponentTypes,
	ItemLockMode,
	type ItemStack,
	Player,
} from "@minecraft/server";
import {
	ArrowEffectSartingDataValue,
	ArrowEffectTypes,
	BedColors,
	type BooleanWithMessage,
	SlotName,
} from "./types";

export function getItemCommandDataValue(typeId: string, dataId: string | undefined): number {
	// npcs are the only spawn egg that still use data values. The rest have their own type id. Just redirect all references of the old spawn egg typeid to npc.
	if (typeId === "minecraft:spawn_egg") {
		return 51;
	}
	// The rest require a dataId: ex arrowType, bedColor
	if (dataId === undefined) {
		return 0;
	}
	if (typeId === "minecraft:arrow") {
		const arrowEffectResult: number = ArrowEffectTypes.indexOf(dataId);
		if (arrowEffectResult !== -1) {
			return arrowEffectResult + ArrowEffectSartingDataValue;
		}
	} else if (typeId === "minecraft:bed") {
		const bedColorResult = BedColors.indexOf(dataId);
		if (bedColorResult !== -1) {
			return bedColorResult;
		}
	}
	return 0;
}

// Inventory and hotbar are separated for replaceitem command, so id is handled differently than in @minecraft/server functions.
function getCommandSlotData(slotId: number): { slotName: string; id: number } {
	if (slotId <= 8) {
		return {
			id: slotId,
			slotName: SlotName.Hotbar,
		};
	} else {
		return {
			id: slotId - 9,
			slotName: SlotName.Inventory,
		};
	}
}

// Returns formatted can_destroy, item_lock, keep_on_death, and/or item_lock json for /give and /replaceitem
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
	if (item.lockMode !== ItemLockMode.none) {
		str += `"item_lock":{"mode":"`;
		if (item.lockMode === ItemLockMode.inventory) {
			str += "lock_in_inventory";
		} else {
			str += "lock_in_slot";
		}
		str += `"},`;
	}
	// Remove final comma and add closing bracket
	str = `${str.slice(0, str.length - 1)}}`;
	// Final bracket is valid syntax despite the color being off on vscode
	return str;
}

export function runReplaceItemCommand(
	entity: Entity,
	item: ItemStack,
	slotName: string,
	slotId: number,
	dataValue: number,
): boolean {
	if (slotName === SlotName.Inventory) {
		if (entity instanceof Player) {
			const result = getCommandSlotData(slotId);
			slotId = result.id;
			slotName = result.slotName;
		}
	}
	const commandResult = entity.runCommand(
		`/replaceitem entity @s ${slotName} ${slotId} ${item.typeId} ${item.amount} ${dataValue} ${getCommandJson(item)}`,
	);
	return commandResult.successCount > 0;
}

// Only returns false when it fails to copy enchants
export function copyItemStackProperties(from: ItemStack, to: ItemStack): BooleanWithMessage {
	to.lockMode = from.lockMode;
	if (from.nameTag) {
		to.nameTag = from.nameTag;
	}
	const fromDurability = from.getComponent(ItemComponentTypes.Durability);
	const toDurability = to.getComponent(ItemComponentTypes.Durability);
	if (fromDurability && toDurability) {
		toDurability.damage = fromDurability.damage;
	}
	to.keepOnDeath = from.keepOnDeath;
	to.setCanPlaceOn(from.getCanPlaceOn());
	to.setCanDestroy(from.getCanDestroy());
	const templateEnchantable = from.getComponent(ItemComponentTypes.Enchantable);
	const givenItemEnchantable = to.getComponent(ItemComponentTypes.Enchantable);
	if (templateEnchantable && givenItemEnchantable) {
		try {
			givenItemEnchantable.addEnchantments(templateEnchantable.getEnchantments());
		} catch (error) {
			if (error instanceof Error) {
				return {
					bool: false,
					message: error.message,
				};
			}
		}
	}
	return {
		bool: true,
		message: "Copied itemstack properties",
	};
}

// Returns itemStack of given item (with data value attached internally)
export function setDataValueItemInContainer(
	entity: Entity,
	container: Container,
	item: ItemStack,
	slotId: number,
	dataValue: number,
): { bool: boolean; message: string; itemStack: ItemStack | undefined } {
	const replaceItemResult = runReplaceItemCommand(
		entity,
		item,
		SlotName.Inventory,
		slotId,
		dataValue,
	);
	if (!replaceItemResult) {
		return {
			bool: false,
			itemStack: undefined,
			message: `Failed to run replaceitem on ${item.typeId} with data value ${dataValue}`,
		};
	}
	if (!container.isValid || slotId < 0 || slotId >= container.size) {
		return {
			bool: false,
			itemStack: undefined,
			message: "Invalid container or slotId",
		};
	}
	const givenItem = container.getItem(slotId);
	if (givenItem === undefined) {
		return {
			// Returning true since the item was still technically given, just doesn't have any special properties.
			bool: true,
			itemStack: undefined,
			message: `Unable to get ${item.typeId} with data value ${dataValue} given by replaceitem`,
		};
	}
	copyItemStackProperties(item, givenItem);
	container.setItem(slotId, givenItem);
	return {
		bool: true,
		itemStack: givenItem,
		message: `Gave ${givenItem.typeId} with data value ${dataValue}`,
	};
}
