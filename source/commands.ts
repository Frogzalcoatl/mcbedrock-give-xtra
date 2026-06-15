import {
	Block,
	CommandPermissionLevel,
	type CustomCommand,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandResult,
	CustomCommandSource,
	CustomCommandStatus,
	type Dimension,
	Entity,
	ItemStack,
	type ItemType,
	Player,
	PlayerPermissionLevel,
	system,
	type Vector3,
	world,
} from "@minecraft/server";
import { giveItemToBlock, giveItemToEntity } from "./containers";
import { getItemCommandDataValue } from "./dataValueItems";
import { HelpForm, showForm } from "./forms";
import { ItemDataValidation, parseItemData } from "./itemData";
import { dataToStack } from "./itemStack";
import {
	appendColorAfterResets,
	getRecieverName,
	prettyTypeId,
	vector3ToString,
} from "./prettyTypeId";
import { type BooleanWithMessage, GivexContext, type ItemData, ItemDataMaxAmount, type SlotData } from "./types";

const NAMESPACE: string = "givex";

function afterTickCommandResultHandler(
	origin: CustomCommandOrigin,
	message: string,
	status: CustomCommandStatus,
): void {
	if (status === CustomCommandStatus.Failure) {
		message = `§c${message}`;
	}
	if (
		origin.sourceEntity &&
		origin.sourceEntity instanceof Player &&
		world.gameRules.sendCommandFeedback
	) {
		origin.sourceEntity.sendMessage(message);
	} else if (
		origin.initiator &&
		origin.initiator instanceof Player &&
		world.gameRules.sendCommandFeedback
	) {
		origin.initiator.sendMessage(message);
	}
	commandBlockOutputMessage(origin, message, status);
}

// Errors are often too long to fit in the command block ui, so send them in chat if commandblockoutput is enabled.
function commandBlockOutputMessage(
	origin: CustomCommandOrigin,
	message: string,
	status: CustomCommandStatus,
): void {
	if (origin.sourceType === CustomCommandSource.Block && world.gameRules.commandBlockOutput && message) {
		// §7 makes text gray, §o italicizes, §r resets formatting
		// Using same format as commandblockoutput in game
		world.sendMessage(
			`§7§o[CommandBlock§r:\n${status === CustomCommandStatus.Failure ? "§c" : ""}${message}§r]`,
		);
	}
}

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

function getGivexMessage(
	context: GivexContext,
	successCount: number,
	errors: string,
	specialIdentifier: string | undefined,
): string {
	let message: string = "";
	let itemName: string = prettyTypeId(context.itemType.id);
	if (specialIdentifier) {
		specialIdentifier = `${specialIdentifier.slice(0, 256)}${specialIdentifier.length > 256 ? "..." : ""}`;
		specialIdentifier = prettyTypeId(specialIdentifier);
		itemName = `${specialIdentifier} ${itemName}`;
	}
	let actionWordPastTense: string = "";
	let actionWordPresentTense: string = "";
	let wordBeforeSelectorName: string = "";
	if (context.commandName === "givex" || context.commandName === "blockx") {
		actionWordPastTense = "Gave";
		actionWordPresentTense = "give";
		wordBeforeSelectorName = "to";
	} else if (context.commandName === "spawnx") {
		actionWordPastTense = "Spawned";
		actionWordPresentTense = "spawn";
		wordBeforeSelectorName = "at";
	}
	if (successCount === context.recievers.length) {
		message = `${actionWordPastTense} ${itemName}§r * ${context.itemAmount} ${wordBeforeSelectorName} ${context.selectorName}§r`;
	} else if (successCount > 0) {
		message = `${actionWordPastTense} ${itemName}§r * ${context.itemAmount} ${wordBeforeSelectorName} ${context.selectorName}§r\n§6However, failed to ${actionWordPresentTense} ${wordBeforeSelectorName} ${context.recievers.length - successCount}/${context.recievers.length}`;
	} else {
		message = `§cUnable to ${actionWordPresentTense} ${itemName}§r§c ${wordBeforeSelectorName} ${context.selectorName}§r§c`;
	}
	if (errors) {
		message += `\n§cError(s):\n${errors.slice(0, 1024)}${errors.length > 1024 ? "...\n" : ""}`;
		message = appendColorAfterResets(message, "§c");
	}
	return message;
}

