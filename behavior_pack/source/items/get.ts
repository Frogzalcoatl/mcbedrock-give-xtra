import {
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	type Enchantment,
	type ItemLockMode,
	ItemStack,
	type ItemType,
	type Vector3,
} from "@minecraft/server";
import type { GivexJson } from "../commands/params/json";
import { getDataValueItem } from "./dataValues";
import { setDurability } from "./durability";
import { applyEnchants } from "./enchants";

export interface GetItemStackResult {
	commandResult: CustomCommandResult;
	item: ItemStack | undefined;
}

export function getItemFromJson(
	originDimension: Dimension,
	originLocation: Vector3,
	json: GivexJson,
	enchants?: Enchantment[],
): GetItemStackResult {
	let item: ItemStack;
	if (json.data !== undefined && json.data !== 0) {
		const result: ItemStack | undefined = getDataValueItem(
			json.typeId,
			json.data,
			originDimension,
			originLocation,
		);
		if (result === undefined) {
			return {
				commandResult: {
					message: "Unable to get data value item.",
					status: CustomCommandStatus.Failure,
				},
				item: undefined,
			};
		}
		item = result;
	} else {
		item = new ItemStack(json.typeId);
	}
	if (json.nameTag !== undefined) {
		item.nameTag = json.nameTag;
	}
	if (json.lockMode !== undefined) {
		item.lockMode = json.lockMode;
	}
	if (json.keepOnDeath !== undefined) {
		item.keepOnDeath = json.keepOnDeath;
	}
	if (json.canPlaceOn !== undefined) {
		item.setCanPlaceOn(json.canPlaceOn);
	}
	if (json.canDestroy !== undefined) {
		item.setCanDestroy(json.canDestroy);
	}
	if (json.durability !== undefined) {
		setDurability(item, json.durability);
	}
	if (enchants !== undefined) {
		const invalidIndex: number | undefined = applyEnchants(enchants, item);
		if (invalidIndex !== undefined) {
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
