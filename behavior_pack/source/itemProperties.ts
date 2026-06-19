import {
	BlockTypes,
	EnchantmentSlot,
	type EnchantmentType,
	EnchantmentTypes,
	ItemComponentTypes,
	type ItemDurabilityComponent,
	type ItemEnchantableComponent,
	ItemLockMode,
	ItemStack,
	type ItemType,
	ItemTypes,
	type PotionEffectType,
	Potions,
} from "@minecraft/server";
import { getMcNamespace } from "./prettyTypeId";
import {
	ArrowTypes,
	BedColors,
	type BooleanWithMessage,
	type CommandType,
	type EnchantData,
	EnchantDataKeys,
	type ItemDurability,
	type ItemProperties,
	ItemPropertyDefaultAmount,
	ItemPropertyKeys,
	ItemPropertyMaxAmount,
	MaxNameTagLength,
	type SlotData,
	SlotDataKeepOldItemDefault,
	SlotDataKeys,
	SlotDataNameDefault,
	SlotName,
} from "./types";

export function validateKeys(objKeys: string[], validKeys: string[]): BooleanWithMessage {
	for (const key of objKeys) {
		if (!validKeys.includes(key)) {
			return {
				bool: false,
				message: `Invalid key "${key}. Valid options include:\n${validKeys.join(", ")}"`,
			};
		}
	}
	return {
		bool: true,
		message: "Valid keys",
	};
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
	const keyValidationResult: BooleanWithMessage = validateKeys(Object.keys(obj), EnchantDataKeys);
	if (!keyValidationResult.bool) {
		throw new Error(keyValidationResult.message);
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
	if (obj.name === undefined) {
		obj.name = SlotDataNameDefault;
	} else if (!Object.values(SlotName).includes(obj.name)) {
		throw new Error(
			`Invalid slot.name "${obj.name}". Valid values include:\n${Object.values(SlotName).join(", ")}`,
		);
	}
	// Optional keys
	if (obj.id !== undefined && typeof obj.id !== "number") {
		throw new Error("slot.id must be a number");
	}
	const keyValidationResult: BooleanWithMessage = validateKeys(Object.keys(obj), SlotDataKeys);
	if (!keyValidationResult.bool) {
		throw new Error(keyValidationResult.message);
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

// Throwing errors since theres no way to return "obj is ItemProperties" with a string when its false as far as i can tell.
// Want the user to know whats wrong with their item properties.
// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isItemProperties(obj: any): obj is ItemProperties {
	if (typeof obj !== "object" || obj === null) {
		throw new Error("itemProperties must be an Object");
	}
	// Keys with default values
	if (obj.amount === undefined) {
		obj.amount = ItemPropertyDefaultAmount;
	} else if (typeof obj.amount !== "number") {
		throw new Error("amount must be a number");
	} else if (obj.amount > ItemPropertyMaxAmount) {
		throw new Error(
			`The number you have entered (${obj.amount}) is too big, it must be at most ${ItemPropertyMaxAmount}`,
		);
	}
	// Mandatory keys
	if (obj.typeId === undefined) {
		throw new Error(`ItemProperties requires "typeId"`);
	}
	if (typeof obj.typeId !== "string") {
		throw new Error("typeId must be a string");
	}
	// Optional keys
	if (obj.lockMode !== undefined) {
		if (!Object.values(ItemLockMode).includes(obj.lockMode)) {
			throw new Error(
				`lockMode must be one of the following: ${Object.values(ItemLockMode)}`,
			);
		}
	}
	if (obj.nameTag !== undefined) {
		if (typeof obj.nameTag !== "string") {
			throw new Error("nameTag must be a string");
		}
	}
	if (obj.durability !== undefined) {
		if (
			typeof obj.durability !== "number" &&
			(typeof obj.durability !== "string" || obj.durability !== "unbreakable")
		) {
			throw new Error('Durability must be a number or the string "unbreakable"');
		}
	}
	if (obj.enchants !== undefined) {
		if (!isEnchantDataArr(obj.enchants)) {
			throw new Error("enchants must be an array of object EnchantData");
		}
	}
	if (obj.slot !== undefined) {
		if (!isSlotData(obj.slot)) {
			throw new Error(
				"slot must be an object containing name, id and optionally keepOldItem",
			);
		}
	}
	if (obj.potionType !== undefined) {
		if (typeof obj.potionType !== "string") {
			throw new Error("potionType must be a string");
		}
	}
	if (obj.arrowType !== undefined) {
		if (typeof obj.arrowType !== "string") {
			throw new Error("arrowType must be a string");
		}
	}
	if (obj.bedColor !== undefined) {
		if (typeof obj.bedColor !== "string") {
			throw new Error("bedColor must be a string");
		}
	}
	if (obj.keepOnDeath !== undefined) {
		if (typeof obj.keepOnDeath !== "boolean") {
			throw new Error("keepOnDeath must be a boolean");
		}
	}
	if (obj.canPlaceOn !== undefined) {
		if (!isStringArray(obj.canPlaceOn, "canPlaceOn")) {
			throw new Error("canPlaceOn must be an array of strings");
		}
	}
	if (obj.canDestroy !== undefined) {
		if (!isStringArray(obj.canDestroy, "canDestroy")) {
			throw new Error("canDestroy must be an array of strings");
		}
	}
	const keyValidationResult: BooleanWithMessage = validateKeys(
		Object.keys(obj),
		Object.values(ItemPropertyKeys),
	);
	if (!keyValidationResult.bool) {
		throw new Error(keyValidationResult.message);
	}
	return true;
}

export interface ParseCommandJsonResult {
	properties: ItemProperties | undefined;
	syntaxError: string | undefined;
}
export function parseCommandJson(
	strJson: string,
	itemTypeId: string,
	amount: number,
): ParseCommandJsonResult {
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
			properties: undefined,
			syntaxError: syntaxError,
		};
	}
	if (typeof parsedData !== "object" || parsedData === null) {
		return {
			properties: undefined,
			syntaxError: "Input should be an object",
		};
	}
	if (parsedData.typeId !== undefined) {
		return {
			properties: undefined,
			syntaxError: `Remove json key "typeId", as you have already defined it in the command`,
		};
	}
	if (parsedData.amount !== undefined) {
		return {
			properties: undefined,
			syntaxError: `Remove json key "amount", as you have already defined it in the command`,
		};
	}
	parsedData.typeId = itemTypeId;
	parsedData.amount = amount;
	let syntaxError: string = "Object is not ItemProperties";
	try {
		if (isItemProperties(parsedData)) {
			return {
				properties: parsedData,
				syntaxError: undefined,
			};
		}
	} catch (error) {
		if (error instanceof Error) {
			syntaxError = error.message;
		}
	}
	return {
		properties: undefined,
		syntaxError: syntaxError,
	};
}

