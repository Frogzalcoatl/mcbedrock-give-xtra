import {
	CommandPermissionLevel,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandRegistry,
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	type ItemType,
	system,
	type Vector3,
} from "@minecraft/server";
import { PACK_NAMESPACE } from "../constants";
import { spawnx } from "../items/container";
import { type GetItemFromJsonResult, getItemFromJson } from "../items/json";
import { vector3ToString } from "./utils/beautification";
import {
	type GivexJson,
	type GivexJsonParseResult,
	type GivexValidationResult,
	parseGivexJson,
	validateGivex,
} from "./utils/json";
import { getDimensionFromOrigin, sendCommandFeedbackToOrigin } from "./utils/origin";

export function registerCommandSpawnx(registry: CustomCommandRegistry): void {
	registry.registerCommand(
		{
			description: "Spawn items with special properties.",
			mandatoryParameters: [
				{ name: "at", type: CustomCommandParamType.Location },
				{ name: "itemName", type: CustomCommandParamType.ItemType },
			],
			name: `${PACK_NAMESPACE}:spawnx`,
			optionalParameters: [{ name: "json", type: CustomCommandParamType.String }],
			permissionLevel: CommandPermissionLevel.GameDirectors,
		},
		(
			origin: CustomCommandOrigin,
			at: Vector3,
			item: ItemType,
			jsonStr: string = "{}",
		): CustomCommandResult => {
			const dimension: Dimension | null = getDimensionFromOrigin(origin);
			if (dimension === null) {
				return {
					message: "Unable to get dimension from origin.",
					status: CustomCommandStatus.Failure,
				};
			}
			if (!dimension.isChunkLoaded(at)) {
				return {
					message: "Cannot access block outside of world.",
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
					at,
					json,
					validation.enchants ?? undefined,
				);
				if (itemResult.item !== null) {
					spawnx(dimension, at, itemResult.item, json.amount);
				}
				if (itemResult.commandResult.status === CustomCommandStatus.Failure) {
					sendCommandFeedbackToOrigin(origin, itemResult.commandResult);
				} else {
					sendCommandFeedbackToOrigin(origin, {
						message: `Spawned ${item.id} * ${json.amount} at ${vector3ToString(at)}`,
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
