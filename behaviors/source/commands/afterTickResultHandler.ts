import {
	type CustomCommandOrigin,
	type CustomCommandResult,
	CustomCommandStatus,
	type Player,
	world,
} from "@minecraft/server";
import { getPlayerFromOrigin } from "./params/origin";

export function afterTickCommandResultHandler(
	origin: CustomCommandOrigin,
	result: CustomCommandResult,
): void {
	if (!result.message || !world.gameRules.sendCommandFeedback) {
		return;
	}
	if (result.status === CustomCommandStatus.Failure) {
		result.message = `§c${result.message}`;
	}
	const player: Player | null = getPlayerFromOrigin(origin);
	if (player !== null) {
		player.sendMessage(result.message);
	}
}
