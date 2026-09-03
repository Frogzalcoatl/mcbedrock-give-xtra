import {
	CommandPermissionLevel,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandRegistry,
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	type Entity,
	type ItemType,
	system,
	type Vector3,
} from "@minecraft/server";
import { PACK_NAMESPACE } from "../../constants";
import { giveItemToEntity } from "../../containers";
import { type GetItemStackResult, getItemFromJson } from "../../items/get";
import { afterTickCommandResultHandler } from "../afterTickResultHandler";
import { type GivexJson, parseGivexJson } from "../params/json";
import { getDimensionFromOrigin, getLocationFromOrigin } from "../params/origin";
import { type GivexValidationResult, validateGivex } from "../params/validate";

export function registerCommandGivex(registry: CustomCommandRegistry): void {
	registry.registerCommand(
		{
			description: "Give items with special properties.",
			mandatoryParameters: [
				{ name: "target", type: CustomCommandParamType.EntitySelector },
				{ name: "itemName", type: CustomCommandParamType.ItemType },
				{ name: "json", type: CustomCommandParamType.String },
			],
			name: `${PACK_NAMESPACE}:givex`,
			permissionLevel: CommandPermissionLevel.GameDirectors,
		},
		(
			origin: CustomCommandOrigin,
			target: Entity[],
			itemType: ItemType,
			jsonStr: string,
		): CustomCommandResult => {
			if (target.length === 0) {
				return {
					message: "No valid target.",
					status: CustomCommandStatus.Failure,
				};
			}
			let json: GivexJson;
			try {
				json = parseGivexJson(jsonStr, itemType.id);
			} catch (error) {
				let message: string = "Invalid type in json.";
				if (error instanceof Error) {
					message = error.message;
				}
				return {
					message: message,
					status: CustomCommandStatus.Failure,
				};
			}
			const paramsResult: GivexValidationResult = validateGivex(json);
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
				const itemResult: GetItemStackResult = getItemFromJson(
					dimension,
					location,
					json,
					paramsResult.enchants,
				);
				if (itemResult.item !== undefined) {
					for (const entity of target) {
						giveItemToEntity(
							entity,
							itemResult.item,
							json.amount,
							json.slot,
							json.slotId,
							json.replaceMode ?? "destroy",
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
