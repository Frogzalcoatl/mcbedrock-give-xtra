import {
	type CustomCommandResult,
	CustomCommandStatus,
	type Enchantment,
	ItemLockMode,
	type ItemType,
	ItemTypes,
} from "@minecraft/server";
import { MAX_AMOUNT, MAX_NAMETAG_LENGTH } from "../../constants";
import { SlotName } from "../../items/slot";
import type { GivexJson } from "./json";
import { getEnchantsFromList, validBlockTypes } from "./lists";

export interface GivexValidationResult {
	commandResult: CustomCommandResult;
	enchants?: Enchantment[];
}

export function validateGivex(json: GivexJson): GivexValidationResult {
	const result: GivexValidationResult = {
		commandResult: {
			status: CustomCommandStatus.Failure,
		},
	};
	if (json.typeId.indexOf(":") === -1) {
		json.typeId = `minecraft:${json.typeId}`;
	}
	const itemType: ItemType | undefined = ItemTypes.get(json.typeId);
	if (itemType === undefined) {
		result.commandResult.message = `Invalid typeId "${json.typeId}"`;
		return result;
	}
	if (json.amount <= 0 || json.amount > MAX_AMOUNT) {
		result.commandResult.message = `Amount must be within range 0-${MAX_AMOUNT}.`;
		return result;
	}
	if (json.nameTag !== undefined && json.nameTag.length > MAX_NAMETAG_LENGTH) {
		result.commandResult.message = `Nametag cannot exceed ${MAX_NAMETAG_LENGTH} characters.`;
		return result;
	}
	if (json.data !== undefined && json.data < 0) {
		result.commandResult.message = `Invalid data value "${json.data}"`;
		return result;
	}
	if (json.lockMode !== undefined && !Object.values(ItemLockMode).includes(json.lockMode)) {
		result.commandResult = {
			message: `Invalid lock mode "${json.lockMode}". Valid values: ${Object.values(ItemLockMode)}`,
			status: CustomCommandStatus.Failure,
		};
		return result;
	}
	if (json.canPlaceOn !== undefined) {
		const invalidIndex: number | undefined = validBlockTypes(json.canPlaceOn);
		if (invalidIndex !== undefined) {
			result.commandResult.message = `Invalid canPlaceOn at "${json.canPlaceOn[invalidIndex]}"`;
			return result;
		}
	}
	if (json.canDestroy !== undefined) {
		const invalidIndex: number | undefined = validBlockTypes(json.canDestroy);
		if (invalidIndex !== undefined) {
			result.commandResult.message = `Invalid canDestroy at "${json.canDestroy[invalidIndex]}"`;
			return result;
		}
	}
	if (json.durability !== undefined && typeof json.durability === "number") {
		if (json.durability < 0) {
			result.commandResult.message = `Durability must be a non negative integer`;
			return result;
		}
	}
	if (json.enchants !== undefined) {
		const enchantResult: number | Enchantment[] = getEnchantsFromList(json.enchants);
		if (typeof enchantResult === "number") {
			const invalidIndex = enchantResult;
			result.commandResult.message = `Invalid enchant value at "${json.enchants[invalidIndex]}"`;
			return result;
		} else {
			result.enchants = enchantResult;
		}
	}
	if (json.slot !== undefined && !Object.values(SlotName).includes(json.slot as SlotName)) {
		result.commandResult.message = `Invalid slot "${json.slot}"\nValid values:\n${Object.values(SlotName).join("\n")}`;
		return result;
	}
	if (json.slotId !== undefined && json.slotId < 0) {
		result.commandResult.message = "Slot id must be a non negative integer.";
		return result;
	}
	if (
		json.replaceMode !== undefined &&
		json.replaceMode !== "keep" &&
		json.replaceMode !== "destroy"
	) {
		result.commandResult.message = `Invalid replace mode "${json.replaceMode}"`;
		return result;
	}
	result.commandResult.status = CustomCommandStatus.Success;
	return result;
}
