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
const validKeys: string[] = [
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
	return arr.findIndex((v: any) => typeof v !== "string") !== -1;
}

function validatePropertyTypes(obj: any): obj is GivexJson {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	for (const key of Object.keys(obj)) {
		if (!validKeys.includes(key)) {
			return false;
		}
	}
	if (typeof obj.typeId !== "string") {
		return false;
	}
	if (typeof obj.amount !== "number") {
		return false;
	}
	if (obj.nameTag !== undefined && typeof obj.nameTag !== "string") {
		return false;
	}
	if (obj.lockMode !== undefined && typeof obj.lockMode !== "string") {
		return false;
	}
	if (obj.data !== undefined && typeof obj.data !== "number") {
		return false;
	}
	if (obj.keepOnDeath !== undefined && typeof obj.keepOnDeath !== "boolean") {
		return false;
	}
	if (obj.canPlaceOn !== undefined) {
		if (!isStringArray(obj.canPlaceOn)) {
			return false;
		}
	}
	if (obj.canDestroy !== undefined) {
		if (!isStringArray(obj.canDestroy)) {
			return false;
		}
	}
	if (
		obj.durability !== undefined &&
		typeof obj.durability !== "string" &&
		typeof obj.durability !== "number"
	) {
		return false;
	}
	if (obj.enchants !== undefined && typeof obj.enchants !== "string") {
		return false;
	}
	if (obj.slot !== undefined && typeof obj.slot !== "string") {
		return false;
	}
	if (obj.slotId !== undefined && typeof obj.slotId !== "number") {
		return false;
	}
	if (obj.replaceMode !== undefined && typeof obj.replaceMode !== "string") {
		return false;
	}
	return true;
}

export function parseGivexJson(str: string): GivexJson | undefined {
	try {
		const obj = JSON.parse(str);
		if (validatePropertyTypes(obj)) {
			return obj;
		} else {
			return undefined;
		}
	} catch (_error) {
		return undefined;
	}
}
