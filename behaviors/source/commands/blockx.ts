import {
	type Block,
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
import { blockx } from "../items/container";
import { getDataValueItem } from "../items/dataValues";
import { type GetItemFromJsonResult, getItemFromJson } from "../items/getItemFromJson";
import { vector3ToString } from "./utils/beautification";
import {
	type GivexJson,
	type GivexJsonParseResult,
	type GivexValidationResult,
	parseGivexJson,
	validateGivex,
} from "./utils/json";
import { getDimensionFromOrigin, sendCommandFeedbackToOrigin } from "./utils/origin";

export function registerCommandBlockx(registry: CustomCommandRegistry): void {
	registry.registerCommand(
		{
			description: "Give items with special properties to blocks.",
			mandatoryParameters: [
				{ name: "at", type: CustomCommandParamType.Location },
				{ name: "itemName", type: CustomCommandParamType.ItemType },
			],
			name: `${PACK_NAMESPACE}:blockx`,
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
			if (!dimension.isChunkLoaded(at)) {
				return {
					message: "Cannot access block outside of world",
					status: CustomCommandStatus.Failure,
				};
			}
			const block: Block | undefined = dimension.getBlock(at);
			if (block === undefined) {
				return {
					message: `No valid block at ${vector3ToString(at)}`,
					status: CustomCommandStatus.Failure,
				};
			}
			if (jsonStr === undefined) {
				system.run(() => {
					const result: CustomCommandResult = blockx(
						block,
						getDataValueItem(item.id, data, dimension, at),
						amount,
						null,
					);
					sendCommandFeedbackToOrigin(origin, result);
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
					result = blockx(
						block,
						itemResult.item,
						amount,
						json.slotId,
						json.replaceMode ?? undefined,
					);
				}
				sendCommandFeedbackToOrigin(origin, result);
			});
			return {
				status: CustomCommandStatus.Success,
			};
		},
	);
}