function runGive(
	context: GivexContext,
	itemStack: ItemStack,
	slot: SlotData | undefined,
	itemDataValue: number,
	specialIdentifier: string | undefined, // For potions, tipped arrows, bed colors
): void {
	system.run(() => {
		let errors: string = "";
		let successCount: number = 0;
		for (const reciever of context.recievers) {
			let result: BooleanWithMessage;
			if (reciever instanceof Entity) {
				result = giveItemToEntity(reciever, itemStack, context.itemAmount, slot, itemDataValue);
			} else if (reciever instanceof Block) {
				result = giveItemToBlock(reciever, itemStack, context.itemAmount, slot, itemDataValue);
			} else { // DimensionLocation
				try {
					reciever.dimension.spawnItem(itemStack, { x: reciever.x, y: reciever.y, z: reciever.z });
				} catch (error) {
					if (error instanceof Error) {
						result = {
							bool: false,
							message: error.message
						};
					} else {
						result = {
							bool: false,
							message: `Unknown error occured while attempting to spawn ${prettyTypeId(itemStack.typeId)}`
						};
					}
				}
				result = {
					bool: true,
					message: `Spawned ${prettyTypeId(itemStack.typeId)}`
				};
			}
			if (result.bool) {
				successCount++;
			} else {
				errors += `-${result.message}\n`;
			}
		}
		afterTickCommandResultHandler(
			context.origin,
			getGivexMessage(
				context,
				successCount,
				errors,
				specialIdentifier
			),
			successCount > 0 ? CustomCommandStatus.Success : CustomCommandStatus.Failure,
		);
	});
}

function givexRecieverCheck(context: GivexContext): CustomCommandResult {
	if (context.recievers.length === 0) {
		const message: string = getGivexMessage(
			context,
			0,
			"No valid selector",
			undefined,
		);
		return {
			message: message,
			status: CustomCommandStatus.Success,
		};
	}
	return {
		status: CustomCommandStatus.Success,
		message: "Recievers are valid"
	}
}

// Trying to access an itemstack created using minecraft:air crashes the world
function givexAirCheck(context: GivexContext): CustomCommandResult {
	if (context.itemType.id === "minecraft:air") {
		const message: string = getGivexMessage(
			context,
			0,
			`Invalid item type "${prettyTypeId(context.itemType.id)}"`,
			undefined,
		);
		return {
			message: message,
			status: CustomCommandStatus.Failure,
		};
	}
	return {
		message: "typeid air check successful",
		status: CustomCommandStatus.Success
	}
}

function givexAmountCheck(context: GivexContext): CustomCommandResult {
	if (context.itemAmount > ItemDataMaxAmount) {
		const message = getGivexMessage(
			context,
			0,
			`Amount ${context.itemAmount} exceeds the maximum of ${ItemDataMaxAmount}`,
			undefined,
		);
		return {
			message: message,
			status: CustomCommandStatus.Failure,
		};
	}
	return {
		message: "Amount is valid",
		status: CustomCommandStatus.Success
	}
}

function runGivexNoJson(context: GivexContext): CustomCommandResult {
	const amountCheckResult: CustomCommandResult = givexAmountCheck(context);
		if (amountCheckResult.status === CustomCommandStatus.Failure) {
			commandBlockOutputMessage(context.origin, amountCheckResult.message ?? "", amountCheckResult.status);
			return amountCheckResult;
		}
		runGive(
			context,
			new ItemStack(context.itemType),
			undefined,
			getItemCommandDataValue(context.itemType.id, undefined),
			undefined,
		);
		return {
			message: `Ran ${context.commandName}`,
			status: CustomCommandStatus.Success,
		};
}

function givexGetSpecialIdentifier(itemData: ItemData): string | undefined {
	if (itemData.potionType) {
		return itemData.potionType;
	} else if (itemData.arrowType) {
		return itemData.arrowType;
	} else if (itemData.bedColor) {
		return itemData.bedColor;
	} else {
		return undefined;
	}
}

function givexGetCommandDataValue(itemData: ItemData): number {
	if (itemData.arrowType) {
		return getItemCommandDataValue(itemData.typeId, itemData.arrowType);
	} else if (itemData.bedColor) {
		return getItemCommandDataValue(itemData.typeId, itemData.bedColor);
	} else {
		return 0;
	}
}

