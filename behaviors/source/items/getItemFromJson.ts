import {
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	type Enchantment,
	ItemStack,
	type ItemType,
	type Vector3,
} from "@minecraft/server";
import type { GivexJson } from "../commands/utils/json";
import { getDataValueItem } from "./dataValues";
import { setDurability } from "./durability";
import { applyEnchants } from "./enchants";
import { containerSlots } from "./slot";

export interface GetItemFromJsonResult {
	commandResult: CustomCommandResult;
	item: ItemStack | null;
}
export function getItemFromJson(
	originDimension: Dimension,
	originLocation: Vector3,
	json: GivexJson,
	itemType: ItemType,
	amount: number,
	data: number,
	enchants?: Enchantment[],
): GetItemFromJsonResult {
	let item: ItemStack;
	if (data === 0) {
		item = new ItemStack(itemType);
	} else {
		item = getDataValueItem(itemType.id, data, originDimension, originLocation);
	}
	if (json.slot !== null) {
		if (amount > item.maxAmount && !containerSlots.includes(json.slot)) {
			return {
				commandResult: {
					message: `Amount cannot exceed max stack size (${item.maxAmount}) when slot ${json.slot} is selected`,
					status: CustomCommandStatus.Failure,
				},
				item: null,
			};
		}
	}
	if (json.slotId !== null) {
		if (amount > item.maxAmount) {
			return {
				commandResult: {
					message: `Amount cannot exceed max stack size (${item.maxAmount}) when a slot id is specified`,
					status: CustomCommandStatus.Failure,
				},
				item: null,
			};
		}
		item.amount = amount;
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
	if (json.lore) {
		item.setLore(json.lore);
	}
	if (enchants !== undefined) {
		const invalidIndex: number | null = applyEnchants(enchants, item);
		if (invalidIndex !== null) {
			return {
				commandResult: {
					message: `Could not apply enchant "${enchants[invalidIndex]?.type.id}"`,
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
