import {
	CommandPermissionLevel,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandRegistry,
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	type Enchantment,
	type Entity,
	ItemStack,
	type ItemType,
	system,
	type Vector3,
} from "@minecraft/server";
import { PACK_NAMESPACE } from "../constants";
import { givex } from "../items/container";
import { type GetItemFromJsonResult, getItemFromJson } from "../items/json";
import { getSelectorName, prettyTypeId } from "./utils/beautification";
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
			jsonStr?: string,
		): CustomCommandResult => {
			if (target.length === 0) {
				return {
					message: "No targets matched selector.",
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
			let json: GivexJson | null = null;
			let enchants: Enchantment[] | null = null;
			if (jsonStr !== undefined) {
				const parseResult: GivexJsonParseResult = parseGivexJson(jsonStr, item.id);
				if (parseResult.json === null) {
					return {
						message: parseResult.message,
						status: CustomCommandStatus.Failure,
					};
				}
				json = parseResult.json;
				const validation: GivexValidationResult = validateGivex(json);
				if (validation.commandResult.status === CustomCommandStatus.Failure) {
					return validation.commandResult;
				}
				enchants = validation.enchants;
			}
			system.run(() => {
				let itemStack: ItemStack | null = null;
				if (json === null) {
					itemStack = new ItemStack(item);
				} else {
					const itemResult: GetItemFromJsonResult = getItemFromJson(
						dimension,
						location,
						json,
						enchants ?? undefined,
					);
					if (itemResult.item === null) {
						sendCommandFeedbackToOrigin(origin, itemResult.commandResult);
						return;
					}
					itemStack = itemResult.item;
				}
				sendCommandFeedbackToOrigin(origin, {
					message: `Gave ${prettyTypeId(item.id)} * ${json?.amount ?? 1} to ${target.reduce((accumulator, current) => `${accumulator}§r, ${getSelectorName(current)}`, "").slice(4)}`,
					status: CustomCommandStatus.Success,
				});
				for (const entity of target) {
					if (!entity.isValid) {
						continue;
					}
					const currentResult: CustomCommandResult = givex(
						entity,
						itemStack,
						json?.amount ?? 1,
						json?.slot ?? undefined,
						json?.slotId,
						json?.replaceMode ?? undefined,
					);
					if (currentResult.status === CustomCommandStatus.Failure) {
						sendCommandFeedbackToOrigin(origin, currentResult);
					}
				}
			});
			return {
				status: CustomCommandStatus.Success,
			};
		},
	);
}