function runGivex(context: GivexContext): CustomCommandResult {
	const recieverResult: CustomCommandResult = givexRecieverCheck(context);
	if (recieverResult.status === CustomCommandStatus.Failure) {
		commandBlockOutputMessage(context.origin, recieverResult.message ?? "", recieverResult.status);
		return recieverResult;
	}
	const airCheckResult: CustomCommandResult = givexAirCheck(context);
	if (airCheckResult.status === CustomCommandStatus.Failure) {
		commandBlockOutputMessage(context.origin, airCheckResult.message ?? "", airCheckResult.status);
		return airCheckResult;
	}
	if (context.json === undefined) {
		return runGivexNoJson(context);
	}
	const itemDataResult = parseItemData(context.json, context.itemType.id, context.itemAmount);
	if (itemDataResult.itemData === undefined) {
		const message: string = getGivexMessage(
			context,
			0,
			itemDataResult.syntaxError ?? "Unknown error in your json. (sorry)",
			undefined,
		);
		const status = CustomCommandStatus.Failure;
		commandBlockOutputMessage(context.origin, message, status);
		return {
			message: message,
			status: status,
		};
	}
	const itemData: ItemData = itemDataResult.itemData;
	const validationResult = ItemDataValidation.complete(itemData);
	if (!validationResult.bool) {
		const message = getGivexMessage(
			context,
			0,
			validationResult.message,
			undefined,
		);
		const status = CustomCommandStatus.Failure;
		commandBlockOutputMessage(context.origin, message, status);
		return {
			message: message,
			status: status,
		};
	}
	system.run(() => {
		const itemStackResult = dataToStack(itemData);
		if (itemStackResult.item === undefined) {
			afterTickCommandResultHandler(
				context.origin,
				getGivexMessage(
					context,
					0,
					itemStackResult.warning ?? "Failed to create item stack.",
					undefined,
				),
				CustomCommandStatus.Failure,
			);
			return;
		}
		const itemStack = itemStackResult.item;
		runGive(
			context,
			itemStack,
			itemData.slot,
			givexGetCommandDataValue(itemData),
			givexGetSpecialIdentifier(itemData)
		);
	});
	return {
		message: `Ran ${context.commandName}`,
		status: CustomCommandStatus.Success,
	};
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
	return runGivex({
		commandName: "givex",
		origin: origin,
		recievers: selectorResult,
		selectorName: getSelectorName(selectorResult),
		itemType: itemType,
		itemAmount: amount,
		json: json
	});
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

function getDimensionFromOrigin(origin: CustomCommandOrigin): Dimension | undefined {
	if (origin.sourceEntity && origin.sourceEntity.isValid) {
		return origin.sourceEntity.dimension;
	} else if (origin.initiator && origin.initiator.isValid) {
		return origin.initiator.dimension;
	} else if (origin.sourceBlock && origin.sourceBlock.isValid) {
		return origin.sourceBlock.dimension;
	} else {
		return undefined;
	}
}

export function blockxCommandCallback(
	origin: CustomCommandOrigin,
	location: Vector3,
	itemType: ItemType,
	amount: number = 1,
	json?: string,
): CustomCommandResult {
	const context: GivexContext = {
		commandName: "blockx",
		origin: origin,
		recievers: [],
		selectorName: "block",
		itemType: itemType,
		itemAmount: amount,
		json: json
	}
	const dimension = getDimensionFromOrigin(origin);
	if (dimension === undefined) {
		return {
			message: getGivexMessage(
				context,
				0,
				"Unable to get block due to invalid origin",
				undefined,
			),
			status: CustomCommandStatus.Failure,
		};
	}
	let block: Block | undefined;
	try {
		block = dimension.getBlock(location);
	} catch (error) {
		if (error instanceof Error) {
			return {
				message: getGivexMessage(
					context,
					0,
					error.message,
					undefined,
				),
				status: CustomCommandStatus.Failure,
			};
		}
	}
	if (block === undefined) {
		return {
			message: getGivexMessage(
				context,
				0,
				`Unable to get block at location ${vector3ToString(location)}`,
				undefined,
			),
			status: CustomCommandStatus.Failure,
		};
	}
	context.recievers = [block];
	context.selectorName = getSelectorName(block);
	return runGivex(context);
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
	permissionLevel: CommandPermissionLevel.GameDirectors
}

export function spawnxCommandCallback(
	origin: CustomCommandOrigin,
	position: Vector3,
	itemType: ItemType,
	amount: number = 1,
	json?: string
): CustomCommandResult {
	const dimension = getDimensionFromOrigin(origin);
	const context: GivexContext = {
		commandName: "spawnx",
		origin: origin,
		recievers: [],
		selectorName: `location ${vector3ToString(position)}`,
		itemType: itemType,
		itemAmount: amount,
		json: json
	}
	if (dimension === undefined) {
		return {
			message: getGivexMessage(
			context,
			0,
			"Unable to get valid dimension from origin",
			undefined
			),
			status: CustomCommandStatus.Failure
		};
	}
	context.recievers = [{
		dimension: dimension,
		x: position.x,
		y: position.y,
		z: position.z
	}];
	return runGivex(context);
}

// Use server ui to easily generate item data json
export const HELP_COMMAND: CustomCommand = {
	description: "Easily generate givex json.",
	name: `${NAMESPACE}:help`,
	permissionLevel: CommandPermissionLevel.GameDirectors,
};

export function helpCommandCallback(origin: CustomCommandOrigin): CustomCommandResult {
	let viewer: Player;
	if (origin.sourceEntity instanceof Player) {
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
