import {
	type CustomCommandResult,
	CustomCommandStatus,
	type Enchantment,
	ItemLockMode,
	type ItemType,
	ItemTypes,
} from "@minecraft/server";
import { MAX_AMOUNT, MAX_DATA, MAX_NAMETAG_LENGTH } from "../../constants";
import { SlotName } from "../../items/slot";
import type { GivexJson } from "./json";
import { getEnchantsFromList, validBlockTypes } from "./lists";

export interface GivexValidationResult {
	commandResult: CustomCommandResult;
	enchants: Enchantment[] | null;
}

export function validateGivex(json: GivexJson): GivexValidationResult {
	const result: GivexValidationResult = {
		commandResult: {
			status: CustomCommandStatus.Failure,
		},
		enchants: null,
	};
	if (json.typeId.indexOf(":") === -1) {
		json.typeId = `minecraft:${json.typeId}`;
	}
	const itemType: ItemType | undefined = ItemTypes.get(json.typeId);
	if (itemType === undefined) {
		result.commandResult.message = `Invalid typeId "${json.typeId}"`;
		return result;
	}
	if (
		json.amount <= 0 ||
		json.amount > MAX_AMOUNT ||
		!Number.isFinite(json.amount) ||
		!Number.isInteger(json.amount)
	) {
		result.commandResult.message = `Amount must be an integer within range 0-${MAX_AMOUNT}.`;
		return result;
	}
	if (json.nameTag !== null && json.nameTag.length > MAX_NAMETAG_LENGTH) {
		result.commandResult.message = `Nametag cannot exceed ${MAX_NAMETAG_LENGTH} characters.`;
		return result;
	}
	if (
		json.data !== null &&
		(json.data < 0 ||
			json.data > MAX_DATA ||
			!Number.isFinite(json.amount) ||
			!Number.isInteger(json.amount))
	) {
		result.commandResult.message = `Invalid data value "${json.data}"`;
		return result;
	}
	if (json.lockMode !== null && !Object.values(ItemLockMode).includes(json.lockMode)) {
		result.commandResult.message = `Invalid lock mode "${json.lockMode}". Valid values: ${Object.values(ItemLockMode).join(", ")}`;
		return result;
	}
	if (json.canPlaceOn !== null) {
		const invalidIndex: number | null = validBlockTypes(json.canPlaceOn);
		if (invalidIndex !== null) {
			result.commandResult.message = `Invalid canPlaceOn at "${json.canPlaceOn[invalidIndex]}"`;
			return result;
		}
	}
	if (json.canDestroy !== null) {
		const invalidIndex: number | null = validBlockTypes(json.canDestroy);
		if (invalidIndex !== null) {
			result.commandResult.message = `Invalid canDestroy at "${json.canDestroy[invalidIndex]}"`;
			return result;
		}
	}
	if (json.durability !== null && typeof json.durability === "number") {
		if (json.durability < 0) {
			result.commandResult.message = `Durability must be a non negative integer`;
			return result;
		}
	}
	if (json.enchants !== null) {
		const enchantResult: number | Enchantment[] = getEnchantsFromList(json.enchants);
		if (typeof enchantResult === "number") {
			const invalidIndex = enchantResult;
			result.commandResult.message = `Invalid enchant value at "${json.enchants[invalidIndex]}"`;
			return result;
		} else {
			result.enchants = enchantResult;
		}
	}
	if (json.slot !== null && !Object.values(SlotName).includes(json.slot as SlotName)) {
		result.commandResult.message = `Invalid slot "${json.slot}"\nValid values:\n${Object.values(SlotName).join("\n")}`;
		return result;
	}
	if (json.slotId !== null && json.slotId < 0) {
		result.commandResult.message = "Slot id must be a non negative integer.";
		return result;
	}
	if (
		json.replaceMode !== null &&
		json.replaceMode !== "keep" &&
		json.replaceMode !== "destroy"
	) {
		result.commandResult.message = `Invalid replace mode "${json.replaceMode}"`;
		return result;
	}
	result.commandResult.status = CustomCommandStatus.Success;
	return result;
}
