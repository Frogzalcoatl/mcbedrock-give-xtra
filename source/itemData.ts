import {
	EnchantmentSlot,
	EnchantmentTypes,
	EquipmentSlot,
	ItemComponentTypes,
	ItemLockMode,
	ItemStack,
	ItemTypes,
	type RGB,
} from "@minecraft/server";
import type { BooleanWithMessage } from "./types";

const ENCHANT_DATA_KEY_COUNT: number = 2;
interface EnchantData {
	id: string;
	level: number;
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isEnchantData(obj: any): obj is EnchantData {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	return (
		typeof obj.id === "string" &&
		typeof obj.level === "number" &&
		Object.keys(obj).length === ENCHANT_DATA_KEY_COUNT
	);
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isEnchantDataArr(arr: any): arr is EnchantData[] {
	if (typeof arr !== "object" || arr === null || !Array.isArray(arr)) {
		return false;
	}
	for (const value of arr) {
		if (!isEnchantData(value)) {
			return false;
		}
	}
	return true;
}

const SLOT_DATA_MAX_KEY_COUNT: number = 3;
const SLOT_DATA_MIN_KEY_COUNT: number = 1;
interface SlotData {
	name: EquipmentSlot;
	id?: number;
	replaceItem?: boolean;
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isSlotData(obj: any): obj is SlotData {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	const keyCount: number = Object.keys(obj).length;
	return (
		Object.values(EquipmentSlot).includes(obj.name) &&
		(obj.id === undefined || typeof obj.id === "number") &&
		(obj.replaceItem === undefined || typeof obj.replaceItem === "boolean") &&
		keyCount <= SLOT_DATA_MAX_KEY_COUNT &&
		keyCount >= SLOT_DATA_MIN_KEY_COUNT
	);
}

const ITEM_DATA_MAX_KEY_COUNT: number = 8; // 9 once potionType is added
const ITEM_DATA_MIN_KEY_COUNT: number = 2;
interface ItemData {
	typeId: string;
	amount: number;
	lockMode?: ItemLockMode;
	nameTag?: string;
	// Must be less than the items max durability. Infinity results in infinite durability.
	durability?: number;
	dye?: RGB;
	// potionType: Figure out later;
	enchants?: EnchantData[];
	slot?: SlotData;
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isRgb(obj: any): obj is RGB {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	return (
		typeof obj.red === "number" &&
		obj.red >= 0 &&
		obj.red <= 1 &&
		typeof obj.green === "number" &&
		obj.green >= 0 &&
		obj.green <= 1 &&
		typeof obj.blue === "number" &&
		obj.blue >= 0 &&
		obj.blue <= 1 &&
		Object.keys(obj).length === 3
	);
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isItemData(obj: any): obj is ItemData {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	const keyCount: number = Object.keys(obj).length;
	return (
		typeof obj.typeId === "string" &&
		typeof obj.amount === "number" &&
		(obj.lockMode === undefined || Object.values(ItemLockMode).includes(obj.lockMode)) &&
		(obj.nameTag === undefined || typeof obj.nameTag === "string") &&
		(obj.durability === undefined || typeof obj.nameTag === "number") &&
		(obj.dye === undefined || isRgb(obj.dye)) &&
		(obj.enchants === undefined || isEnchantDataArr(obj.enchants)) &&
		(obj.slot === undefined || isSlotData(obj.slot)) &&
		keyCount <= ITEM_DATA_MAX_KEY_COUNT &&
		keyCount >= ITEM_DATA_MIN_KEY_COUNT
	);
}

export function parseItemData(str: string): ItemData | undefined {
	const parsedData = JSON.parse(str);
	if (typeof parsedData !== "object" || parsedData === null) {
		return undefined;
	}
	if (isItemData(parsedData)) {
		return parsedData;
	} else {
		return undefined;
	}
}

/* Decided to not use this and just trust the user to know what can go in the offhand. No way to account for custom offhand items.
const OFFHAND_ITEM_TYPES: string[] = [
	"minecraft:shield",
	"minecraft:totem_of_undying",
	"minecraft:arrow",
	"minecraft:tipped_arrow",
	"minecraft:firework_rocket",
	"minecraft:empty_map",
	"minecraft:filled_map",
	"minecraft:nautilus_shell",
	"minecraft:sparkler",
];
*/

// Works with custom items given they've set up enchants properly.
function canEquipInSlot(itemStack: ItemStack, targetSlot: EquipmentSlot): boolean {
	const enchantable = itemStack.getComponent(ItemComponentTypes.Enchantable);
	if (!enchantable) {
		return false;
	}
	const slots = enchantable.slots;
	switch (targetSlot) {
		case EquipmentSlot.Head:
			return (
				slots.includes(EnchantmentSlot.ArmorHead) ||
				slots.includes(EnchantmentSlot.CosmeticHead)
			);
		case EquipmentSlot.Chest:
			return (
				slots.includes(EnchantmentSlot.ArmorTorso) || slots.includes(EnchantmentSlot.Elytra)
			);
		case EquipmentSlot.Legs:
			return slots.includes(EnchantmentSlot.ArmorLegs);
		case EquipmentSlot.Feet:
			return slots.includes(EnchantmentSlot.ArmorFeet);
		case EquipmentSlot.Mainhand:
			return true;
		case EquipmentSlot.Offhand:
			// Just trusting the user here. No good way to check for this with custom items.
			return true;
		default:
			return false;
	}
}

// biome-ignore assist/source/useSortedKeys: Want to keep it in the same order as the interface above.
export const ITEM_DATA_VALIDATION = {
	typeId(value: string): BooleanWithMessage {
		const result: boolean = ItemTypes.get(value) !== undefined;
		return {
			bool: result,
			message: result ? "Valid" : "Invalid",
		};
	},
	amount(value: number): BooleanWithMessage {
		const result: boolean = value > 0 || Number.isInteger(value);
		return {
			bool: result,
			message: result ? "Valid" : "Invalid amount, must be a positve integer",
		};
	},
	lockMode(value: ItemLockMode): BooleanWithMessage {
		const result: boolean = Object.values(ItemLockMode).includes(value);
		return {
			bool: result,
			message: result ? "Valid" : "Invalid lock mode",
		};
	},
	// Skipping data.nametag. A string is a string nothing to check there.
	durability(durability: number, itemStack: ItemStack): BooleanWithMessage {
		const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
		if (durabilityComponent === undefined) {
			return {
				bool: false,
				message: "Cannot apply durability to selected item",
			};
		}
		if ((!Number.isInteger(durability) || durability <= 0) && durability !== Infinity) {
			// Infinity represents unbreakable items.
			return {
				bool: false,
				message: "Durability must be a positive integer or Infinity",
			};
		}
		if (durabilityComponent.maxDurability < durability && durability !== Infinity) {
			return {
				bool: false,
				message: `Durability cannot exceed max for this item (${durabilityComponent.maxDurability})`,
			};
		}
		return {
			bool: true,
			message: "Valid",
		};
	},
	dye(value: RGB): BooleanWithMessage {
		const result: boolean =
			value.red < 0 ||
			value.red > 1 ||
			value.green < 0 ||
			value.green > 1 ||
			value.blue < 0 ||
			value.blue > 1;
		return {
			bool: result,
			message: result
				? "Valid"
				: `Dye must include three values between 0 and 1.\nEx: "dye":{"red":0,"blue":1,"green":0.5}`,
		};
	},
	enchants(value: EnchantData[], itemStack: ItemStack): BooleanWithMessage {
		const enchantableComonent = itemStack.getComponent(ItemComponentTypes.Enchantable);
		if (enchantableComonent === undefined) {
			return {
				bool: false,
				message: "Cannot apply enchants to selected item",
			};
		}
		for (const enchant of value) {
			const type = EnchantmentTypes.get(enchant.id);
			if (type === undefined) {
				return {
					bool: false,
					message: `Invalid enchantment id ${enchant.id}`,
				};
			}
			if (enchant.level <= 0 || enchant.level > type.maxLevel) {
				return {
					bool: false,
					message: `Invalid enchantment level for ${enchant.id}. Max level is ${type.maxLevel}`,
				};
			}
			if (!enchantableComonent.canAddEnchantment({ level: enchant.level, type: type })) {
				return {
					bool: false,
					message: `${enchant.id} cannot be applied to ${itemStack.typeId}`,
				};
			}
		}
		return {
			bool: true,
			message: "Valid",
		};
	},
	slot(value: SlotData, itemStack: ItemStack): BooleanWithMessage {
		if (!canEquipInSlot(itemStack, value.name)) {
			return {
				bool: false,
				message: `${itemStack.typeId} cannot be placed in ${value.name}`,
			};
		}
		// Not checking for a max slot id. Can use givex on non players, so max id varies.
		if (value.id && (!Number.isInteger(value.id) || value.id < 0)) {
			return {
				bool: false,
				message: `Slot id must be an integer between 0 and 35`,
			};
		}
		// data.slot.replaceItem is a boolean. Nothing to check there.
		return {
			bool: true,
			message: "Valid",
		};
	},
	full(data: ItemData): BooleanWithMessage {
		let result: BooleanWithMessage;
		result = ITEM_DATA_VALIDATION.typeId(data.typeId);
		if (!result.bool) {
			return result;
		}
		result = ITEM_DATA_VALIDATION.amount(data.amount);
		if (!result.bool) {
			return result;
		}
		if (data.lockMode) {
			result = ITEM_DATA_VALIDATION.lockMode(data.lockMode);
			if (!result.bool) {
				return result;
			}
		}
		const itemStack = new ItemStack(data.typeId);
		if (data.durability) {
			result = ITEM_DATA_VALIDATION.durability(data.durability, itemStack);
			if (!result.bool) {
				return result;
			}
		}
		if (data.dye) {
			result = ITEM_DATA_VALIDATION.dye(data.dye);
			if (!result.bool) {
				return result;
			}
		}
		if (data.enchants) {
			result = ITEM_DATA_VALIDATION.enchants(data.enchants, itemStack);
			if (!result.bool) {
				return result;
			}
		}
		if (data.slot) {
			result = ITEM_DATA_VALIDATION.slot(data.slot, itemStack);
			if (!result.bool) {
				return result;
			}
		}
		return {
			bool: true,
			message: "Valid",
		};
	},
};
