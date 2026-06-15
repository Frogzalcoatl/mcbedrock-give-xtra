import type {
	Block,
	CustomCommandOrigin,
	DimensionLocation,
	Entity,
	ItemLockMode,
	ItemType,
	Player,
} from "@minecraft/server";

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
export const EnchantDataKeyCount: number = EnchantDataKeys.length;

// Based on /replaceitem command slots.
// Excluding slot.endchest. Cannot be accessed with scripting yet.
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
	Armor = "slot.armor", // Used for horse armor
	Saddle = "slot.saddle", // Used for horses, llamas (carpet), donkeys, etc.
}

export interface SlotData {
	name: SlotName;
	id: number;
	keepOldItem: boolean;
}
export const SlotDataKeys = ["name", "id", "keepOldItem"];
export const SlotDataKeyCount: number = SlotDataKeys.length;
export const SlotDataKeepOldItemDefault: boolean = false;
export const SlotDataIdDefault: number = 0;
export const SlotDataNameDefault: SlotName = SlotName.Inventory;

// As of MC v26.21, there's no official way to access tipped arrows besides item data values
// This array is in order of data value starting at 6 = night_vision
export const ArrowEffectSartingDataValue: number = 6;
export const ArrowEffectTypes: string[] = [
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

// index matches data value starting at white = 0
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

/* The following item components are not supported due to scripting limitations:

	Firework rocket types:
	no way to give with commands or scripting

	Filled maps:
	replaceitem doesnt work with map data values while /give does for some reason.
	Dont want to force half implementation of map ids when slot is undefined only.
*/

export interface ItemData {
	typeId: string;
	amount: number;
	lockMode?: ItemLockMode;
	nameTag?: string;
	// Must be less than the item's max durability, or the str "unbreakable" to for infinite durability
	durability?: ItemDurability;
	// Dyeable component simply doesn't exist on vanilla items. (Bug tracker MCPE-237577 and MCPE-232617)
	// dye?: RGB;
	enchants?: EnchantData[];
	slot?: SlotData;
	potionType?: string;
	arrowType?: string;
	bedColor?: string;
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
	"arrowType",
	"bedColor",
	"keepOnDeath",
	"canPlaceOn",
	"canDestroy",
];
export const ItemDataKeyCountMax: number = ItemDataKeys.length;
export const ItemDataKeyCountMin: number = 2;
export const ItemDataDefaultAmount: number = 1;
// Matches max amount in vanilla /give
export const ItemDataMaxAmount: number = 32767;

export interface GivexContext {
	commandName: "givex" | "blockx" | "spawnx";
	origin: CustomCommandOrigin;
	recievers: Entity[] | Block[] | DimensionLocation[];
	selectorName: string;
	itemType: ItemType;
	itemAmount: number;
	json: string | undefined;
}

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
