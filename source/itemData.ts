import {
	EnchantmentSlot,
	EnchantmentTypes,
	EquipmentSlot,
	ItemComponentTypes,
	ItemLockMode,
	ItemStack,
	ItemTypes,
	type RGB,
} from "@minecraft/server";
import type { BooleanWithMessage } from "./types";

const ENCHANT_DATA_KEY_COUNT: number = 2;
interface EnchantData {
	id: string;
	level: number;
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isEnchantData(obj: any): obj is EnchantData {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	return (
		typeof obj.id === "string" &&
		typeof obj.level === "number" &&
		Object.keys(obj).length === ENCHANT_DATA_KEY_COUNT
	);
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isEnchantDataArr(arr: any): arr is EnchantData[] {
	if (typeof arr !== "object" || arr === null || !Array.isArray(arr)) {
		return false;
	}
	for (const value of arr) {
		if (!isEnchantData(value)) {
			return false;
		}
	}
	return true;
}

const SLOT_DATA_KEY_COUNT: number = 3;
interface SlotData {
	name: EquipmentSlot;
	id?: number;
	replaceItem?: boolean;
}

// Players have 36 slots in their inventory, so max id would be 35 (including 0)
const MAX_SLOT_ID: number = 35;

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isSlotData(obj: any): obj is SlotData {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	return (
		Object.values(EquipmentSlot).includes(obj.name) &&
		(obj.id === undefined || typeof obj.id === "number") &&
		(obj.replaceItem === undefined || typeof obj.replaceItem === "boolean") &&
		Object.keys(obj).length === SLOT_DATA_KEY_COUNT
	);
}

const ITEM_DATA_KEY_COUNT: number = 8;
// (10 once potionType is added)
interface ItemData {
	typeId: string;
	amount: number;
	lockMode?: ItemLockMode;
	nameTag?: string;
	// Must be less than the items max durability. Infinity results in infinite durability.
	durability?: number;
	dye?: RGB;
	// potionType: Figure out later;
	enchants?: EnchantData[];
	slot: SlotData;
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isRgb(obj: any): obj is RGB {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	return (
		typeof obj.red === "number" &&
		obj.red >= 0 &&
		obj.red <= 1 &&
		typeof obj.green === "number" &&
		obj.green >= 0 &&
		obj.green <= 1 &&
		typeof obj.blue === "number" &&
		obj.blue >= 0 &&
		obj.blue <= 1 &&
		Object.keys(obj).length === 3
	);
}

// biome-ignore lint/suspicious/noExplicitAny: Type is validated through the function. Any is required here.
function isItemData(obj: any): obj is ItemData {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	return (
		typeof obj.typeId === "string" &&
		typeof obj.amount === "number" &&
		(obj.lockMode === undefined || Object.values(ItemLockMode).includes(obj.lockMode)) &&
		(obj.nameTag === undefined || typeof obj.nameTag === "string") &&
		(obj.durability === undefined || typeof obj.nameTag === "number") &&
		(obj.dye === undefined || isRgb(obj.dye)) &&
		(obj.enchants === undefined || isEnchantDataArr(obj.enchants)) &&
		(obj.slot === undefined || isSlotData(obj.slot)) &&
		Object.keys(obj).length === ITEM_DATA_KEY_COUNT
	);
}

export function parseItemData(str: string): ItemData | undefined {
	const parsedData = JSON.parse(str);
	if (typeof parsedData !== "object" || parsedData === null) {
		return undefined;
	}
	if (isItemData(parsedData)) {
		return parsedData;
	} else {
		return undefined;
	}
}

function isValidItemType(typeId: string): boolean {
	return ItemTypes.get(typeId) !== undefined;
}

const OFFHAND_ITEM_TYPES: string[] = [
	"minecraft:shield",
	"minecraft:totem_of_undying",
	"minecraft:arrow",
	"minecraft:tipped_arrow",
	"minecraft:firework_rocket",
	"minecraft:empty_map",
	"minecraft:filled_map",
	"minecraft:nautilus_shell",
	"minecraft:sparkler",
];

// Works with custom items given they've set up enchants properly. Custom offhand items will not work.
function canEquipInSlot(itemStack: ItemStack, targetSlot: EquipmentSlot): boolean {
	const enchantable = itemStack.getComponent(ItemComponentTypes.Enchantable);
	if (!enchantable) {
		return false;
	}
	const slots = enchantable.slots;
	switch (targetSlot) {
		case EquipmentSlot.Head:
			return (
				slots.includes(EnchantmentSlot.ArmorHead) ||
				slots.includes(EnchantmentSlot.CosmeticHead)
			);
		case EquipmentSlot.Chest:
			return (
				slots.includes(EnchantmentSlot.ArmorTorso) || slots.includes(EnchantmentSlot.Elytra)
			);
		case EquipmentSlot.Legs:
			return slots.includes(EnchantmentSlot.ArmorLegs);
		case EquipmentSlot.Feet:
			return slots.includes(EnchantmentSlot.ArmorFeet);
		case EquipmentSlot.Mainhand:
			return true;
		case EquipmentSlot.Offhand:
			return OFFHAND_ITEM_TYPES.includes(itemStack.typeId);
		default:
			return false;
	}
}

export function isValidItemData(data: ItemData): BooleanWithMessage {
	if (!isValidItemType(data.typeId)) {
		return {
			bool: false,
			message: "Invalid typeId",
		};
	}
	// Not caring about max stack sizes since I'll be using a function that gives multiple stacks of items.
	if (data.amount <= 0 || !Number.isInteger(data.amount)) {
		return {
			bool: false,
			message: "Invalid amount, must be a positve integer",
		};
	}
	if (data.lockMode && !Object.values(ItemLockMode).includes(data.lockMode)) {
		return {
			bool: false,
			message: "Invalid lock mode",
		};
	}
	// Skipping data.nametag. A string is a string nothing to check there.
	const itemStack = new ItemStack(data.typeId);
	if (data.durability) {
		const durabilityComponent = itemStack.getComponent(ItemComponentTypes.Durability);
		if (durabilityComponent === undefined) {
			return {
				bool: false,
				message: "Cannot apply durability to selected item",
			};
		}
		// Infinity represents unbreakable items.
		if (
			(!Number.isInteger(data.durability) || data.durability <= 0) &&
			data.durability !== Infinity
		) {
			return {
				bool: false,
				message: "Durability must be a positive integer or Infinity",
			};
		}
		if (durabilityComponent.maxDurability < data.durability) {
			return {
				bool: false,
				message: `Durability cannot exceed max for this item (${durabilityComponent.maxDurability})`,
			};
		}
	}
	if (data.dye) {
		if (
			data.dye.red < 0 ||
			data.dye.red > 1 ||
			data.dye.green < 0 ||
			data.dye.green > 1 ||
			data.dye.blue < 0 ||
			data.dye.blue > 1
		) {
			return {
				bool: false,
				message: `Dye must include three values between 0 and 1.\nEx: "dye":{"red":0,"blue":1,"green":0.5}`,
			};
		}
	}
	if (data.enchants) {
		const enchantableComonent = itemStack.getComponent(ItemComponentTypes.Enchantable);
		if (enchantableComonent === undefined) {
			return {
				bool: false,
				message: "Cannot apply enchants to selected item",
			};
		}
		for (const enchant of data.enchants) {
			const type = EnchantmentTypes.get(enchant.id);
			if (type === undefined) {
				return {
					bool: false,
					message: `Invalid enchantment id ${enchant.id}`,
				};
			}
			if (enchant.level <= 0 || enchant.level > type.maxLevel) {
				return {
					bool: false,
					message: `Invalid enchantment level for ${enchant.id}. Max level is ${type.maxLevel}`,
				};
			}
			if (!enchantableComonent.canAddEnchantment({ level: enchant.level, type: type })) {
				return {
					bool: false,
					message: `${enchant.id} cannot be applied to ${data.typeId}`,
				};
			}
		}
	}
	if (data.slot) {
		if (!canEquipInSlot(itemStack, data.slot.name)) {
			return {
				bool: false,
				message: `${data.typeId} cannot be placed in ${data.slot}`,
			};
		}
		if (
			data.slot.id &&
			(!Number.isInteger(data.slot.id) || data.slot.id > MAX_SLOT_ID || data.slot.id < 0)
		) {
			return {
				bool: false,
				message: `Slot id must be an integer between 0 and 35`,
			};
		}
		// data.slot.replaceItem is a boolean. Nothing to check there.
	}
	return {
		bool: true,
		message: "ItemData is valid",
	};
}
