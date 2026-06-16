import {
	BlockTypes,
	EnchantmentSlot,
	EnchantmentTypes,
	ItemComponentTypes,
	ItemLockMode,
	ItemStack,
	ItemTypes,
	type PotionEffectType,
	Potions,
} from "@minecraft/server";
import { getMcNamespace } from "./prettyTypeId";
import {
	ArrowEffectSartingDataValue,
	ArrowEffectTypes,
	BedColors,
	type BooleanWithMessage,
	type EnchantData,
	EnchantDataKeyCount,
	EnchantDataKeys,
	type ItemData,
	ItemDataDefaultAmount,
	ItemDataKeyCountMax,
	ItemDataKeys,
	ItemDataMaxAmount,
	type ItemDurability,
	type SlotData,
	SlotDataIdDefault,
	SlotDataKeepOldItemDefault,
	SlotDataKeyCount,
	SlotDataKeys,
	SlotDataNameDefault,
	SlotName,
} from "./types";

function getInvalidKeyMessage(objKeys: string[], validKeys: string[]): string {
	for (const key of objKeys) {
		if (!validKeys.includes(key)) {
			return `Invalid key "${key}". Valid options include:\n${validKeys.join(", ")}`;
		}
	}
	return `Invalid key found. Valid options include:\n${validKeys.join(", ")}`;
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isEnchantData(obj: any): obj is EnchantData {
	if (typeof obj !== "object" || obj === null) {
		throw new Error("enchant must be an object");
	}
	if (obj.id === undefined) {
		throw new Error("enchant requires id");
	}
	if (typeof obj.id !== "string") {
		throw new Error("enchant.id must be a string");
	}
	if (obj.level === undefined) {
		throw new Error(`enchant ${obj.id} requires a level`);
	}
	if (typeof obj.level !== "number") {
		throw new Error(`${obj.id} enchant.level must be a number`);
	}
	if (Object.keys(obj).length !== EnchantDataKeyCount) {
		throw new Error(getInvalidKeyMessage(Object.keys(obj), EnchantDataKeys));
	}
	return true;
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isEnchantDataArr(arr: any): arr is EnchantData[] {
	if (typeof arr !== "object" || arr === null || !Array.isArray(arr)) {
		throw new Error("enchants must be an array");
	}
	for (const value of arr) {
		if (!isEnchantData(value)) {
			throw new Error("enchant data is invalid");
		}
	}
	return true;
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isSlotData(obj: any): obj is SlotData {
	if (typeof obj !== "object" || obj === null) {
		throw new Error("slot must be an object");
	}
	// Keys with default values
	if (obj.keepOldItem === undefined) {
		obj.keepOldItem = SlotDataKeepOldItemDefault;
	} else if (typeof obj.keepOldItem !== "boolean") {
		throw new Error("slot.keepOldItem must be a boolean");
	}
	if (obj.id === undefined) {
		obj.id = SlotDataIdDefault;
	} else if (typeof obj.id !== "number") {
		throw new Error("slot.id must be a number");
	}
	if (obj.name === undefined) {
		obj.name = SlotDataNameDefault;
	} else if (!Object.values(SlotName).includes(obj.name)) {
		throw new Error(
			`Invalid slot.name "${obj.name}". Valid values include:\n${Object.values(SlotName).join(", ")}`,
		);
	}
	const objKeys = Object.keys(obj);
	if (objKeys.length !== SlotDataKeyCount) {
		throw new Error(getInvalidKeyMessage(objKeys, SlotDataKeys));
	}
	return true;
}

/* Will add back once mojang fixes dyeable component (Bug tracker MCPE-237577 and MCPE-232617)

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isRgb(obj: any): obj is RGB {
	if (typeof obj !== "object" || obj === null) {
		throw new Error("dye must be an object");
	}
	// Stopped checking whether values fall between expected range 0-1 since that is checked in the validateItemData functions.
	if (typeof obj.red !== "number") {
		throw new Error("dye.red must be a number");
	}
	if (typeof obj.green !== "number") {
		throw new Error("dye.green must be a number");
	}
	if (typeof obj.blue !== "number") {
		throw new Error("dye.blue must be a number");
	}
	if (Object.keys(obj).length !== 3) {
		throw new Error(`Dye must have exactly 3 keys (red, blue, green)`);
	}
	return true;
}
*/
// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isStringArray(arr: any, propertyName: string): arr is string[] {
	if (typeof arr !== "object" || arr === null || !Array.isArray(arr)) {
		throw new Error(`${propertyName} must be an array`);
	}
	for (const value of arr) {
		if (typeof value !== "string") {
			throw new Error(`Invalid ${propertyName} value "${value}"`);
		}
	}
	return true;
}

// Throwing errors since theres no way to return "obj is ItemData" with a string when its false as far as i can tell.
// Want the user to know whats wrong with their item data.
// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isItemData(obj: any): obj is ItemData {
	if (typeof obj !== "object" || obj === null) {
		throw new Error("itemData must be an Object");
	}
	// Keys with default values
	let validKeysFound: number = 0;
	if (obj.amount === undefined) {
		obj.amount = ItemDataDefaultAmount;
	} else if (typeof obj.amount !== "number") {
		throw new Error("amount must be a number");
	} else if (obj.amount > ItemDataMaxAmount) {
		throw new Error(
			`The number you have entered (${obj.amount}) is too big, it must be at most ${ItemDataMaxAmount}`,
		);
	}
	validKeysFound++;
	const objKeys = Object.keys(obj);
	if (objKeys.length > ItemDataKeyCountMax) {
		throw new Error(getInvalidKeyMessage(objKeys, ItemDataKeys));
	}
	// Mandatory keys
	if (obj.typeId === undefined) {
		throw new Error(`ItemData requires "typeId"`);
	}
	if (typeof obj.typeId !== "string") {
		throw new Error("typeId must be a string");
	}
	validKeysFound++;
	// Optional keys
	if (obj.lockMode !== undefined) {
		if (!Object.values(ItemLockMode).includes(obj.lockMode)) {
			throw new Error(
				`lockMode must be one of the following: ${Object.values(ItemLockMode)}`,
			);
		}
		validKeysFound++;
	}
	if (obj.nameTag !== undefined) {
		if (typeof obj.nameTag !== "string") {
			throw new Error("nameTag must be a string");
		}
		validKeysFound++;
	}
	if (obj.durability !== undefined) {
		if (
			typeof obj.durability !== "number" &&
			(typeof obj.durability !== "string" || obj.durability !== "unbreakable")
		) {
			throw new Error('Durability must be a number or the string "unbreakable"');
		}
		validKeysFound++;
	}
	/* Will add back once mojang fixes dyeable component (Bug tracker MCPE-237577 and MCPE-232617)
	if (obj.dye !== undefined) {
		if (!isRgb(obj.dye)) {
			throw new Error(
				"dye must be an object with the properties red, green, and blue containing numbers",
			);
		}
		validKeysFound++;
	}
	*/
	if (obj.enchants !== undefined) {
		if (!isEnchantDataArr(obj.enchants)) {
			throw new Error("enchants must be an array of EnchantData");
		}
		validKeysFound++;
	}
	if (obj.slot !== undefined) {
		if (!isSlotData(obj.slot)) {
			throw new Error(
				"slot must be an object containing name, id and optionally keepOldItem",
			);
		}
		validKeysFound++;
	}
	if (obj.potionType !== undefined) {
		if (typeof obj.potionType !== "string") {
			throw new Error("potionType must be a string");
		}
		validKeysFound++;
	}
	if (obj.arrowType !== undefined) {
		if (typeof obj.arrowType !== "string") {
			throw new Error("arrowType must be a string");
		}
		validKeysFound++;
	}
	if (obj.bedColor !== undefined) {
		if (typeof obj.bedColor !== "string") {
			throw new Error("bedColor must be a string");
		}
		validKeysFound++;
	}
	if (obj.keepOnDeath !== undefined) {
		if (typeof obj.keepOnDeath !== "boolean") {
			throw new Error("keepOnDeath must be a boolean");
		}
		validKeysFound++;
	}
	if (obj.canPlaceOn !== undefined) {
		if (!isStringArray(obj.canPlaceOn, "canPlaceOn")) {
			throw new Error("canPlaceOn must be an array of strings");
		}
		validKeysFound++;
	}
	if (obj.canDestroy !== undefined) {
		if (!isStringArray(obj.canDestroy, "canDestroy")) {
			throw new Error("canDestroy must be an array of strings");
		}
		validKeysFound++;
	}
	if (objKeys.length !== validKeysFound) {
		throw new Error(getInvalidKeyMessage(objKeys, ItemDataKeys));
	}
	return true;
}

export function parseItemData(
	strToParse: string,
	itemTypeId: string,
	amount: number,
): {
	itemData: ItemData | undefined;
	syntaxError: string | undefined;
} {
	// biome-ignore lint/suspicious/noExplicitAny: any is required here for JSON.parse. Type will be assigned later.
	let parsedData: any;
	try {
		parsedData = JSON.parse(strToParse);
	} catch (e) {
		if (e instanceof Error) {
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
		if (typeof parsedData === "object" && parsedData !== null) {
			if (parsedData.typeId !== undefined) {
				return {
					itemData: undefined,
					syntaxError: `Remove json key "typeId", as you have already defined it in the command`,
				};
			}
			if (parsedData.amount !== undefined) {
				return {
					itemData: undefined,
					syntaxError: `Remove json key "amount", as you have already defined it in the command`,
				};
			}
			parsedData.typeId = itemTypeId;
			parsedData.amount = amount;
		}
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

function canEquipInSlot(itemStack: ItemStack, targetSlot: SlotName): boolean {
	if (
		targetSlot === SlotName.Inventory ||
		targetSlot === SlotName.MobChest ||
		targetSlot === SlotName.Mainhand ||
		targetSlot === SlotName.Hotbar ||
		targetSlot === SlotName.Saddle ||
		targetSlot === SlotName.Armor ||
		targetSlot === SlotName.Offhand // No good way to check this with custom items
	) {
		// All items can go inside the above SlotNames
		return true;
	}
	const itemNamespace = getMcNamespace(itemStack.typeId) ?? "minecraft";
	if (itemNamespace !== "minecraft") {
		// Don't trust custom items to have enchantable slots set up in the same way as vanilla items.
		return true;
	}
	// Only armor slots remain.
	const enchantable = itemStack.getComponent(ItemComponentTypes.Enchantable);
	if (!enchantable || enchantable.slots.length === 0) {
		// All vanilla items in armor slots seem to have enchantable slots set up, even if theyre not enchantable.
		return false;
	}
	const itemEnchantSlots = enchantable.slots;
	switch (targetSlot) {
		case SlotName.Head:
			return (
				itemEnchantSlots.includes(EnchantmentSlot.ArmorHead) ||
				itemEnchantSlots.includes(EnchantmentSlot.CosmeticHead)
			);
		case SlotName.Chest:
			return (
				itemEnchantSlots.includes(EnchantmentSlot.ArmorTorso) ||
				itemEnchantSlots.includes(EnchantmentSlot.Elytra)
			);
		case SlotName.Legs:
			return itemEnchantSlots.includes(EnchantmentSlot.ArmorLegs);
		case SlotName.Feet:
			return itemEnchantSlots.includes(EnchantmentSlot.ArmorFeet);
		default:
			return true;
	}
}

export function itemTypeToPotionDeliveryType(typeId: string): string | undefined {
	switch (typeId) {
		case "minecraft:potion":
			return "Consume";
		case "minecraft:splash_potion":
			return "ThrownSplash";
		case "minecraft:lingering_potion":
			return "ThrownLingering";
		default:
			return undefined;
	}
}

// biome-ignore assist/source/useSortedKeys: Want to keep it in the same order as declared in the ItemData interface.
export const ItemDataValidation = {
	typeId(value: string): BooleanWithMessage {
		const result: boolean = ItemTypes.get(value) !== undefined;
		return {
			bool: result,
			message: result ? "Valid typeId" : "Invalid typeId",
		};
	},
	amount(value: number): BooleanWithMessage {
		const result: boolean = value > 0 && Number.isInteger(value) && value < ItemDataMaxAmount;
		return {
			bool: result,
			message: result ? "Valid amount" : "Invalid amount, must be a positve integer",
		};
	},
	lockMode(value: ItemLockMode): BooleanWithMessage {
		const result: boolean = Object.values(ItemLockMode).includes(value);
		return {
			bool: result,
			message: result ? "Valid lock mode" : "Invalid lock mode",
		};
	},
	nameTag(value: string): BooleanWithMessage {
		// 255 is the max item nametag length as stated in index.d.ts. Going by 253 since I automatically add §r to the start of nametag to avoid italicization.
		const result: boolean = value.length <= 253;
		return {
			bool: result,
			message: result ? "Valid nametag" : "Nametag length must be 253 characters or less",
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
				message: "Valid durability",
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
			message: "Valid durability",
		};
	},
	/*
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
				? "Valid dye"
				: `Dye must include three values between 0 and 1.\nEx: "dye":{"red":0,"blue":1,"green":0.5}`,
		};
	},
	*/
	enchants(value: EnchantData[], itemStack: ItemStack): BooleanWithMessage {
		const enchantableComonent = itemStack.getComponent(ItemComponentTypes.Enchantable);
		if (enchantableComonent === undefined) {
			return {
				bool: false,
				message: `Cannot apply enchants to selected item "${itemStack.typeId}"`,
			};
		}
		for (const enchant of value) {
			const type = EnchantmentTypes.get(enchant.id);
			if (type === undefined) {
				return {
					bool: false,
					message: `Invalid enchantment id "${enchant.id}"`,
				};
			}
			if (enchant.level <= 0 || enchant.level > type.maxLevel) {
				return {
					bool: false,
					message: `Invalid enchantment level for "${enchant.id}". Max level is ${type.maxLevel}`,
				};
			}
			if (!enchantableComonent.canAddEnchantment({ level: enchant.level, type: type })) {
				return {
					bool: false,
					message: `"${enchant.id}" cannot be applied to "${itemStack.typeId}"`,
				};
			}
		}
		return {
			bool: true,
			message: "Valid enchants",
		};
	},
	slot(value: SlotData, itemStack: ItemStack, amount: number): BooleanWithMessage {
		if (!canEquipInSlot(itemStack, value.name)) {
			return {
				bool: false,
				message: `${itemStack.typeId} cannot be placed in ${value.name}`,
			};
		}
		// Skipping max slot.id. Can use givex on non players, so max id varies.
		if (!Number.isInteger(value.id) || value.id < 0) {
			return {
				bool: false,
				message: `Slot id must be an integer greater than or equal to 0`,
			};
		}
		if (amount > itemStack.maxAmount) {
			return {
				bool: false,
				message: `Amount ${amount} exceeds the maximum for ${itemStack.typeId} (${itemStack.maxAmount})\nIf you would like to give an amount exceeding the max stack size, you cannot select a slot.`,
			};
		}
		// data.slot.keepOldItem is a boolean. Nothing to check there.
		return {
			bool: true,
			message: "Valid SlotData",
		};
	},
	canPlaceOnAndCanDestroy(value: string[], propertyName: string): BooleanWithMessage {
		if (value.length === 0) {
			return {
				bool: false,
				message: `Must list at least one block type in ${propertyName}`,
			};
		}
		for (const blockType of value) {
			if (!BlockTypes.get(blockType)) {
				return {
					bool: false,
					message: `Invalid block type ${blockType} in ${propertyName}`,
				};
			}
		}
		return {
			bool: true,
			message: `Valid ${propertyName}`,
		};
	},
	// Pass ItemData directly to edit potionType if its missing a namespace.
	potionType(data: ItemData, potionType: string): BooleanWithMessage {
		data.potionType = potionType;
		if (data.arrowType !== undefined) {
			return {
				bool: false,
				message: "Cannot have both arrowType and potionType",
			};
		}
		const deliveryType = itemTypeToPotionDeliveryType(data.typeId);
		if (deliveryType === undefined) {
			return {
				bool: false,
				message: `${data.typeId} is not compatible with potionType`,
			};
		}
		const effectTypeNamespace = getMcNamespace(data.potionType);
		if (effectTypeNamespace === undefined) {
			data.potionType = `minecraft:${data.potionType}`;
		}
		const effect: PotionEffectType | undefined = Potions.getEffectType(data.potionType);
		if (effect === undefined) {
			const allEffectTypes = Potions.getAllEffectTypes();
			let effectTypeList: string = "";
			for (const type of allEffectTypes) {
				effectTypeList += `${type.id}\n`;
			}
			// Remove final newline character
			effectTypeList = effectTypeList.slice(0, effectTypeList.length - 1);
			return {
				bool: false,
				message: `Invalid potionType "${data.potionType}". Valid options include:\n${effectTypeList}`,
			};
		}
		return {
			bool: true,
			message: "Valid potionData",
		};
	},
	arrowType(data: ItemData, arrowType: string): BooleanWithMessage {
		data.arrowType = arrowType;
		if (data.typeId !== "minecraft:arrow") {
			return {
				bool: false,
				message: `${data.typeId} is not compatible with arrowType. Use "minecraft:arrow:"`,
			};
		}
		if (!ArrowEffectTypes.includes(arrowType)) {
			return {
				bool: false,
				message: `Invalid arrowType "${arrowType}". Valid options include:\n${ArrowEffectTypes.join(", ")}`,
			};
		}
		return {
			bool: true,
			message: "Valid arrowType",
		};
	},
	bedColor(data: ItemData, bedColor: string): BooleanWithMessage {
		if (data.typeId !== "minecraft:bed") {
			return {
				bool: false,
				message: `${data.typeId} is not compatible with bedColor. Use "minecraft:bed"`,
			};
		}
		if (BedColors.includes(bedColor)) {
			return {
				bool: true,
				message: "Valid bedColor",
			};
		} else {
			return {
				bool: false,
				message: `Invalid bedColor "${bedColor}". Valid options include:\n${BedColors.join(", ")}`,
			};
		}
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
			result = ItemDataValidation.slot(data.slot, itemStack, data.amount);
			if (!result.bool) {
				return result;
			}
		}
		if (data.potionType) {
			result = ItemDataValidation.potionType(data, data.potionType);
			if (!result.bool) {
				return result;
			}
		}
		if (data.arrowType) {
			result = ItemDataValidation.arrowType(data, data.arrowType);
			if (!result.bool) {
				return result;
			}
		}
		if (data.bedColor) {
			result = ItemDataValidation.bedColor(data, data.bedColor);
			if (!result.bool) {
				return result;
			}
		}
		// ItemData.keepOnDeath is a boolean. Nothing to validate there.
		if (data.canPlaceOn) {
			result = ItemDataValidation.canPlaceOnAndCanDestroy(data.canPlaceOn, "canPlaceOn");
			if (!result.bool) {
				return result;
			}
		}
		if (data.canDestroy) {
			result = ItemDataValidation.canPlaceOnAndCanDestroy(data.canDestroy, "canDestroy");
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

// For arrowType, bedColor, etc
export function getCommandDataValue(itemData: ItemData): number {
	if (itemData.arrowType && itemData.typeId === "minecraft:arrow") {
		const arrowEffectResult: number = ArrowEffectTypes.indexOf(itemData.arrowType);
		if (arrowEffectResult !== -1) {
			return arrowEffectResult + ArrowEffectSartingDataValue;
		}
	} else if (itemData.bedColor && itemData.typeId === "minecraft:bed") {
		const bedColorResult = BedColors.indexOf(itemData.bedColor);
		if (bedColorResult !== -1) {
			return bedColorResult;
		}
	} else if (itemData.typeId === "minecraft:spawn_egg") {
		// npcs are the only spawn egg that still use data values. The rest have their own type id. Just redirect all references of the old spawn egg typeid to npc.
		return 51;
	}
	return 0;
}
