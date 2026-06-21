import {
	BlockTypes,
	EnchantmentSlot,
	type EnchantmentType,
	EnchantmentTypes,
	ItemComponentTypes,
	type ItemEnchantableComponent,
	ItemLockMode,
	ItemStack,
	type ItemType,
	ItemTypes,
	type PotionEffectType,
	Potions,
} from "@minecraft/server";
import { getMaxDurability } from "./itemStack";
import { getMcNamespace, removeMcNamespace } from "./prettyTypeId";
import {
	ArrowTypes,
	BedColors,
	type BooleanWithMessage,
	type CommandType,
	type EnchantData,
	EnchantDataKeys,
	EnchantDataLevelDefault,
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
				message: `Invalid key "${key}". Valid options include:\n${validKeys.join(", ")}"`,
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
		obj.level = EnchantDataLevelDefault;
	} else if (typeof obj.level !== "number") {
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
		throw new Error("Enchants must be an array");
	}
	for (let i: number = 0; i < arr.length; i++) {
		const value = arr[i];
		if (!isEnchantData(value)) {
			throw new Error("Enchant data is invalid");
		}
		for (let j: number = 0; j < i; j++) {
			if (value.id === arr[j].id) {
				throw new Error(`Duplicate enchant "${value.id}"`);
			}
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

const VanillaOffhandItems: string[] = [
	"minecraft:shield",
	"minecraft:totem_of_undying",
	"minecraft:arrow",
	"minecraft:firework_rocket",
	"minecraft:empty_map",
	"minecraft:filled_map",
	"minecraft:nautilus_shell",
	"minecraft:sparkler",
];

const SlotsAlwaysEquippable: string[] = [
	SlotName.Inventory,
	SlotName.MobChest,
	SlotName.Mainhand,
	SlotName.Hotbar,
	SlotName.Saddle, // Surprisingly anything can go in the saddle slot. No point in limiting it to saddles
	SlotName.Armor,
	SlotName.EndChest,
];

function canEquipInSlot(itemStack: ItemStack, targetSlot: string): boolean {
	if (SlotsAlwaysEquippable.includes(targetSlot)) {
		return true;
	}
	const itemNamespace: string | undefined = getMcNamespace(itemStack.typeId) ?? "minecraft";
	if (itemNamespace !== "minecraft") {
		// Don't trust custom items to have enchantable slots set up in the same way as vanilla items.
		return true;
	}
	// Vanilla items only
	if (targetSlot === SlotName.Offhand) {
		return VanillaOffhandItems.includes(itemStack.typeId);
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
	let itemStack: ItemStack;
	try {
		itemStack = new ItemStack(itemTypeId);
	} catch (_error) {
		return undefined;
	}
	return itemStack.maxAmount;
}

// These slots can only have one stack of an item at most.
export const SlotNamesOneStackOnly: string[] = [
	SlotName.Armor,
	SlotName.Head,
	SlotName.Chest,
	SlotName.Legs,
	SlotName.Feet,
	SlotName.Offhand,
	SlotName.Mainhand,
	SlotName.Armor,
	SlotName.Saddle,
];

export function getMaxItemPropertiesAmount(
	properties: ItemProperties,
	commandType: CommandType,
): number {
	if (
		(properties.slot !== undefined &&
			(properties.slot.id !== undefined ||
				SlotNamesOneStackOnly.includes(properties.slot.name))) ||
		commandType === "spawnx"
	) {
		const maxStackSize: number | undefined = getMaxStackSize(properties.typeId);
		if (maxStackSize !== undefined) {
			return maxStackSize;
		}
	}
	return ItemPropertyMaxAmount;
}

export interface TypeIdValidationReturnType {
	bool: boolean;
	formattedTypeId: string | undefined;
}

export function formatTypeId(typeId: string): string | undefined {
	if (typeId === "spawn_egg" || typeId === "minecraft:spawn_egg") {
		// This type id is not included in ItemTypes.get but is still needed to get npc spawn eggs by data value
		// All references to this type id are redirected to the npc spawn egg
		return "minecraft:spawn_egg";
	} else if (typeId === "minecraft:air") {
		// Accessing an itemstack with typeId air crashes the world.
		return undefined;
	} else {
		const itemType: ItemType | undefined = ItemTypes.get(typeId);
		if (itemType !== undefined) {
			// Properly convert values like "grass" to "minecraft:grass"
			return itemType.id;
		}
	}
	return undefined;
}

// biome-ignore assist/source/useSortedKeys: Want to keep it in the same order as declared in the ItemProperties interface.
export const ItemPropertiesValidation = {
	typeId(properties: ItemProperties): BooleanWithMessage {
		let result: boolean = false;
		const formattedTypeId: string | undefined = formatTypeId(properties.typeId);
		if (formattedTypeId !== undefined) {
			properties.typeId = formattedTypeId;
			result = true;
		}
		return {
			bool: result,
			message: result ? "Valid Type ID" : `Invalid Type ID "${properties.typeId}"`,
		};
	},
	amount(properties: ItemProperties, commandType: CommandType): BooleanWithMessage {
		const maxAmount: number = getMaxItemPropertiesAmount(properties, commandType);
		const result: boolean =
			properties.amount > 0 &&
			Number.isInteger(properties.amount) &&
			properties.amount <= maxAmount;
		return {
			bool: result,
			message: result
				? "Valid Amount"
				: `Invalid Amount "${properties.amount}". Must be within range 1-${maxAmount} for your selected item and properties.`,
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
	durability(durability: ItemDurability, itemTypeId: string): BooleanWithMessage {
		const maxDurability: number | undefined = getMaxDurability(itemTypeId);
		if (maxDurability === undefined) {
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
		if (maxDurability < durability) {
			return {
				bool: false,
				message: `Durability number value cannot exceed max for this item (${maxDurability})`,
			};
		}
		return {
			bool: true,
			message: "Valid durability",
		};
	},
	enchants(value: EnchantData[], itemTypeId: string): BooleanWithMessage {
		let enchantableComonent: ItemEnchantableComponent | undefined;
		let errorMessage: string = `Cannot apply enchants to selected item "${itemTypeId}"`;
		try {
			enchantableComonent = new ItemStack(itemTypeId).getComponent(
				ItemComponentTypes.Enchantable,
			);
		} catch (error) {
			if (error instanceof Error) {
				errorMessage += `: ${error.message}`;
			}
			return {
				bool: false,
				message: errorMessage,
			};
		}
		if (enchantableComonent === undefined) {
			return {
				bool: false,
				message: errorMessage,
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
					message: `Invalid enchantment level "${enchant.level}" for "${enchant.id}". Must be an integer within range 1-${type.maxLevel}`,
				};
			}
			if (!enchantableComonent.canAddEnchantment({ level: enchant.level, type: type })) {
				return {
					bool: false,
					message: `"${enchant.id}" cannot be applied to "${itemTypeId}"`,
				};
			}
		}
		return {
			bool: true,
			message: "Valid enchants",
		};
	},
	slot(
		value: SlotData,
		itemTypeId: string,
		amount: number,
		commandType: CommandType,
	): BooleanWithMessage {
		if (commandType === "spawnx") {
			return {
				bool: false,
				message: `Slot cannot be used with /spawnx`,
			};
		}
		let testItem: ItemStack;
		try {
			testItem = new ItemStack(itemTypeId);
		} catch (error) {
			let errorMessage = `Unable to validate SlotData`;
			if (error instanceof Error) {
				errorMessage += `: ${error.message}`;
			}
			return {
				bool: false,
				message: errorMessage,
			};
		}
		if (!canEquipInSlot(testItem, value.name)) {
			return {
				bool: false,
				message: `${itemTypeId} cannot be placed in ${value.name}`,
			};
		}
		// Skipping max slot.id. Container size varies.
		if (value.id !== undefined && (!Number.isInteger(value.id) || value.id < 0)) {
			return {
				bool: false,
				message: `Slot id must be an integer greater than or equal to 0`,
			};
		}
		if (SlotNamesOneStackOnly.includes(value.name) && amount > testItem.maxAmount) {
			return {
				bool: false,
				message: `Amount ${amount} exceeds the maximum for ${itemTypeId} (${testItem.maxAmount})\nIf you would like to give an amount exceeding the max stack size, you cannot select a slot.`,
			};
		}
		if (value.name === SlotName.Hotbar && value.id !== undefined && value.id > 8) {
			return {
				bool: false,
				message: `Id for hotbar must be within range 0-8`,
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
				message: `Invalid potionType "${removeMcNamespace(properties.potionType)}". Valid options include:\n${Potions.getAllEffectTypes()
					.map((e) => removeMcNamespace(e.id))
					.join(", ")}`,
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
		messageResult = ItemPropertiesValidation.typeId(properties);
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
		if (properties.durability) {
			messageResult = ItemPropertiesValidation.durability(
				properties.durability,
				properties.typeId,
			);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (properties.enchants) {
			messageResult = ItemPropertiesValidation.enchants(
				properties.enchants,
				properties.typeId,
			);
			if (!messageResult.bool) {
				return messageResult;
			}
		}
		if (properties.slot) {
			messageResult = ItemPropertiesValidation.slot(
				properties.slot,
				properties.typeId,
				properties.amount,
				commandType,
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
