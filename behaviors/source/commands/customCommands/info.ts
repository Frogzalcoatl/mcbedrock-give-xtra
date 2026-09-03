import {
	CommandPermissionLevel,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandRegistry,
	type CustomCommandResult,
	CustomCommandStatus,
	type ItemType,
	type Player,
	system,
} from "@minecraft/server";
import { PACK_NAMESPACE } from "../../constants";
import { formGetStarted } from "../../forms/getStarted/getStarted";
import { formInfo } from "../../forms/info";
import { getPlayerFromOrigin } from "../params/origin";

export function registerCommandInfo(registry: CustomCommandRegistry): void {
	registry.registerCommand(
		{
			description: "Givex info.",
			name: `${PACK_NAMESPACE}:info`,
			optionalParameters: [{ name: "itemName", type: CustomCommandParamType.ItemType }],
			permissionLevel: CommandPermissionLevel.Admin,
		},
		(origin: CustomCommandOrigin, item?: ItemType): CustomCommandResult => {
			const player: Player | null = getPlayerFromOrigin(origin);
			if (player === null) {
				return {
					status: CustomCommandStatus.Failure,
				};
			}
			if (item !== undefined) {
				system.run(() => formGetStarted(player, item.id));
			} else {
				system.run(() => formInfo(player));
			}
			return {
				status: CustomCommandStatus.Success,
			};
		},
	);
}
