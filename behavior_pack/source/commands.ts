import {
	Block,
	CommandPermissionLevel,
	type CustomCommand,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	type Entity,
	type ItemType,
	Player,
	PlayerPermissionLevel,
	system,
	type Vector3,
} from "@minecraft/server";
import { FormHelp } from "./forms/help";
import { ItemPropertiesForm } from "./forms/itemPropertiesForm";
import { showActionForm } from "./forms/types";
import { GivexCommand } from "./givex";
import { getRecieverName, prettyTypeId, vector3ToString } from "./prettyTypeId";
import { CommandNamespace } from "./types";

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
	description: "Give items with special properties to entities.",
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
	const command = new GivexCommand(
		"givex",
		origin,
		selectorResult,
		getSelectorName(selectorResult),
		itemType,
		amount,
		json,
	);
	return command.run();
}

interface GetDimensionFromOriginResult {
	dimension: Dimension | undefined;
	result: CustomCommandResult;
}
function getDimensionFromOrigin(origin: CustomCommandOrigin): GetDimensionFromOriginResult {
	let dimension: Dimension | undefined;
	if (origin.sourceEntity?.isValid) {
		dimension = origin.sourceEntity.dimension;
	} else if (origin.initiator?.isValid) {
		dimension = origin.initiator.dimension;
	} else if (origin.sourceBlock?.isValid) {
		dimension = origin.sourceBlock.dimension;
	} else {
		return {
			dimension: undefined,
			result: {
				message: "Unable to get valid dimension from command origin",
				status: CustomCommandStatus.Failure,
			},
		};
	}
	return {
		dimension: dimension,
		result: {
			status: CustomCommandStatus.Success,
		},
	};
}

interface BlockxGetBlockResult {
	block: Block | undefined;
	result: CustomCommandResult;
}
function blockxGetBlock(command: GivexCommand, location: Vector3): BlockxGetBlockResult {
	const dimensionResult: GetDimensionFromOriginResult = getDimensionFromOrigin(command.origin);
	if (dimensionResult.dimension === undefined) {
		return {
			block: undefined,
			result: dimensionResult.result,
		};
	}
	const dimension: Dimension = dimensionResult.dimension;
	let block: Block | undefined;
	let blockErrorMessage: string = `Unable to get block at location ${vector3ToString(location, 0)}`;
	try {
		block = dimension.getBlock(location);
	} catch (error) {
		if (error instanceof Error) {
			blockErrorMessage += `: ${error.message}`;
		}
	}
	if (block === undefined) {
		return {
			block: undefined,
			result: {
				message: command.formatMessage(0, blockErrorMessage),
				status: CustomCommandStatus.Failure,
			},
		};
	}
	return {
		block: block,
		result: {
			status: CustomCommandStatus.Success,
		},
	};
}

export const BLOCKX_COMMAND: CustomCommand = {
	description: "Give items with special properties to blocks.",
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
	const command = new GivexCommand(
		"blockx",
		origin,
		[],
		"selectorName placeholder",
		itemType,
		amount,
		json,
	);
	const blockResult: BlockxGetBlockResult = blockxGetBlock(command, location);
	if (blockResult.block === undefined) {
		return blockResult.result;
	}
	command.recievers = [blockResult.block];
	command.selectorName = getSelectorName(blockResult.block);
	return command.run();
}

export const SPAWNX_COMMAND: CustomCommand = {
	description: "Spawn items with special properties.",
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
	const command = new GivexCommand(
		"spawnx",
		origin,
		[],
		getSelectorName(position),
		itemType,
		amount,
		json,
	);
	const dimensionResult: GetDimensionFromOriginResult = getDimensionFromOrigin(origin);
	if (dimensionResult.dimension === undefined) {
		return dimensionResult.result;
	}
	command.recievers = [
		{
			dimension: dimensionResult.dimension,
			x: position.x,
			y: position.y,
			z: position.z,
		},
	];
	return command.run();
}

// Use server ui to easily generate item properties json
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
			const propertiesForm = new ItemPropertiesForm(viewer, false, itemType.id);
			propertiesForm.run();
		}
	});
	return {
		status: CustomCommandStatus.Success,
	};
}
