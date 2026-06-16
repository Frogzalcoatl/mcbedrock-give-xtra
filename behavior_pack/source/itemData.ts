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
	EnchantDataKeys,
	type ItemData,
	ItemDataDefaultAmount,
	ItemDataKeyCountMax,
	ItemDataKeys,
	ItemDataMaxAmount,
	type ItemDurability,
	MaxNameTagLength,
	type SlotData,
	SlotDataIdDefault,
	SlotDataKeepOldItemDefault,
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
	if (Object.keys(obj).length !== EnchantDataKeys.length) {
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
	if (objKeys.length !== SlotDataKeys.length) {
		throw new Error(getInvalidKeyMessage(objKeys, SlotDataKeys));
	}
	return true;
}

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
	if (obj.enchants !== undefined) {
		if (!isEnchantDataArr(obj.enchants)) {
			throw new Error("enchants must be an array of object EnchantData");
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

export function parseJsonArg(
	strJson: string,
	itemTypeId: string,
	amount: number,
): {
	itemData: ItemData | undefined;
	syntaxError: string | undefined;
} {
	// biome-ignore lint/suspicious/noExplicitAny: any is required here for JSON.parse. Type will be assigned later.
	let parsedData: any;
	try {
		parsedData = JSON.parse(strJson);
	} catch (error) {
		let syntaxError: string = "Unknown error occurred";
		if (error instanceof Error) {
			syntaxError = error.message;
		}
		return {
			itemData: undefined,
			syntaxError: syntaxError,
		};
	}
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
	let syntaxError: string = "Object is not ItemData";
	try {
		if (isItemData(parsedData)) {
			return {
				itemData: parsedData,
				syntaxError: undefined,
			};
		}
	} catch (error) {
		if (error instanceof Error) {
			syntaxError = error.message;
		}
	}
	return {
		itemData: undefined,
		syntaxError: syntaxError,
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
	typeId(value: string): boolean {
		return ItemTypes.get(value) !== undefined;
	},
	amount(value: number): boolean {
		return value > 0 && Number.isInteger(value) && value < ItemDataMaxAmount;
	},
	lockMode(value: ItemLockMode): boolean {
		return Object.values(ItemLockMode).includes(value);
	},
	nameTag(value: string): boolean {
		return value.length <= MaxNameTagLength;
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
		if (!Number.isInteger(durability) || durability < 0) {
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
			if (
				enchant.level <= 0 ||
				enchant.level > type.maxLevel ||
				!Number.isInteger(enchant.level)
			) {
				return {
					bool: false,
					message: `Invalid enchantment level for "${enchant.id}". Must be an integer within range 1-${type.maxLevel}`,
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
		// Skipping max slot.id. Container size varies.
		if (!Number.isInteger(value.id) || value.id < 0) {
			return {
				bool: false,
				message: `Slot id must be an integer greater than or equal to 0`,
			};
		}
		// Cannot have an amount greater than the max if placing in a specific slot
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
			let message: string = `${data.typeId} is not compatible with potionType`;
			// In case user gets confused and tries to use potionType for tipped arrows
			if (data.typeId === "minecraft:arrow") {
				message += ". Use arrowType instead";
			}
			return {
				bool: false,
				message: message,
			};
		}
		const effectTypeNamespace = getMcNamespace(data.potionType);
		if (effectTypeNamespace === undefined) {
			data.potionType = `minecraft:${data.potionType}`;
		}
		const effect: PotionEffectType | undefined = Potions.getEffectType(data.potionType);
		if (effect === undefined) {
			return {
				bool: false,
				message: `Invalid potionType "${data.potionType}". Valid options include:\n${Potions.getAllEffectTypes().join("\n")}`,
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
		const typeIdResult: boolean = ItemDataValidation.typeId(data.typeId);
		if (!typeIdResult) {
			return {
				bool: false,
				message: `Invalid typeId "${data.typeId}"`,
			};
		}
		const amountResult: boolean = ItemDataValidation.amount(data.amount);
		if (!amountResult) {
			return {
				bool: false,
				message: `Invalid amount "${data.amount}"`,
			};
		}
		if (data.lockMode) {
			const lockModeResult: boolean = ItemDataValidation.lockMode(data.lockMode);
			if (!lockModeResult) {
				return {
					bool: false,
					message: `Invalid lockMode "${data.lockMode}". Valid options include:\n${Object.values(ItemLockMode).join(", ")}`,
				};
			}
		}
		if (data.nameTag) {
			const nameTagResult: boolean = ItemDataValidation.nameTag(data.nameTag);
			if (!nameTagResult) {
				return {
					bool: false,
					message: `nameTag must be within 1-${MaxNameTagLength} characters`,
				};
			}
		}
		const itemStack = new ItemStack(data.typeId);
		let messageResult: BooleanWithMessage;
		if (data.durability) {
			messageResult = ItemDataValidation.durability(data.durability, itemStack);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (data.enchants) {
			messageResult = ItemDataValidation.enchants(data.enchants, itemStack);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (data.slot) {
			messageResult = ItemDataValidation.slot(data.slot, itemStack, data.amount);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (data.potionType) {
			messageResult = ItemDataValidation.potionType(data, data.potionType);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (data.arrowType) {
			messageResult = ItemDataValidation.arrowType(data, data.arrowType);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (data.bedColor) {
			messageResult = ItemDataValidation.bedColor(data, data.bedColor);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		// ItemData.keepOnDeath is a boolean. Nothing to validate there.
		if (data.canPlaceOn) {
			messageResult = ItemDataValidation.canPlaceOnAndCanDestroy(
				data.canPlaceOn,
				"canPlaceOn",
			);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (data.canDestroy) {
			messageResult = ItemDataValidation.canPlaceOnAndCanDestroy(
				data.canDestroy,
				"canDestroy",
			);
			if (!messageResult.bool) {
				return messageResult;
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