const SlotsAlwaysEquippable: SlotName[] = [
	SlotName.Inventory,
	SlotName.MobChest,
	SlotName.Mainhand,
	SlotName.Hotbar,
	SlotName.Saddle, // Surprisingly anything can go in the saddle slot. No point in limiting it to saddles
	SlotName.Armor,
	SlotName.Offhand, // No good way to check this with custom items
	SlotName.EndChest,
];

function canEquipInSlot(itemStack: ItemStack, targetSlot: SlotName): boolean {
	if (SlotsAlwaysEquippable.includes(targetSlot)) {
		return true;
	}
	const itemNamespace: string | undefined = getMcNamespace(itemStack.typeId) ?? "minecraft";
	if (itemNamespace !== "minecraft") {
		// Don't trust custom items to have enchantable slots set up in the same way as vanilla items.
		return true;
	}
	// Only armor slots remain.
	const enchantable: ItemEnchantableComponent | undefined = itemStack.getComponent(
		ItemComponentTypes.Enchantable,
	);
	if (!enchantable || enchantable.slots.length === 0) {
		// All vanilla items in armor slots seem to have enchantable slots set up, even if theyre not enchantable.
		return false;
	}
	const itemEnchantSlots: EnchantmentSlot[] = enchantable.slots;
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

export function getMaxStackSize(itemTypeId: string): number | undefined {
	const itemType: ItemType | undefined = ItemTypes.get(itemTypeId);
	if (itemType === undefined) {
		return undefined;
	}
	const itemStack: ItemStack = new ItemStack(itemType);
	return itemStack.maxAmount;
}

export function getMaxItemPropertiesAmount(
	properties: ItemProperties,
	commandType: CommandType,
): number {
	if (
		(properties.slot !== undefined && properties.slot.id !== undefined) ||
		commandType === "spawnx"
	) {
		const maxStackSize: number | undefined = getMaxStackSize(properties.typeId);
		if (maxStackSize !== undefined) {
			return maxStackSize;
		}
	}
	return ItemPropertyMaxAmount;
}

// biome-ignore assist/source/useSortedKeys: Want to keep it in the same order as declared in the ItemProperties interface.
export const ItemPropertiesValidation = {
	typeId(value: string): BooleanWithMessage {
		const itemType: ItemType | undefined = ItemTypes.get(value);
		const result: boolean = itemType !== undefined && itemType.id !== "minecraft:air";
		return {
			bool: result,
			message: result ? "Valid Type ID" : `Invalid Type ID "${value}"`,
		};
	},
	amount(properties: ItemProperties, commandType: CommandType): BooleanWithMessage {
		const result: boolean =
			properties.amount > 0 &&
			Number.isInteger(properties.amount) &&
			properties.amount < getMaxItemPropertiesAmount(properties, commandType);
		return {
			bool: result,
			message: result ? "Valid Amount" : `Invalid Amount "${properties.amount}"`,
		};
	},
	lockMode(value: string): BooleanWithMessage {
		const result: boolean = Object.values(ItemLockMode).includes(value as ItemLockMode);
		return {
			bool: result,
			message: result
				? "Valid Lock Mode"
				: `Invalid Lock Mode "${value}". Valid options include:\n${Object.values(ItemLockMode).join(", ")}`,
		};
	},
	nameTag(value: string): BooleanWithMessage {
		const result: boolean = value.length <= MaxNameTagLength;
		return {
			bool: result,
			message: result
				? "Valid Name Tag"
				: `Invalid Name Tag "${value}". Name Tag must be within 1-${MaxNameTagLength} characters`,
		};
	},
	durability(durability: ItemDurability, itemStack: ItemStack): BooleanWithMessage {
		const durabilityComponent: ItemDurabilityComponent | undefined = itemStack.getComponent(
			ItemComponentTypes.Durability,
		);
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
		const enchantableComonent: ItemEnchantableComponent | undefined = itemStack.getComponent(
			ItemComponentTypes.Enchantable,
		);
		if (enchantableComonent === undefined) {
			return {
				bool: false,
				message: `Cannot apply enchants to selected item "${itemStack.typeId}"`,
			};
		}
		for (const enchant of value) {
			const type: EnchantmentType | undefined = EnchantmentTypes.get(enchant.id);
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
		if (value.id !== undefined && (!Number.isInteger(value.id) || value.id < 0)) {
			return {
				bool: false,
				message: `Slot id must be an integer greater than or equal to 0`,
			};
		}
		// Cannot have an amount greater than the max item stack size if placing in a specific slot
		if (amount > itemStack.maxAmount) {
			return {
				bool: false,
				message: `Amount ${amount} exceeds the maximum for ${itemStack.typeId} (${itemStack.maxAmount})\nIf you would like to give an amount exceeding the max stack size, you cannot select a slot.`,
			};
		}
		// ItemProperties.slot.keepOldItem is a boolean. Nothing to check there.
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
	potionType(value: string, properties: ItemProperties): BooleanWithMessage {
		properties.potionType = value;
		if (properties.arrowType !== undefined) {
			return {
				bool: false,
				message: "Cannot have both arrowType and potionType",
			};
		}
		const deliveryType: string | undefined = itemTypeToPotionDeliveryType(properties.typeId);
		if (deliveryType === undefined) {
			let message: string = `${properties.typeId} is not compatible with potionType`;
			if (properties.typeId === "minecraft:arrow") {
				// In case user gets confused and tries to use potionType for tipped arrows
				message += ". Use arrowType instead.";
			}
			return {
				bool: false,
				message: message,
			};
		}
		const effectTypeNamespace: string | undefined = getMcNamespace(properties.potionType);
		if (effectTypeNamespace === undefined) {
			properties.potionType = `minecraft:${properties.potionType}`;
		}
		const effect: PotionEffectType | undefined = Potions.getEffectType(properties.potionType);
		if (effect === undefined) {
			return {
				bool: false,
				message: `Invalid potionType "${properties.potionType}". Valid options include:\n${Potions.getAllEffectTypes().join("\n")}`,
			};
		}
		return {
			bool: true,
			message: "Valid potionType",
		};
	},
	arrowType(arrowType: string, properties: ItemProperties): BooleanWithMessage {
		properties.arrowType = arrowType;
		if (properties.typeId !== "minecraft:arrow") {
			return {
				bool: false,
				message: `${properties.typeId} is not compatible with arrowType. Use "minecraft:arrow:"`,
			};
		}
		if (!ArrowTypes.includes(arrowType)) {
			return {
				bool: false,
				message: `Invalid arrowType "${arrowType}". Valid options include:\n${ArrowTypes.join(", ")}`,
			};
		}
		return {
			bool: true,
			message: "Valid arrowType",
		};
	},
	bedColor(bedColor: string, properties: ItemProperties): BooleanWithMessage {
		if (properties.typeId !== "minecraft:bed") {
			return {
				bool: false,
				message: `${properties.typeId} is not compatible with bedColor. Use "minecraft:bed"`,
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
	full(properties: ItemProperties, commandType: CommandType): BooleanWithMessage {
		let messageResult: BooleanWithMessage;
		messageResult = ItemPropertiesValidation.typeId(properties.typeId);
		if (!messageResult.bool) {
			return messageResult;
		}
		messageResult = ItemPropertiesValidation.amount(properties, commandType);
		if (!messageResult.bool) {
			return messageResult;
		}
		if (properties.lockMode) {
			messageResult = ItemPropertiesValidation.lockMode(properties.lockMode);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (properties.nameTag) {
			messageResult = ItemPropertiesValidation.nameTag(properties.nameTag);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		const itemStack = new ItemStack(properties.typeId);
		if (properties.durability) {
			messageResult = ItemPropertiesValidation.durability(properties.durability, itemStack);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (properties.enchants) {
			messageResult = ItemPropertiesValidation.enchants(properties.enchants, itemStack);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (properties.slot) {
			messageResult = ItemPropertiesValidation.slot(
				properties.slot,
				itemStack,
				properties.amount,
			);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (properties.potionType) {
			messageResult = ItemPropertiesValidation.potionType(properties.potionType, properties);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (properties.arrowType) {
			messageResult = ItemPropertiesValidation.arrowType(properties.arrowType, properties);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (properties.bedColor) {
			messageResult = ItemPropertiesValidation.bedColor(properties.bedColor, properties);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		// ItemProperties.keepOnDeath is a boolean. Nothing to validate there.
		if (properties.canPlaceOn) {
			messageResult = ItemPropertiesValidation.canPlaceOnAndCanDestroy(
				properties.canPlaceOn,
				"canPlaceOn",
			);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (properties.canDestroy) {
			messageResult = ItemPropertiesValidation.canPlaceOnAndCanDestroy(
				properties.canDestroy,
				"canDestroy",
			);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		return {
			bool: true,
			message: "ItemProperties are valid",
		};
	},
};
