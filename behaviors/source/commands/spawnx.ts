import {
	CommandPermissionLevel,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandRegistry,
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	type ItemStack,
	type ItemType,
	system,
	type Vector3,
} from "@minecraft/server";
import { PACK_NAMESPACE } from "../constants";
import { spawnx } from "../items/container";
import { getDataValueItem } from "../items/dataValues";
import { type GetItemFromJsonResult, getItemFromJson } from "../items/getItemFromJson";
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
			optionalParameters: [
				{ name: "amount", type: CustomCommandParamType.Integer },
				{ name: "data", type: CustomCommandParamType.Integer },
				{ name: "json", type: CustomCommandParamType.String },
			],
			permissionLevel: CommandPermissionLevel.GameDirectors,
		},
		(
			origin: CustomCommandOrigin,
			at: Vector3,
			item: ItemType,
			amount: number = 1,
			data: number = 0,
			jsonStr?: string,
		): CustomCommandResult => {
			const dimension: Dimension | null = getDimensionFromOrigin(origin);
			if (dimension === null) {
				return {
					message: "Could not get dimension from origin",
					status: CustomCommandStatus.Failure,
				};
			}
			if (jsonStr === undefined) {
				system.run(() => {
					const itemStack: ItemStack = getDataValueItem(item.id, data, dimension, at);
					dimension.spawnItem(itemStack, at);
					sendCommandFeedbackToOrigin(origin, spawnx(dimension, at, itemStack, amount));
				});
				return {
					status: CustomCommandStatus.Success,
				};
			}
			const parseResult: GivexJsonParseResult = parseGivexJson(jsonStr);
			if (parseResult.json === null) {
				return {
					message: parseResult.message,
					status: CustomCommandStatus.Failure,
				};
			}
			const json: GivexJson = parseResult.json;
			const validation: GivexValidationResult = validateGivex(json, item, amount, data);
			if (validation.commandResult.status === CustomCommandStatus.Failure) {
				return validation.commandResult;
			}
			system.run(() => {
				const itemResult: GetItemFromJsonResult = getItemFromJson(
					dimension,
					at,
					json,
					item,
					amount,
					data,
					validation.enchants ?? undefined,
				);
				let result: CustomCommandResult = itemResult.commandResult;
				if (itemResult.item !== null) {
					result = spawnx(dimension, at, itemResult.item, amount);
				}
				sendCommandFeedbackToOrigin(origin, result);
			});
			return {
				status: CustomCommandStatus.Success,
			};
		},
	);
}
