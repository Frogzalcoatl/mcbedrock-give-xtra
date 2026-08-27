import {
	CommandPermissionLevel,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandRegistry,
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	type Entity,
	type ItemLockMode,
	type ItemType,
	system,
	type Vector3,
} from "@minecraft/server";
import { PACK_NAMESPACE } from "../constants";
import { giveItemToEntity } from "../containers";
import { type GetItemStackResult, getItemStack } from "../items/get";
import type { SlotName } from "../items/slot";
import { afterTickCommandResultHandler } from "./afterTickResultHandler";
import { commandEnums } from "./params/enums";
import { getDimensionFromOrigin, getLocationFromOrigin } from "./params/origin";
import { type ValidateParamsResult, validateParams } from "./params/validate";

export function registerGivex(registry: CustomCommandRegistry): void {
	registry.registerCommand(
		{
			description: "Give items with special properties.",
			mandatoryParameters: [
				{ name: "target", type: CustomCommandParamType.EntitySelector },
				{ name: "itemName", type: CustomCommandParamType.ItemType },
			],
			name: `${PACK_NAMESPACE}:givex2`,
			optionalParameters: [
				{ name: "amount", type: CustomCommandParamType.Integer },
				{ name: "nameTag", type: CustomCommandParamType.String },
				{ name: commandEnums.lockMode, type: CustomCommandParamType.Enum },
				{ name: "data", type: CustomCommandParamType.Integer },
				{ name: "keepOnDeath", type: CustomCommandParamType.Boolean },
				{ name: "canPlaceOn", type: CustomCommandParamType.String },
				{ name: "canDestroy", type: CustomCommandParamType.String },
				{ name: commandEnums.durability, type: CustomCommandParamType.Enum },
				{ name: "enchants", type: CustomCommandParamType.String },
				{ name: commandEnums.slot, type: CustomCommandParamType.Enum },
				{ name: "slotId", type: CustomCommandParamType.Integer },
				{ name: commandEnums.replaceMode, type: CustomCommandParamType.Enum },
			],
			permissionLevel: CommandPermissionLevel.GameDirectors,
		},
		(
			origin: CustomCommandOrigin,
			target: Entity[],
			itemType: ItemType,
			amount: number = 1,
			nameTag?: string,
			lockMode?: ItemLockMode,
			data: number = 0,
			keepOnDeath?: boolean,
			canPlaceOn?: string,
			canDestroy?: string,
			durability?: string,
			enchants?: string,
			slot?: SlotName,
			slotId?: number,
			replaceMode?: string,
		): CustomCommandResult => {
			if (target.length === 0) {
				return {
					message: "No valid target",
					status: CustomCommandStatus.Failure,
				};
			}
			const paramsResult: ValidateParamsResult = validateParams(
				amount,
				nameTag,
				lockMode,
				data,
				canPlaceOn,
				canDestroy,
				durability,
				enchants,
				slot,
				slotId,
				replaceMode,
			);
			if (paramsResult.commandResult.status === CustomCommandStatus.Failure) {
				return paramsResult.commandResult;
			}
			const dimension: Dimension | null = getDimensionFromOrigin(origin);
			if (dimension === null) {
				return {
					message: "Unable to get dimension from origin.",
					status: CustomCommandStatus.Failure,
				};
			}
			const location: Vector3 | null = getLocationFromOrigin(origin);
			if (location === null) {
				return {
					message: "Unable to get location from origin.",
					status: CustomCommandStatus.Failure,
				};
			}
			system.run(() => {
				const itemResult: GetItemStackResult = getItemStack(
					dimension,
					location,
					itemType,
					nameTag,
					lockMode,
					data,
					keepOnDeath,
					paramsResult.canPlaceOn,
					paramsResult.canDestroy,
					paramsResult.durability,
					paramsResult.enchants,
				);
				if (itemResult.item !== undefined) {
					for (const entity of target) {
						giveItemToEntity(
							entity,
							itemResult.item,
							amount,
							slot,
							slotId,
							paramsResult.replaceMode ?? "destroy",
						);
					}
				}
				if (itemResult.commandResult.status === CustomCommandStatus.Failure) {
					afterTickCommandResultHandler(origin, itemResult.commandResult);
				} else {
					afterTickCommandResultHandler(origin, {
						message: `Gave ${itemType.id} to target(s)`,
						status: CustomCommandStatus.Success,
					});
				}
			});
			return {
				status: CustomCommandStatus.Success,
			};
		},
	);
}
