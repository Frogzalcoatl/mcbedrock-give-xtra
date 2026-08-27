import {
	type CustomCommandResult,
	CustomCommandStatus,
	type Enchantment,
	ItemLockMode,
} from "@minecraft/server";
import { MAX_AMOUNT, MAX_NAMETAG_LENGTH } from "../../constants";
import { SlotName } from "../../items/slot";
import { getEnchantsFromList, parseList, validBlockTypes } from "./lists";

export interface ValidateParamsResult {
	commandResult: CustomCommandResult;
	canPlaceOn?: string[];
	canDestroy?: string[];
	enchants?: Enchantment[];
	durability?: number | "unbreakable" | "max";
	replaceMode?: "keep" | "destroy";
}

export function validateParams(
	amount: number,
	nameTag?: string,
	lockMode?: ItemLockMode,
	data: number = 0,
	canPlaceOn?: string,
	canDestroy?: string,
	durability?: string,
	enchants?: string,
	slot?: SlotName,
	slotId?: number,
	replaceMode?: string,
): ValidateParamsResult {
	const result: ValidateParamsResult = {
		commandResult: {
			status: CustomCommandStatus.Success,
		},
	};
	if (amount <= 0 || amount > MAX_AMOUNT) {
		result.commandResult = {
			message: `Amount must be within range 0-${MAX_AMOUNT}.`,
			status: CustomCommandStatus.Failure,
		};
		return result;
	}
	if (nameTag !== undefined && nameTag.length > MAX_NAMETAG_LENGTH) {
		result.commandResult = {
			message: `Nametag cannot exceed ${MAX_NAMETAG_LENGTH} characters.`,
			status: CustomCommandStatus.Failure,
		};
		return result;
	}
	if (lockMode !== undefined && !Object.values(ItemLockMode).includes(lockMode)) {
		result.commandResult = {
			message: `Invalid lock mode "${lockMode}"`,
			status: CustomCommandStatus.Failure,
		};
		return result;
	}
	if (data < 0) {
		result.commandResult = {
			message: `Invalid data value "${data}"`,
			status: CustomCommandStatus.Failure,
		};
		return result;
	}
	if (canPlaceOn !== undefined) {
		result.canPlaceOn = parseList(canPlaceOn);
		const invalidIndex: number | undefined = validBlockTypes(result.canPlaceOn);
		if (invalidIndex !== undefined) {
			result.commandResult = {
				message: `Invalid canPlaceOn at "${result.canPlaceOn[invalidIndex]}"`,
				status: CustomCommandStatus.Failure,
			};
			return result;
		}
	}
	if (canDestroy !== undefined) {
		result.canDestroy = parseList(canDestroy);
		const invalidIndex: number | undefined = validBlockTypes(result.canDestroy);
		if (invalidIndex !== undefined) {
			result.commandResult = {
				message: `Invalid canDestroy at "${result.canDestroy[invalidIndex]}"`,
				status: CustomCommandStatus.Failure,
			};
			return result;
		}
	}
	if (durability !== undefined) {
		if (durability === "unbreakable" || durability === "max") {
			result.durability = durability;
		} else {
			result.durability = parseInt(durability, 10);
			if (Number.isNaN(result.durability)) {
				result.commandResult = {
					message: `Invalid durability "${durability}"`,
					status: CustomCommandStatus.Failure,
				};
				return result;
			}
		}
	}
	if (enchants !== undefined) {
		const enchantList: string[] = parseList(enchants);
		const enchantResult: number | Enchantment[] = getEnchantsFromList(enchantList);
		if (typeof enchantResult === "number") {
			const invalidIndex = enchantResult;
			result.commandResult = {
				message: `Invalid enchant list at "${enchantList[invalidIndex]}"`,
				status: CustomCommandStatus.Failure,
			};
			return result;
		} else {
			result.enchants = enchantResult;
		}
	}
	if (slot !== undefined && !Object.values(SlotName).includes(slot)) {
		result.commandResult = {
			message: `Invalid slot "${slot}"`,
			status: CustomCommandStatus.Failure,
		};
		return result;
	}
	if (slotId !== undefined && slotId < 0) {
		result.commandResult = {
			message: "slotId must be a non negative integer.",
			status: CustomCommandStatus.Failure,
		};
		return result;
	}
	if (replaceMode !== undefined) {
		if (replaceMode === "keep" || replaceMode === "destroy") {
			result.replaceMode = replaceMode;
		} else {
			result.commandResult = {
				message: `Invalid replace mode "${replaceMode}"`,
				status: CustomCommandStatus.Failure,
			};
			return result;
		}
	}
	return result;
}
