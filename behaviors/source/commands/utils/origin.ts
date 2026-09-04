import {
	type CustomCommandOrigin,
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	Player,
	type Vector3,
	world,
} from "@minecraft/server";

export function getPlayerFromOrigin(origin: CustomCommandOrigin): Player | null {
	return origin.initiator instanceof Player
		? origin.initiator
		: origin.sourceEntity instanceof Player
			? origin.sourceEntity
			: null;
}

export function getDimensionFromOrigin(origin: CustomCommandOrigin): Dimension | null {
	const source = origin.sourceBlock ?? origin.sourceEntity ?? origin.initiator;
	if (source === undefined || !source.isValid) {
		return null;
	}
	return source.dimension;
}

export function getLocationFromOrigin(origin: CustomCommandOrigin): Vector3 | null {
	const source = origin.sourceBlock ?? origin.sourceEntity ?? origin.initiator;
	if (source === undefined || !source.isValid) {
		return null;
	}
	return source.location;
}

export function sendCommandFeedbackToOrigin(
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
