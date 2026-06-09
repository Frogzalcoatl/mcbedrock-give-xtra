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
import {
	type BooleanWithMessage,
	ENCHANT_DATA_KEY_COUNT,
	type EnchantData,
	ITEM_DATA_KEY_COUNT_MAX,
	ITEM_DATA_KEY_COUNT_MIN,
	type ItemData,
	ItemDataKeysForErrorMessage,
	type ItemDurability,
	SLOT_DATA_KEY_COUNT_MAX,
	SLOT_DATA_KEY_COUNT_MIN,
	type SlotData,
	SlotDataKeysForErrorMessage,
} from "./types";

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

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isSlotData(obj: any): obj is SlotData {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	if (!Object.values(EquipmentSlot).includes(obj.name)) {
		throw new Error("Invalid slot.name value");
	}
	let validKeysFound = 1;
	if (obj.id) {
		validKeysFound++;
		if (typeof obj.id !== "number") {
			throw new Error("slot.id must be a number");
		}
	}
	if (obj.replaceItem) {
		validKeysFound++;
		if (typeof obj.replaceItem !== "boolean") {
			throw new Error("slot.replaceItem must be a boolean");
		}
	}
	const keyCount: number = Object.keys(obj).length;
	if (keyCount <= SLOT_DATA_KEY_COUNT_MAX && keyCount >= SLOT_DATA_KEY_COUNT_MIN) {
		throw new Error("Invalid key count");
	}
	if (validKeysFound !== keyCount) {
		throw new Error(
			`Invalid slot key${keyCount - validKeysFound !== 1 ? "s" : ""} found. Valid keys include:\n${Object.values(SlotDataKeysForErrorMessage).join(", ")}`,
		);
	}
	return true;
}

/* Will add back once mojang fixes dyeable component (Bug tracker MCPE-237577 and MCPE-232617)

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isRgb(obj: any): obj is RGB {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	// Stopped checking whether values fall between expected range 0-1 since that is checked in the validateItemData functions.
	return (
		typeof obj.red === "number" &&
		typeof obj.green === "number" &&
		typeof obj.blue === "number" &&
		Object.keys(obj).length === 3
	);
}
*/

// Throwing errors since theres no way to return obj is ItemData with a string as far as i can tell.
// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isItemData(obj: any): obj is ItemData {
	if (typeof obj !== "object" || obj === null) {
		throw new Error("itemData should be an Object");
	}
	// Required keys
	if (typeof obj.typeId !== "string") {
		throw new Error("typeId must be a string");
	}
	if (typeof obj.amount !== "number") {
		throw new Error("amount must be a number");
	}
	let validKeysFound: number = 2;
	// Optional keys
	if (obj.lockMode !== undefined) {
		validKeysFound++;
		if (!Object.values(ItemLockMode).includes(obj.lockMode)) {
			throw new Error(
				`lockMode must be one of the following: ${Object.values(ItemLockMode)}`,
			);
		}
	}
	if (obj.nameTag !== undefined) {
		validKeysFound++;
		if (typeof obj.nameTag !== "string") {
			throw new Error("nameTag must be a string");
		}
	}
	if (obj.durability !== undefined) {
		validKeysFound++;
		if (
			typeof obj.durability !== "number" &&
			(typeof obj.durability !== "string" || obj.durability !== "unbreakable")
		) {
			throw new Error('Durability must be a number or the string "unbreakable"');
		}
	}
	/* Will add back once mojang fixes dyeable component (Bug tracker MCPE-237577 and MCPE-232617)
	if (obj.dye !== undefined) {
		validKeysFound++;
		if (!isRgb(obj.dye)) {
			throw new Error(
				"dye must be an object with the properties red, green, and blue containing numbers",
			);
		}
	}
	*/
	if (obj.enchants !== undefined) {
		validKeysFound++;
		if (!isEnchantDataArr(obj.enchants)) {
			throw new Error("enchants must be an array of EnchantData");
		}
	}
	if (obj.slot !== undefined) {
		validKeysFound++;
		if (!isSlotData(obj.slot)) {
			throw new Error(
				"slot must be an object containing name, and optionally id and replaceItem",
			);
		}
	}
	const keyCount: number = Object.keys(obj).length;
	if (keyCount >= ITEM_DATA_KEY_COUNT_MAX && keyCount <= ITEM_DATA_KEY_COUNT_MIN) {
		throw new Error("Invalid key count");
	}
	if (keyCount !== validKeysFound) {
		throw new Error(
			`Invalid key${keyCount - validKeysFound !== 1 ? "s" : ""} found. Valid keys include:\n${Object.values(ItemDataKeysForErrorMessage).join(", ")}`,
		);
	}
	return true;
}

