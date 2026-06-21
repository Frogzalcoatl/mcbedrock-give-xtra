export interface BooleanWithMessage {
	bool: boolean;
	message: string;
}

export type ItemDurability = number | "unbreakable";

export interface EnchantData {
	id: string;
	level: number;
}
export const EnchantDataKeys: string[] = ["id", "level"];
export const EnchantDataLevelDefault: number = 1;

// Based on /replaceitem command slots.
// Excluding slot.armor.body. Used for wolf armor but cannot be accessed.
// Excluding slot.equippable. I think its for custom items but I'm not sure how it works. Might come back to this.
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
	Armor = "slot.armor", // Horse armor
	Saddle = "slot.saddle", // Horses, llamas (carpet), donkeys, etc.
	EndChest = "slot.endchest",
}

export interface SlotData {
	name: string;
	id: number | undefined;
	keepOldItem: boolean;
}
export const SlotDataKeys = ["name", "id", "keepOldItem"];
export const SlotDataKeepOldItemDefault: boolean = false;
export const SlotDataNameDefault: SlotName = SlotName.Inventory;

// As of MC v26.21, there's no official way to access tipped arrows besides command data values
// This array is in order of data value starting at 6 = night_vision
export const ArrowTypeStartingDataValue: number = 6;
export const ArrowTypes: string[] = [
	"night_vision",
	"long_night_vision",
	"invisibility",
	"long_invisibility",
	"leaping",
	"long_leaping",
	"strong_leaping",
	"fire_resistance",
	"long_fire_resistance",
	"swiftness",
	"long_swiftness",
	"strong_swiftness",
	"slowness",
	"long_slowness",
	"water_breathing",
	"long_water_breathing",
	"healing",
	"strong_healing",
	"harming",
	"strong_harming",
	"poison",
	"long_poison",
	"strong_poison",
	"regeneration",
	"long_regeneration",
	"strong_regeneration",
	"strength",
	"long_strength",
	"strong_strength",
	"weakness",
	"long_weakness",
	"decay",
	"turtle_master",
	"long_turtle_master",
	"strong_turtle_master",
	"slow_falling",
	"long_slow_falling",
	"strong_slowness",
	"wind_charging",
	"weaving",
	"oozing",
	"infestation",
];

// index matches command data value starting at white = 0
export const BedColors: string[] = [
	"white",
	"orange",
	"magenta",
	"light_blue",
	"yellow",
	"lime",
	"pink",
	"gray",
	"light_gray",
	"cyan",
	"purple",
	"blue",
	"brown",
	"green",
	"red",
	"black",
];

/* The following item properties are not supported due to scripting limitations:

	Firework rocket types:
	no way to give with commands or scripting

	Filled maps:
	replaceitem doesnt work with map data values while /give does for some reason.
	Dont want to force a half implementation because of this.
*/

export interface ItemProperties {
	typeId: string;
	amount: number;
	lockMode?: string; // ItemlockMode
	nameTag?: string;
	// Must be less than the item's max durability, or the str "unbreakable" to for infinite durability
	durability?: ItemDurability;
	// Dyeable component simply doesn't exist on vanilla items. (Bug tracker MCPE-237577 and MCPE-232617)
	// dye?: RGB;
	enchants?: EnchantData[];
	slot: SlotData | undefined;
	potionType?: string;
	arrowType?: string;
	bedColor?: string;
	keepOnDeath?: boolean;
	canPlaceOn?: string[];
	canDestroy?: string[];
}
export enum ItemPropertyKeys {
	TypeId = "typeId",
	Amount = "amount",
	LockMode = "lockMode",
	NameTag = "nameTag",
	Durability = "durability",
	Enchants = "enchants",
	Slot = "slot",
	PotionType = "potionType",
	ArrowType = "arrowType",
	BedColor = "bedColor",
	KeepOnDeath = "keepOnDeath",
	CanPlaceOn = "canPlaceOn",
	CanDestroy = "canDestroy",
}
export const ItemPropertyDefaultAmount: number = 1;
// Matches max amount in vanilla /give
export const ItemPropertyMaxAmount: number = 32767;
// 255 is the max item nametag length as stated in index.d.ts. Going by 253 since I automatically add §r to the start of nametag to avoid italicization.
export const MaxNameTagLength: number = 253;

export type CommandType = "givex" | "blockx" | "spawnx";

export const CommandNamespace: string = "givex";
