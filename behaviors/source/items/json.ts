import {
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	type Enchantment,
	ItemStack,
	type Vector3,
} from "@minecraft/server";
import type { GivexJson } from "../commands/utils/json";
import { getDataValueItem } from "./dataValues";
import { setDurability } from "./durability";
import { applyEnchants } from "./enchants";

export interface GetItemFromJsonResult {
	commandResult: CustomCommandResult;
	item: ItemStack | null;
}
export function getItemFromJson(
	originDimension: Dimension,
	originLocation: Vector3,
	json: GivexJson,
	enchants?: Enchantment[],
): GetItemFromJsonResult {
	let item: ItemStack;
	if (json.data === null || json.data === 0) {
		item = new ItemStack(json.typeId);
	} else {
		const result: ItemStack | null = getDataValueItem(
			json.typeId,
			json.data,
			originDimension,
			originLocation,
		);
		if (result === null) {
			return {
				commandResult: {
					message: "Unable to get data value item.",
					status: CustomCommandStatus.Failure,
				},
				item: null,
			};
		}
		item = result;
	}
	if (json.nameTag !== null) {
		item.nameTag = json.nameTag;
	}
	if (json.lockMode !== null) {
		item.lockMode = json.lockMode;
	}
	if (json.keepOnDeath !== null) {
		item.keepOnDeath = json.keepOnDeath;
	}
	if (json.canPlaceOn !== null) {
		item.setCanPlaceOn(json.canPlaceOn);
	}
	if (json.canDestroy !== null) {
		item.setCanDestroy(json.canDestroy);
	}
	if (json.durability !== null) {
		setDurability(item, json.durability);
	}
	if (enchants !== undefined) {
		const invalidIndex: number | null = applyEnchants(enchants, item);
		if (invalidIndex !== null) {
			return {
				commandResult: {
					message: `Unable to apply enchant "${enchants[invalidIndex]?.type.id}"`,
					status: CustomCommandStatus.Failure,
				},
				item: item,
			};
		}
	}
	return {
		commandResult: {
			status: CustomCommandStatus.Success,
		},
		item: item,
	};
}
