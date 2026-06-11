import type { ItemLockMode } from "@minecraft/server";

export interface BooleanWithMessage {
	bool: boolean;
	message: string;
}

export const ENCHANT_DATA_KEY_COUNT: number = 2;
export interface EnchantData {
	id: string;
	level: number;
}
export const EnchantDataKeys: string[] = ["id", "level"];

// Based on /replaceitem command slots.
// Excluding slot.endchest. Cannot be accessed with scripting yet.
// Excluding slot.armor.body. Used for wolf armor but cannot be accessed.
// Excluding slot.equippable. I think its for custom items but I'm not sure how it works. May come back to this.
export enum SlotName {
	Mainhand = "slot.weapon.mainhand",
	Offhand = "slot.weapon.offhand",
	Head = "slot.armor.head",
	Chest = "slot.armor.chest",
	Legs = "slot.armor.legs",
	Feet = "slot.armor.feet",
	Hotbar = "slot.hotbar",
	Inventory = "slot.inventory",
	MobChest = "slot.chest", // Donkeys, Mules, Llamas
	Armor = "slot.armor", // Used for horse armor
	Saddle = "slot.saddle", // Used for horses, llamas (carpet), donkeys, etc.
}

export const SLOT_DATA_KEY_COUNT_MAX: number = 3;
export const SLOT_DATA_KEY_COUNT_MIN: number = 1;
export interface SlotData {
	name: SlotName;
	id?: number;
	replaceItem?: boolean;
}
export const SlotDataKeys = ["name", "id", "replaceItem"];

export type ItemDurability = number | "unbreakable";

export const ITEM_DATA_KEY_COUNT_MAX: number = 7; // +1 once potionType is added, +1 once mojang fixes dyeable component. (Bug tracker MCPE-237577 and MCPE-232617)
export const ITEM_DATA_KEY_COUNT_MIN: number = 2;
export interface ItemData {
	typeId: string;
	amount: number;
	lockMode?: ItemLockMode;
	nameTag?: string;
	// Must be less than the item's max durability, or the str "unbreakable" to for infinite durability
	durability?: ItemDurability;
	// Dyeable component simply doesn't exist on vanilla items.
	// dye?: RGB;
	// potionType?: Figure out later;
	enchants?: EnchantData[];
	slot?: SlotData;
	keepOnDeath?: boolean;
	canPlaceOn?: string[];
	canDestroy?: string[];
}
export const ItemDataKeys = [
	"typeId",
	"amount",
	"lockMode",
	"nameTag",
	"durability",
	"enchants",
	"slot",
	"keepOnDeath",
	"canPlaceOn",
	"canDestroy",
];
export const ItemDataDefaultAmount: number = 1;
// Matches max amount in vanilla /give
export const ItemDataMaxAmount: number = 32767;
