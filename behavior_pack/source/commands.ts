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
import { FormHelp } from "./forms/help";
import { ItemDataCreator } from "./forms/itemDataCreator";
import { showActionForm } from "./forms/types";
import { blockxGetBlock, getDimensionFromOrigin, givexRun } from "./givex";
import { getRecieverName, prettyTypeId, vector3ToString } from "./prettyTypeId";
import { CommandNamespace, type GivexContext } from "./types";

function getSelectorName(recievers: Entity[] | Block | Vector3): string {
	if (recievers instanceof Block) {
		return prettyTypeId(recievers.typeId);
	} else if (Array.isArray(recievers)) {
		// Entities
		if (recievers.length <= 0) {
			return "unknown selector";
		} else if (recievers.length === 1) {
			const entity: Entity | undefined = recievers[0];
			if (entity) {
				return getRecieverName(entity);
			} else {
				return "selector";
			}
		} else {
			return "selectors";
		}
	} else {
		// Vector3
		return `location ${vector3ToString(recievers, 0)}`;
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
	name: `${CommandNamespace}:givex`,
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
		commandType: "givex",
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
	name: `${CommandNamespace}:blockx`,
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
		commandType: "blockx",
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
	description: "Spawn items with specific properties.",
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
	name: `${CommandNamespace}:spawnx`,
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
		commandType: "spawnx",
		itemAmount: amount,
		itemType: itemType,
		json: json,
		origin: origin,
		recievers: [],
		selectorName: getSelectorName(position),
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
	name: `${CommandNamespace}:help`,
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
		if (itemType === undefined) {
			showActionForm(FormHelp, viewer);
		} else {
			const creator = new ItemDataCreator(viewer, false, itemType.id);
			creator.run();
		}
	});
	return {
		status: CustomCommandStatus.Success,
	};
}
