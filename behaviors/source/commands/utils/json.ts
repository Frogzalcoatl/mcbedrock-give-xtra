/** biome-ignore-all lint/suspicious/noExplicitAny: all instances of any type are later determined */

import {
	type BlockType,
	BlockTypes,
	type CustomCommandResult,
	CustomCommandStatus,
	type Enchantment,
	type EnchantmentType,
	EnchantmentTypes,
	ItemLockMode,
	type ItemType,
	ItemTypes,
} from "@minecraft/server";
import { MAX_AMOUNT, MAX_DATA, MAX_NAMETAG_LENGTH } from "../../constants";
import { SlotName } from "../../items/slot";

export interface GivexJson {
	typeId: string;
	amount: number;
	nameTag: string | null;
	data: number | null;
	lockMode: ItemLockMode | null;
	keepOnDeath: boolean | null;
	canPlaceOn: string[] | null;
	canDestroy: string[] | null;
	durability: "unbreakable" | number | null;
	enchants: (string | number)[] | null;
	slot: string | null;
	slotId: number | null;
	replaceMode: string | null;
}
export const validJsonKeys: string[] = [
	"typeId",
	"amount",
	"nameTag",
	"lockMode",
	"data",
	"keepOnDeath",
	"canPlaceOn",
	"canDestroy",
	"durability",
	"enchants",
	"slot",
	"slotId",
	"replaceMode",
];

function isStringArray(arr: any): arr is string[] {
	if (!Array.isArray(arr)) {
		return false;
	}
	return arr.findIndex((v: any) => typeof v !== "string") === -1;
}

function isStringIntegerArray(arr: any): arr is (string | number)[] {
	if (!Array.isArray(arr)) {
		return false;
	}
	return (
		arr.findIndex((v: any) => {
			const type: string = typeof v;
			return type !== "string" && (type !== "number" || !Number.isInteger(v));
		}) === -1
	);
}

function validatePropertyTypes(obj: any): obj is GivexJson {
	if (typeof obj !== "object" || obj === null) {
		throw new Error("Json must be an Object.");
	}
	for (const key of Object.keys(obj)) {
		if (!validJsonKeys.includes(key)) {
			throw new Error(`Invalid key "${key}".`);
		}
	}
	if (typeof obj.typeId !== "string") {
		throw new Error("typeId must be a string.");
	}
	if (typeof obj.amount !== "number") {
		throw new Error("amount must be a number.");
	}
	if (obj.nameTag === undefined) {
		obj.nameTag = null;
	} else if (typeof obj.nameTag !== "string") {
		throw new Error("nameTag must be a string.");
	}
	if (obj.lockMode === undefined) {
		obj.lockMode = null;
	} else if (typeof obj.lockMode !== "string") {
		throw new Error("lockMode must be a string.");
	}
	if (obj.data === undefined) {
		obj.data = null;
	} else if (typeof obj.data !== "number") {
		throw new Error("data must be a number.");
	}
	if (obj.keepOnDeath === undefined) {
		obj.keepOnDeath = null;
	} else if (typeof obj.keepOnDeath !== "boolean") {
		throw new Error("keepOnDeath must be a boolean.");
	}
	if (obj.canPlaceOn === undefined) {
		obj.canPlaceOn = null;
	} else if (!isStringArray(obj.canPlaceOn)) {
		throw new Error("canPlaceOn must be an array of strings.");
	}
	if (obj.canDestroy !== undefined && !isStringArray(obj.canDestroy)) {
		throw new Error("canDestroy must be an array of strings.");
	}
	if (obj.durability === undefined) {
		obj.durability = null;
	} else if (typeof obj.durability !== "string" && typeof obj.durability !== "number") {
		throw new Error("durability must be a string or number.");
	}
	if (obj.enchants === undefined) {
		obj.enchants = null;
	} else if (!isStringIntegerArray(obj.enchants)) {
		throw new Error("enchants must be an array of strings/integers.");
	}
	if (obj.slot === undefined) {
		obj.slot = null;
	} else if (typeof obj.slot !== "string") {
		throw new Error("slot must be a string.");
	}
	if (obj.slotId === undefined) {
		obj.slotId = null;
	} else if (typeof obj.slotId !== "number") {
		throw new Error("slotId must be a number.");
	}
	if (obj.replaceMode === undefined) {
		obj.replaceMode = null;
	} else if (typeof obj.replaceMode !== "string") {
		throw new Error("replaceMode must be a string.");
	}
	return true;
}

export interface GivexJsonParseResult {
	json: GivexJson | null;
	message: string;
}
export function parseGivexJson(str: string, typeId: string): GivexJsonParseResult {
	try {
		const obj = JSON.parse(str);
		obj.typeId = typeId;
		if (obj.amount === undefined) {
			obj.amount = 1;
		}
		if (validatePropertyTypes(obj)) {
			return {
				json: obj,
				message: "",
			};
		} else {
			return {
				json: null,
				message: "Invalid type in json.",
			};
		}
	} catch (error) {
		const result: GivexJsonParseResult = {
			json: null,
			message: "Invalid type in json.",
		};
		if (error instanceof Error) {
			result.message = error.message;
		}
		return result;
	}
}

