import {
	type CustomCommandOrigin,
	type CustomCommandResult,
	CustomCommandStatus,
	Player,
	world,
} from "@minecraft/server";

export function afterTickCommandResultHandler(
	origin: CustomCommandOrigin,
	result: CustomCommandResult,
): void {
	if (!result.message) {
		return;
	}
	if (result.status === CustomCommandStatus.Failure) {
		result.message = `§c${result.message}`;
	}
	if (origin.sourceEntity instanceof Player && world.gameRules.sendCommandFeedback) {
		origin.sourceEntity.sendMessage(result.message);
	} else if (origin.initiator instanceof Player && world.gameRules.sendCommandFeedback) {
		origin.initiator.sendMessage(result.message);
	}
}