export function parseItemData(str: string): {
	itemData: ItemData | undefined;
	syntaxError: string | undefined;
} {
	// biome-ignore lint/suspicious/noExplicitAny: any is required here for JSON.parse. Type will be assigned later.
	let parsedData: any;
	try {
		parsedData = JSON.parse(str);
	} catch (e) {
		if (e instanceof SyntaxError) {
			return {
				itemData: undefined,
				syntaxError: e.message,
			};
		} else {
			return {
				itemData: undefined,
				syntaxError: `Unknown error occurred`,
			};
		}
	}
	try {
		if (isItemData(parsedData)) {
			return {
				itemData: parsedData,
				syntaxError: undefined,
			};
		}
	} catch (e) {
		if (e instanceof Error) {
			return {
				itemData: undefined,
				syntaxError: e.message,
			};
		}
	}
	return {
		itemData: undefined,
		syntaxError: "Object is not ItemData",
	};
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

// biome-ignore assist/source/useSortedKeys: Want to keep it in the same order as declared in the ItemData interface.
export const ItemDataValidation = {
	typeId(value: string): BooleanWithMessage {
		const result: boolean = ItemTypes.get(value) !== undefined;
		return {
			bool: result,
			message: result ? "Valid" : "Invalid typeId",
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
	nameTag(value: string): BooleanWithMessage {
		// 255 is the max item nametag length as stated in index.d.ts. Going by 253 since §r is automatically added to the start of nametag to avoid italicization.
		const result: boolean = value.length <= 253;
		return {
			bool: result,
			message: result ? "Valid" : "Nametag length must be 253 characters or less",
		};
	},
	durability(durability: ItemDurability, itemStack: ItemStack): BooleanWithMessage {
		const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
		if (durabilityComponent === undefined) {
			return {
				bool: false,
				message: "Cannot apply durability to selected item",
			};
		}
		if (durability === "unbreakable") {
			return {
				bool: true,
				message: "Valid",
			};
		}
		if (!Number.isInteger(durability) || durability <= 0) {
			return {
				bool: false,
				message: 'Durability must be a positive integer or "unbreakable"',
			};
		}
		if (durabilityComponent.maxDurability < durability) {
			return {
				bool: false,
				message: `Durability number value cannot exceed max for this item (${durabilityComponent.maxDurability})`,
			};
		}
		return {
			bool: true,
			message: "Valid",
		};
	},
	dye(value: RGB): BooleanWithMessage {
		const result: boolean =
			value.red <= 0 ||
			value.red >= 1 ||
			value.green <= 0 ||
			value.green >= 1 ||
			value.blue <= 0 ||
			value.blue >= 1;
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
	complete(data: ItemData): BooleanWithMessage {
		let result: BooleanWithMessage;
		result = ItemDataValidation.typeId(data.typeId);
		if (!result.bool) {
			return result;
		}
		result = ItemDataValidation.amount(data.amount);
		if (!result.bool) {
			return result;
		}
		if (data.lockMode) {
			result = ItemDataValidation.lockMode(data.lockMode);
			if (!result.bool) {
				return result;
			}
		}
		if (data.nameTag) {
			result = ItemDataValidation.nameTag(data.nameTag);
			if (!result.bool) {
				return result;
			}
		}
		const itemStack = new ItemStack(data.typeId);
		if (data.durability) {
			result = ItemDataValidation.durability(data.durability, itemStack);
			if (!result.bool) {
				return result;
			}
		}
		/* Will add back once mojang fixes dyeable component (Bug tracker MCPE-237577 and MCPE-232617)
		if (data.dye) {
			result = ItemDataValidation.dye(data.dye);
			if (!result.bool) {
				return result;
			}
		}
		*/
		if (data.enchants) {
			result = ItemDataValidation.enchants(data.enchants, itemStack);
			if (!result.bool) {
				return result;
			}
		}
		if (data.slot) {
			result = ItemDataValidation.slot(data.slot, itemStack);
			if (!result.bool) {
				return result;
			}
		}
		return {
			bool: true,
			message: "ItemData is valid",
		};
	},
};
