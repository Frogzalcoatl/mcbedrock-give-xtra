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
} from "@minecraft/server";
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";
import {
	MAX_AMOUNT,
	MAX_DATA,
	MAX_LORE_LINE_CHAR_COUNT,
	MAX_LORE_LINE_COUNT,
	MAX_NAMETAG_LENGTH,
} from "../../constants";
import { SlotName } from "../../items/slot";

export interface GivexJson {
	nameTag: string | null;
	lockMode: ItemLockMode | null;
	keepOnDeath: boolean | null;
	canPlaceOn: string[] | null;
	canDestroy: string[] | null;
	durability: "unbreakable" | number | null;
	enchants: (string | number)[] | null;
	lore: string[] | null;
	slot: SlotName | null;
	slotId: number | null;
	replaceMode: string | null;
}
export const validJsonKeys: string[] = [
	"nameTag",
	"lockMode",
	"keepOnDeath",
	"canPlaceOn",
	"canDestroy",
	"durability",
	"enchants",
	"lore",
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
		throw new Error("Json must be an Object");
	}
	for (const key of Object.keys(obj)) {
		if (!validJsonKeys.includes(key)) {
			throw new Error(`Invalid key "${key}"`);
		}
	}
	for (const key of validJsonKeys) {
		if (!Object.hasOwn(obj, key)) {
			obj[key] = null;
		}
	}
	if (obj.nameTag !== null && typeof obj.nameTag !== "string") {
		throw new Error(`nameTag must be a string`);
	}
	if (obj.lockMode !== null && !Object.values(ItemLockMode).includes(obj.lockMode)) {
		throw new Error(
			`invalid lockMode "${obj.lockMode}"\nValid values:\n${Object.values(ItemLockMode).join("\n")}`,
		);
	}
	if (obj.keepOnDeath !== null && typeof obj.keepOnDeath !== "boolean") {
		throw new Error("keepOnDeath must be a boolean");
	}
	if (obj.canPlaceOn !== null && !isStringArray(obj.canPlaceOn)) {
		throw new Error("canPlaceOn must be an array of strings");
	}
	if (obj.canDestroy !== null && !isStringArray(obj.canDestroy)) {
		throw new Error("canDestroy must be an array of strings");
	}
	if (
		obj.durability !== null &&
		obj.durability !== "unbreakable" &&
		typeof obj.durability !== "number"
	) {
		throw new Error('durability must be a number or the string "unbreakable"');
	}
	if (obj.enchants !== null && !isStringIntegerArray(obj.enchants)) {
		throw new Error("enchants must be an array of strings/integers");
	}
	if (obj.lore !== null && !isStringArray(obj.lore)) {
		throw new Error("lore must be an array of strings");
	}
	if (obj.slot !== null && !Object.values(SlotName).includes(obj.slot)) {
		throw new Error(
			`invalid slot "${obj.slot}"\nValid values:\n${Object.values(SlotName).join("\n")}`,
		);
	}
	if (obj.slotId !== null && typeof obj.slotId !== "number") {
		throw new Error("slotId must be a number");
	}
	if (obj.replaceMode !== null && typeof obj.replaceMode !== "string") {
		throw new Error("replaceMode must be a string");
	}
	return true;
}

export interface GivexJsonParseResult {
	json: GivexJson | null;
	message: string;
}
export function parseGivexJson(str: string): GivexJsonParseResult {
	try {
		const obj = JSON.parse(str);
		if (validatePropertyTypes(obj)) {
			return {
				json: obj,
				message: "",
			};
		} else {
			return {
				json: null,
				message: "Invalid type in json",
			};
		}
	} catch (error) {
		const result: GivexJsonParseResult = {
			json: null,
			message: "Invalid type in json",
		};
		if (error instanceof Error) {
			result.message = error.message;
		}
		return result;
	}
}

// Returns invalid index (if it exists)
export function validBlockTypes(blockTypes: string[]): number | null {
	for (let i: number = 0; i < blockTypes.length; i++) {
		const current: string | undefined = blockTypes[i];
		if (!current) {
			return i;
		}
		const blockType: BlockType | undefined = BlockTypes.get(current);
		if (blockType === undefined) {
			return i;
		}
	}
	return null;
}

// Ex valid enchant list: ["protection", 4, "mending", "feather_falling", 2] -> Protection IV, Mending I, and Feather Falling II
// If level is not included, assume level 1
// Returns enchantments or invalid index
function getEnchantsFromList(list: (string | number)[]): Enchantment[] | number {
	const enchantments: Enchantment[] = [];
	let currentEnchantType: EnchantmentType | null = null;
	for (let i: number = 0; i < list.length; i++) {
		const currentVal: string | number | undefined = list[i];
		if (typeof currentVal === "string") {
			if (currentEnchantType !== null) {
				enchantments.push({
					level: 1,
					type: currentEnchantType,
				});
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
export function validateGivex(
	json: GivexJson,
	item: ItemType,
	amount: number,
	data: number,
): GivexValidationResult {
	const result: GivexValidationResult = {
		commandResult: {
			status: CustomCommandStatus.Failure,
		},
		enchants: null,
	};
	if (item.id === MinecraftBlockTypes.Air) {
		result.commandResult.message = `Invalid typeId "${item.id}"`;
		return result;
	}
	if (amount <= 0 || amount > MAX_AMOUNT || !Number.isInteger(amount)) {
		result.commandResult.message = `Amount must be an integer within range 0-${MAX_AMOUNT}`;
		return result;
	}
	if (json.nameTag !== null && json.nameTag.length > MAX_NAMETAG_LENGTH) {
		result.commandResult.message = `Nametag cannot exceed ${MAX_NAMETAG_LENGTH} characters`;
		return result;
	}
	if (data < 0 || data > MAX_DATA || !Number.isInteger(data)) {
		result.commandResult.message = `Invalid data value "${data}"`;
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
		typeof json.durability === "number" &&
		(json.durability < 0 || !Number.isInteger(json.durability))
	) {
		result.commandResult.message = `Durability must be a non negative integer or "unbreakable"`;
		return result;
	}
	if (json.slotId !== null) {
		if (json.slotId < 0 || !Number.isInteger(json.slotId)) {
			result.commandResult.message = "Slot id must be a non negative integer.";
			return result;
		}
		if (json.slot === null) {
			json.slot = SlotName.Inventory;
		}
	}
	if (json.slot === SlotName.Hotbar && json.slotId === null) {
		result.commandResult.message = `Slot id must be specified when using ${SlotName.Hotbar}`;
		return result;
	}
	if (
		json.replaceMode !== null &&
		json.replaceMode !== "keep" &&
		json.replaceMode !== "destroy" &&
		json.replaceMode !== "move"
	) {
		result.commandResult.message = `Invalid replace mode "${json.replaceMode}\nValid values:\nkeep\ndestroy\nmove"`;
		return result;
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
	if (json.lore !== null) {
		if (json.lore.length > MAX_LORE_LINE_COUNT) {
			result.commandResult.message = `Cannot exceed 20 lines of lore`;
			return result;
		}
		for (let i = 0; i < json.lore.length; i++) {
			if ((json.lore[i]?.length ?? 0) > MAX_LORE_LINE_COUNT) {
				result.commandResult.message = `Lore exceeds max length of ${MAX_LORE_LINE_CHAR_COUNT} at line ${i + 1}: "${json.lore[i]}"`;
				return result;
			}
		}
	}
	result.commandResult.status = CustomCommandStatus.Success;
	return result;
}
