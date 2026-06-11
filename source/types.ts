import type { ItemLockMode, Player } from "@minecraft/server";

export interface BooleanWithMessage {
	bool: boolean;
	message: string;
}

export type ItemDurability = number | "unbreakable";

export const EnchantDataKeyCount: number = 2;
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

export const SlotDataKeyCountMax: number = 3;
export const SlotDataKeyCountMin: number = 1;
export interface SlotData {
	name: SlotName;
	id?: number;
	replaceItem?: boolean;
}
export const SlotDataKeys = ["name", "id", "replaceItem"];

/* The following item components are not supported due to scripting limitations:
	Tipped arrow effects
	npc spawn eggs (The only egg that still uses a data value for some reason)
	Filled map ids
	Firework rocket types
*/

export const ItemDataKeyCountMax: number = 7; // +1 once potionType is added, +1 once mojang fixes dyeable component. (Bug tracker MCPE-237577 and MCPE-232617)
export const ItemDataKeyCountMin: number = 2;
export interface ItemData {
	typeId: string;
	amount: number;
	lockMode?: ItemLockMode;
	nameTag?: string;
	// Must be less than the item's max durability, or the str "unbreakable" to for infinite durability
	durability?: ItemDurability;
	// Dyeable component simply doesn't exist on vanilla items.
	// dye?: RGB;
	enchants?: EnchantData[];
	slot?: SlotData;
	potionType?: string;
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
	"potionType",
	"keepOnDeath",
	"canPlaceOn",
	"canDestroy",
];
export const ItemDataDefaultAmount: number = 1;
// Matches max amount in vanilla /give
export const ItemDataMaxAmount: number = 32767;

export interface FormButton {
	addStyling: boolean;
	callback: (viewer: Player, itemData?: ItemData) => Promise<void>;
	iconPath?: string;
	itemData?: ItemData;
	text: string;
	type: "button";
}

export interface FormTextComponent {
	type: "body" | "header" | "label" | "title";
	text: string;
}

export interface FormDividerComponent {
	type: "divider";
}

export type FormComponent = FormButton | FormTextComponent | FormDividerComponent;

export interface Form {
	title: string;
	components: FormComponent[];
}