// Returns invalid index (if it exists)
function validBlockTypes(blockTypes: string[]): number | null {
	for (let i: number = 0; i < blockTypes.length; i++) {
		let current: string | undefined = blockTypes[i];
		if (!current) {
			return i;
		}
		if (current.indexOf(":") === -1) {
			current = `minecraft:${current}`;
		}
		const blockType: BlockType | undefined = BlockTypes.get(current);
		if (blockType === undefined) {
			return i;
		}
	}
	return null;
}

// Ex valid enchant list: "protection, 4, mending, feather_falling"
// If level is not included, assume level 1
// Returns enchantments or invalid index
function getEnchantsFromList(list: (string | number)[]): Enchantment[] | number {
	const enchantments: Enchantment[] = [];
	let currentEnchantType: EnchantmentType | null = null;
	for (let i: number = 0; i < list.length; i++) {
		let currentVal: string | number | undefined = list[i];
		if (typeof currentVal === "string") {
			if (currentEnchantType !== null) {
				enchantments.push({
					level: 1,
					type: currentEnchantType,
				});
			}
			if (currentVal.indexOf(":") === -1) {
				currentVal = `minecraft:${currentVal}`;
			}
			currentEnchantType = EnchantmentTypes.get(currentVal) ?? null;
			if (currentEnchantType === null) {
				return i;
			}
		} else if (
			typeof currentVal === "number" &&
			currentEnchantType !== null &&
			currentVal >= 1 &&
			currentVal <= currentEnchantType.maxLevel
		) {
			enchantments.push({
				level: currentVal,
				type: currentEnchantType,
			});
			currentEnchantType = null;
		} else {
			return i;
		}
	}
	if (currentEnchantType !== null) {
		enchantments.push({
			level: 1,
			type: currentEnchantType,
		});
	}
	return enchantments;
}

export interface GivexValidationResult {
	commandResult: CustomCommandResult;
	enchants: Enchantment[] | null;
}
export function validateGivex(json: GivexJson): GivexValidationResult {
	const result: GivexValidationResult = {
		commandResult: {
			status: CustomCommandStatus.Failure,
		},
		enchants: null,
	};
	if (json.typeId.indexOf(":") === -1) {
		json.typeId = `minecraft:${json.typeId}`;
	}
	const itemType: ItemType | undefined = ItemTypes.get(json.typeId);
	if (itemType === undefined) {
		result.commandResult.message = `Invalid typeId "${json.typeId}"`;
		return result;
	}
	if (
		json.amount <= 0 ||
		json.amount > MAX_AMOUNT ||
		!Number.isFinite(json.amount) ||
		!Number.isInteger(json.amount)
	) {
		result.commandResult.message = `Amount must be an integer within range 0-${MAX_AMOUNT}.`;
		return result;
	}
	if (json.nameTag !== null && json.nameTag.length > MAX_NAMETAG_LENGTH) {
		result.commandResult.message = `Nametag cannot exceed ${MAX_NAMETAG_LENGTH} characters.`;
		return result;
	}
	if (
		json.data !== null &&
		(json.data < 0 ||
			json.data > MAX_DATA ||
			!Number.isFinite(json.amount) ||
			!Number.isInteger(json.amount))
	) {
		result.commandResult.message = `Invalid data value "${json.data}"`;
		return result;
	}
	if (json.lockMode !== null && !Object.values(ItemLockMode).includes(json.lockMode)) {
		result.commandResult.message = `Invalid lock mode "${json.lockMode}". Valid values: ${Object.values(ItemLockMode).join(", ")}`;
		return result;
	}
	if (json.canPlaceOn !== null) {
		const invalidIndex: number | null = validBlockTypes(json.canPlaceOn);
		if (invalidIndex !== null) {
			result.commandResult.message = `Invalid canPlaceOn at "${json.canPlaceOn[invalidIndex]}"`;
			return result;
		}
	}
	if (json.canDestroy !== null) {
		const invalidIndex: number | null = validBlockTypes(json.canDestroy);
		if (invalidIndex !== null) {
			result.commandResult.message = `Invalid canDestroy at "${json.canDestroy[invalidIndex]}"`;
			return result;
		}
	}
	if (
		json.durability !== null &&
		(typeof json.durability === "number" || json.durability !== "unbreakable")
	) {
		if (json.durability < 0) {
			result.commandResult.message = `Durability must be a non negative integer`;
			return result;
		}
	}
	if (json.enchants !== null) {
		const enchantResult: number | Enchantment[] = getEnchantsFromList(json.enchants);
		if (typeof enchantResult === "number") {
			const invalidIndex = enchantResult;
			result.commandResult.message = `Invalid enchant value at "${json.enchants[invalidIndex]}"`;
			return result;
		} else {
			result.enchants = enchantResult;
		}
	}
	if (json.slot !== null && !Object.values(SlotName).includes(json.slot as SlotName)) {
		result.commandResult.message = `Invalid slot "${json.slot}"\nValid values:\n${Object.values(SlotName).join("\n")}`;
		return result;
	}
	if (json.slotId !== null && json.slotId < 0) {
		result.commandResult.message = "Slot id must be a non negative integer.";
		return result;
	}
	if (
		json.replaceMode !== null &&
		json.replaceMode !== "keep" &&
		json.replaceMode !== "destroy"
	) {
		result.commandResult.message = `Invalid replace mode "${json.replaceMode}"`;
		return result;
	}
	result.commandResult.status = CustomCommandStatus.Success;
	return result;
}
