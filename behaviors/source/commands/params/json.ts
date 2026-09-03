/** biome-ignore-all lint/suspicious/noExplicitAny: all instances of any type are later determined */

import type { ItemLockMode } from "@minecraft/server";

export interface GivexJson {
	typeId: string;
	amount: number;
	nameTag?: string;
	data?: number;
	lockMode?: ItemLockMode;
	keepOnDeath?: boolean;
	canPlaceOn?: string[];
	canDestroy?: string[];
	durability?: "unbreakable" | "max" | number;
	enchants?: (string | number)[];
	slot?: string;
	slotId?: number;
	replaceMode?: string;
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
	if (obj.nameTag !== undefined && typeof obj.nameTag !== "string") {
		throw new Error("nameTag must be a string.");
	}
	if (obj.lockMode !== undefined && typeof obj.lockMode !== "string") {
		throw new Error("lockMode must be a string.");
	}
	if (obj.data !== undefined && (typeof obj.data !== "number" || !Number.isInteger(obj.data))) {
		throw new Error("data must be an integer.");
	}
	if (obj.keepOnDeath !== undefined && typeof obj.keepOnDeath !== "boolean") {
		throw new Error("keepOnDeath must be a boolean.");
	}
	if (obj.canPlaceOn !== undefined && !isStringArray(obj.canPlaceOn)) {
		throw new Error("canPlaceOn must be an array of strings.");
	}
	if (obj.canDestroy !== undefined && !isStringArray(obj.canDestroy)) {
		throw new Error("canDestroy must be an array of strings.");
	}
	if (
		obj.durability !== undefined &&
		typeof obj.durability !== "string" &&
		typeof obj.durability !== "number"
	) {
		throw new Error("durability must be a string or number.");
	}
	if (obj.enchants !== undefined && !isStringIntegerArray(obj.enchants)) {
		throw new Error("enchants must be an array of strings/integers.");
	}
	if (obj.slot !== undefined && typeof obj.slot !== "string") {
		throw new Error("slot must be a string.");
	}
	if (
		obj.slotId !== undefined &&
		(typeof obj.slotId !== "number" || !Number.isInteger(obj.slotId))
	) {
		throw new Error("slotId must be an integer.");
	}
	if (obj.replaceMode !== undefined && typeof obj.replaceMode !== "string") {
		throw new Error("replaceMode must be a string.");
	}
	return true;
}

export function parseGivexJson(str: string, typeId: string): GivexJson {
	const obj = JSON.parse(str);
	obj.typeId = typeId;
	if (obj.amount === undefined) {
		obj.amount = 1;
	}
	if (validatePropertyTypes(obj)) {
		return obj;
	} else {
		throw new Error("Invalid type in json.");
	}
}
