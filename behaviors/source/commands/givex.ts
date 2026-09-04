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
import { PACK_NAMESPACE } from "../constants";
import { giveItemToEntity } from "../items/container";
import { type GetItemFromJsonResult, getItemFromJson } from "../items/json";
import {
	type GivexJson,
	type GivexJsonParseResult,
	type GivexValidationResult,
	parseGivexJson,
	validateGivex,
} from "./utils/json";
import {
	getDimensionFromOrigin,
	getLocationFromOrigin,
	sendCommandFeedbackToOrigin,
} from "./utils/origin";

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
			jsonStr: string = "{}",
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
			const parseResult: GivexJsonParseResult = parseGivexJson(jsonStr, item.id);
			if (parseResult.json === null) {
				return {
					message: parseResult.message,
					status: CustomCommandStatus.Failure,
				};
			}
			const json: GivexJson = parseResult.json;
			const validation: GivexValidationResult = validateGivex(json);
			if (validation.commandResult.status === CustomCommandStatus.Failure) {
				return validation.commandResult;
			}
			system.run(() => {
				const itemResult: GetItemFromJsonResult = getItemFromJson(
					dimension,
					location,
					json,
					validation.enchants ?? undefined,
				);
				if (itemResult.item !== null) {
					for (const entity of target) {
						giveItemToEntity(
							entity,
							itemResult.item,
							json.amount,
							json.slot,
							json.slotId,
							json.replaceMode ?? undefined,
						);
					}
				}
				if (itemResult.commandResult.status === CustomCommandStatus.Failure) {
					sendCommandFeedbackToOrigin(origin, itemResult.commandResult);
				} else {
					sendCommandFeedbackToOrigin(origin, {
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
