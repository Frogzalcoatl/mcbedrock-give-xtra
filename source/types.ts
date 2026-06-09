import type { EquipmentSlot, ItemLockMode, RGB } from "@minecraft/server";

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

export const ITEM_DATA_KEY_COUNT_MAX: number = 8; // 9 once potionType is added
export const ITEM_DATA_KEY_COUNT_MIN: number = 2;
export interface ItemData {
	typeId: string;
	amount: number;
	lockMode?: ItemLockMode;
	nameTag?: string;
	// Must be less than the item's max durability. Infinity results in infinite durability.
	durability?: number;
	dye?: RGB;
	// potionType: Figure out later;
	enchants?: EnchantData[];
	slot?: SlotData;
}
