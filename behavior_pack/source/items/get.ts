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
import { getDataValueItem } from "./dataValues";
import { setDurability } from "./durability";
import { applyEnchants } from "./enchants";

export interface GetItemStackResult {
	commandResult: CustomCommandResult;
	item: ItemStack | undefined;
}

export function getItemStack(
	originDimension: Dimension,
	originLocation: Vector3,
	type: ItemType,
	nameTag?: string,
	lockMode?: ItemLockMode,
	data?: number,
	keepOnDeath?: boolean,
	canPlaceOn?: string[],
	canDestroy?: string[],
	durability?: number | "unbreakable" | "max",
	enchants?: Enchantment[],
): GetItemStackResult {
	let item: ItemStack;
	if (data !== undefined && data !== 0) {
		const result: ItemStack | undefined = getDataValueItem(
			type,
			data,
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
		item = new ItemStack(type);
	}
	if (nameTag !== undefined) {
		item.nameTag = nameTag;
	}
	if (lockMode !== undefined) {
		item.lockMode = lockMode;
	}
	if (keepOnDeath !== undefined) {
		item.keepOnDeath = keepOnDeath;
	}
	if (canPlaceOn !== undefined) {
		item.setCanPlaceOn(canPlaceOn);
	}
	if (canDestroy !== undefined) {
		item.setCanDestroy(canDestroy);
	}
	if (durability !== undefined) {
		setDurability(item, durability);
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
