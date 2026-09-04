import {
	type Block,
	BlockComponentTypes,
	type BlockInventoryComponent,
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

export function registerCommandBlockx(registry: CustomCommandRegistry): void {
	registry.registerCommand(
		{
			description: "Give items with special properties to blocks.",
			mandatoryParameters: [
				{ name: "at", type: CustomCommandParamType.Location },
				{ name: "itemName", type: CustomCommandParamType.ItemType },
			],
			name: `${PACK_NAMESPACE}:blockx`,
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
			const block: Block | undefined = dimension.getBlock(at);
			if (block === undefined) {
				return {
					message: `No valid block at ${vector3ToString(at)}.`,
					status: CustomCommandStatus.Failure,
				};
			}
			const inventory: BlockInventoryComponent | undefined = block.getComponent(
				BlockComponentTypes.Inventory,
			);
			if (inventory === undefined) {
				return {
					message: `Block at ${vector3ToString(at)} does not have an inventory.`,
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
					blockx(
						block,
						itemResult.item,
						json.amount,
						json.slotId,
						json.replaceMode ?? undefined,
					);
				}
				if (itemResult.commandResult.status === CustomCommandStatus.Failure) {
					sendCommandFeedbackToOrigin(origin, itemResult.commandResult);
				} else {
					sendCommandFeedbackToOrigin(origin, {
						message: `Gave ${item.id} * ${json.amount} to ${block.typeId} at ${vector3ToString(at)}`,
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
