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
import { type GivexJson, type GivexJsonParseResult, parseGivexJson } from "../params/json";
import { getDimensionFromOrigin, getLocationFromOrigin } from "../params/origin";
import { type GivexValidationResult, validateGivex } from "../params/validate";

export function registerCommandGivex(registry: CustomCommandRegistry): void {
	registry.registerCommand(
		{
			description: "Give items with special properties to entities.",
			mandatoryParameters: [
				{ name: "target", type: CustomCommandParamType.EntitySelector },
				{ name: "itemName", type: CustomCommandParamType.ItemType },
			],
			name: `${PACK_NAMESPACE}:givex`,
			optionalParameters: [{ name: "json", type: CustomCommandParamType.String }],
			permissionLevel: CommandPermissionLevel.GameDirectors,
		},
		(
			origin: CustomCommandOrigin,
			target: Entity[],
			item: ItemType,
			jsonStr: string,
		): CustomCommandResult => {
			if (target.length === 0) {
				return {
					message: "No valid target.",
					status: CustomCommandStatus.Failure,
				};
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
			let json: GivexJson;
			if (jsonStr === undefined) {
				json = {
					amount: 1,
					typeId: item.id,
				};
			} else {
				const parseResult: GivexJsonParseResult = parseGivexJson(jsonStr, item.id);
				if (parseResult.json === null) {
					return {
						message: parseResult.message,
						status: CustomCommandStatus.Failure,
					};
				}
				json = parseResult.json;
			}
			const paramsResult: GivexValidationResult = validateGivex(json);
			if (paramsResult.commandResult.status === CustomCommandStatus.Failure) {
				return paramsResult.commandResult;
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
						message: `Gave ${item.id} * ${json.amount} to target(s)`,
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
