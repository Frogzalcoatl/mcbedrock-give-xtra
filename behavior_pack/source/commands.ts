import {
	Block,
	CommandPermissionLevel,
	type CustomCommand,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandResult,
	CustomCommandStatus,
	type Entity,
	type ItemType,
	Player,
	PlayerPermissionLevel,
	system,
	type Vector3,
} from "@minecraft/server";
import { HelpForm, showForm } from "./forms";
import { blockxGetBlock, getDimensionFromOrigin, givexRun } from "./givex";
import { getRecieverName, prettyTypeId, vector3ToString } from "./prettyTypeId";
import type { GivexContext } from "./types";

const NAMESPACE: string = "givex";

function getSelectorName(recievers: Entity[] | Block): string {
	if (recievers instanceof Block) {
		return prettyTypeId(recievers.typeId);
	}
	if (recievers.length > 1) {
		return "selectors";
	} else if (recievers.length === 1) {
		const entity: Entity | undefined = recievers[0];
		if (entity) {
			return getRecieverName(entity);
		} else {
			return "selector";
		}
	} else {
		return "unknown selector";
	}
}

export const GIVEX_COMMAND: CustomCommand = {
	description: "Give items with specific properties to entities.",
	mandatoryParameters: [
		{
			name: "target",
			type: CustomCommandParamType.EntitySelector,
		},
		{
			name: "itemName",
			type: CustomCommandParamType.ItemType,
		},
	],
	name: `${NAMESPACE}:givex`,
	optionalParameters: [
		{
			name: "amount",
			type: CustomCommandParamType.Integer,
		},
		{
			name: "json",
			type: CustomCommandParamType.String,
		},
	],
	permissionLevel: CommandPermissionLevel.GameDirectors,
};

// Players must use escape characters for double quotes: \"
export function givexCommandCallback(
	origin: CustomCommandOrigin,
	selectorResult: Entity[],
	itemType: ItemType,
	amount: number = 1,
	json?: string,
): CustomCommandResult {
	const context: GivexContext = {
		commandName: "givex",
		itemAmount: amount,
		itemType: itemType,
		json: json,
		origin: origin,
		recievers: selectorResult,
		selectorName: getSelectorName(selectorResult),
	};
	return givexRun(context);
}

export const BLOCKX_COMMAND: CustomCommand = {
	description: "Give items with specific properties to blocks.",
	mandatoryParameters: [
		{
			name: "position",
			type: CustomCommandParamType.Location,
		},
		{
			name: "itemName",
			type: CustomCommandParamType.ItemType,
		},
	],
	name: `${NAMESPACE}:blockx`,
	optionalParameters: [
		{
			name: "amount",
			type: CustomCommandParamType.Integer,
		},
		{
			name: "json",
			type: CustomCommandParamType.String,
		},
	],
	permissionLevel: CommandPermissionLevel.GameDirectors,
};

export function blockxCommandCallback(
	origin: CustomCommandOrigin,
	location: Vector3,
	itemType: ItemType,
	amount: number = 1,
	json?: string,
): CustomCommandResult {
	const context: GivexContext = {
		commandName: "blockx",
		itemAmount: amount,
		itemType: itemType,
		json: json,
		origin: origin,
		recievers: [],
		selectorName: "block",
	};
	const blockResult = blockxGetBlock(context, location);
	if (blockResult.block === undefined) {
		return blockResult.result;
	}
	context.recievers = [blockResult.block];
	context.selectorName = getSelectorName(blockResult.block);
	return givexRun(context);
}

export const SPAWNX_COMMAND: CustomCommand = {
	description: "Spawn items with givex json.",
	mandatoryParameters: [
		{
			name: "position",
			type: CustomCommandParamType.Location,
		},
		{
			name: "itemName",
			type: CustomCommandParamType.ItemType,
		},
	],
	name: `${NAMESPACE}:spawnx`,
	optionalParameters: [
		{
			name: "amount",
			type: CustomCommandParamType.Integer,
		},
		{
			name: "json",
			type: CustomCommandParamType.String,
		},
	],
	permissionLevel: CommandPermissionLevel.GameDirectors,
};

export function spawnxCommandCallback(
	origin: CustomCommandOrigin,
	position: Vector3,
	itemType: ItemType,
	amount: number = 1,
	json?: string,
): CustomCommandResult {
	const context: GivexContext = {
		commandName: "spawnx",
		itemAmount: amount,
		itemType: itemType,
		json: json,
		origin: origin,
		recievers: [],
		selectorName: `location ${vector3ToString(position, 0)}`,
	};
	const dimensionResult = getDimensionFromOrigin(origin);
	if (dimensionResult.dimension === undefined) {
		return dimensionResult.result;
	}
	context.recievers = [
		{
			dimension: dimensionResult.dimension,
			x: position.x,
			y: position.y,
			z: position.z,
		},
	];
	return givexRun(context);
}

// Use server ui to easily generate item data json
export const HELP_COMMAND: CustomCommand = {
	description: "Easily generate givex json.",
	name: `${NAMESPACE}:help`,
	optionalParameters: [
		{
			name: "itemName",
			type: CustomCommandParamType.ItemType,
		},
	],
	permissionLevel: CommandPermissionLevel.GameDirectors,
};

export function helpCommandCallback(
	origin: CustomCommandOrigin,
	itemType?: ItemType,
): CustomCommandResult {
	let viewer: Player;
	if (
		origin.sourceEntity instanceof Player &&
		origin.sourceEntity.playerPermissionLevel === PlayerPermissionLevel.Operator
	) {
		viewer = origin.sourceEntity;
	} else if (
		origin.initiator instanceof Player &&
		origin.initiator.playerPermissionLevel === PlayerPermissionLevel.Operator
	) {
		viewer = origin.initiator;
	} else {
		return {
			message: `No valid operator for form`,
			status: CustomCommandStatus.Failure,
		};
	}
	system.run(async () => {
		viewer.playSound("random.pop", { pitch: 0.5, volume: 0.3 });
		showForm(HelpForm, viewer);
	});
	return {
		status: CustomCommandStatus.Success,
	};
}
