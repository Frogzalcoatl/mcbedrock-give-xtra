import type { EquipmentSlot, ItemLockMode } from "@minecraft/server";

export interface BooleanWithMessage {
	bool: boolean;
	message: string;
}

export const ENCHANT_DATA_KEY_COUNT: number = 2;
export interface EnchantData {
	id: string;
	level: number;
}

export const SLOT_DATA_KEY_COUNT_MAX: number = 3;
export const SLOT_DATA_KEY_COUNT_MIN: number = 1;
export interface SlotData {
	name: EquipmentSlot;
	id?: number;
	replaceItem?: boolean;
}
export const SlotDataKeysForErrorMessage = ["name", "id", "replaceItem"];

export const ITEM_DATA_KEY_COUNT_MAX: number = 7; // +1 once potionType is added, +1 once mojang fixes dyeable component. (Bug tracker MCPE-237577 and MCPE-232617)
export const ITEM_DATA_KEY_COUNT_MIN: number = 2;
export type ItemDurability = number | "unbreakable";
export interface ItemData {
	typeId: string;
	amount: number;
	lockMode?: ItemLockMode;
	nameTag?: string;
	// Must be less than the item's max durability, or the str "unbreakable" to for infinite durability
	durability?: ItemDurability;
	// Dyeable component simply doesn't exist on vanilla items.
	// dye?: RGB;
	// potionType: Figure out later;
	enchants?: EnchantData[];
	slot?: SlotData;
}
export const ItemDataKeysForErrorMessage = [
	"typeId",
	"amount",
	"lockMode",
	"nameTag",
	"durability",
	"enchants",
	"slot",
];
