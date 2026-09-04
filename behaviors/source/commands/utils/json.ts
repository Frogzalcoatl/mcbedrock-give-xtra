/** biome-ignore-all lint/suspicious/noExplicitAny: all instances of any type are later determined */

import type { ItemLockMode } from "@minecraft/server";

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
