import {
	Block,
	type CustomCommandOrigin,
	type CustomCommandResult,
	CustomCommandSource,
	CustomCommandStatus,
	type Dimension,
	type DimensionLocation,
	Entity,
	ItemStack,
	Player,
	system,
	type Vector3,
	world,
} from "@minecraft/server";
import { giveItemToBlock, giveItemToEntity } from "./containers";
import { ItemPropertiesValidation, parseCommandJson } from "./itemProperties";
import { propertiesToItemStack } from "./itemStack";
import { appendColorAfterResets, prettyTypeId, vector3ToString } from "./prettyTypeId";
import type { BooleanWithMessage, GivexContext, ItemProperties, SlotData } from "./types";

// Errors are often too long to fit in the command block ui, so send them in chat if commandblockoutput is enabled.
function commandBlockOutputMessage(origin: CustomCommandOrigin, result: CustomCommandResult): void {
	if (
		origin.sourceType === CustomCommandSource.Block &&
		world.gameRules.commandBlockOutput &&
		result.message
	) {
		// §7 makes text gray, §o italicizes, §r resets formatting
		// Using same format as commandblockoutput in game
		world.sendMessage(
			`§7§o[CommandBlock§r:\n${result.status === CustomCommandStatus.Failure ? "§c" : ""}${result.message}§r]`,
		);
	}
}

function afterTickCommandResultHandler(
	origin: CustomCommandOrigin,
	result: CustomCommandResult,
): void {
	if (!result.message) {
		return;
	}
	if (result.status === CustomCommandStatus.Failure) {
		result.message = `§c${result.message}`;
	}
	if (
		origin.sourceEntity?.isValid &&
		origin.sourceEntity instanceof Player &&
		world.gameRules.sendCommandFeedback
	) {
		origin.sourceEntity.sendMessage(result.message);
	} else if (
		origin.initiator?.isValid &&
		origin.initiator instanceof Player &&
		world.gameRules.sendCommandFeedback
	) {
		origin.initiator.sendMessage(result.message);
	}
	commandBlockOutputMessage(origin, result);
}

function givexFormatMessage(
	context: GivexContext,
	successCount: number,
	errors: string,
	specialIdentifier?: string,
	slot?: SlotData,
): string {
	let message: string = "";
	let itemName: string = prettyTypeId(context.itemType.id);
	if (specialIdentifier) {
		itemName = `${specialIdentifier} ${itemName}`;
	}
	let actionWordPastTense: string = "";
	let actionWordPresentTense: string = "";
	let wordBeforeSelectorName: string = "";
	if (context.commandType === "givex" || context.commandType === "blockx") {
		if (slot === undefined || slot.name === undefined) {
			actionWordPastTense = "Gave";
			actionWordPresentTense = "give";
			wordBeforeSelectorName = "to";
		} else {
			actionWordPastTense = "Set";
			actionWordPresentTense = "set";
			wordBeforeSelectorName = `in ${slot.name} for`;
		}
	} else if (context.commandType === "spawnx") {
		actionWordPastTense = "Spawned";
		actionWordPresentTense = "spawn";
		wordBeforeSelectorName = "at";
	}
	if (successCount === context.recievers.length) {
		message = `${actionWordPastTense} ${itemName} * ${context.itemAmount} ${wordBeforeSelectorName} ${context.selectorName}§r`;
	} else if (successCount > 0) {
		message = `${actionWordPastTense} ${itemName} * ${context.itemAmount} ${wordBeforeSelectorName} ${context.selectorName}§r\n§6However, this failed for ${context.recievers.length - successCount}/${context.recievers.length} selectors`;
	} else {
		message = `§cUnable to ${actionWordPresentTense} ${itemName} ${wordBeforeSelectorName} ${context.selectorName}§r`;
	}
	if (errors) {
		message += `\n§cError(s):\n${errors.slice(0, 1024)}${errors.length > 1024 ? "...\n" : ""}`;
		message = appendColorAfterResets(message, "§c");
	}
	return message;
}

function givexSpawnItem(
	context: GivexContext,
	itemStack: ItemStack,
	reciever: DimensionLocation,
): BooleanWithMessage {
	// DimensionLocation
	try {
		itemStack.amount = context.itemAmount;
		reciever.dimension.spawnItem(itemStack, {
			x: reciever.x,
			y: reciever.y,
			z: reciever.z,
		});
	} catch (error) {
		let message: string = "Unable to spawn item";
		if (error instanceof Error) {
			message += `: ${error.message}`;
		}
		return {
			bool: false,
			message: message,
		};
	}
	return {
		bool: true,
		message: "",
	};
}

// Cannot be run in restricted execution
function givexGiveItemStack(
	context: GivexContext,
	itemStack: ItemStack,
	slot: SlotData | undefined,
	specialIdentifier: string | undefined, // For potions, tipped arrows, bed colors
): CustomCommandResult {
	let errors: string = "";
	let successCount: number = 0;
	for (const reciever of context.recievers) {
		let result: BooleanWithMessage;
		if (reciever instanceof Entity) {
			result = giveItemToEntity(reciever, itemStack, context.itemAmount, slot);
		} else if (reciever instanceof Block) {
			result = giveItemToBlock(reciever, itemStack, context.itemAmount, slot);
		} else {
			result = givexSpawnItem(context, itemStack, reciever);
		}
		if (result.bool) {
			successCount++;
		} else {
			errors += `-${result.message}\n`;
		}
	}
	return {
		message: givexFormatMessage(context, successCount, errors, specialIdentifier, slot),
		status: successCount > 0 ? CustomCommandStatus.Success : CustomCommandStatus.Failure,
	};
}

function givexGiveItemType(context: GivexContext): CustomCommandResult {
	const itemStack: ItemStack = new ItemStack(context.itemType);
	if (context.commandType === "spawnx" && context.itemAmount > itemStack.maxAmount) {
		return {
			message: givexFormatMessage(
				context,
				0,
				`Amount ${context.itemAmount} exceeds the maximum of ${itemStack.maxAmount} for ${prettyTypeId(itemStack.typeId)}`,
				undefined,
				undefined,
			),
			status: CustomCommandStatus.Failure,
		};
	}
	return givexGiveItemStack(context, itemStack, undefined, undefined);
}

function givexPrepareItemProperties(context: GivexContext): {
	result: CustomCommandResult;
	properties: ItemProperties | undefined;
} {
	if (context.recievers.length === 0) {
		return {
			properties: undefined,
			result: {
				message: "No valid selector",
				status: CustomCommandStatus.Failure,
			},
		};
	}
	// Trying to access an itemstack created using minecraft:air crashes the world
	if (context.itemType.id === "minecraft:air") {
		return {
			properties: undefined,
			result: {
				message: givexFormatMessage(
					context,
					0,
					`Invalid item type "Air"`,
					undefined,
					undefined,
				),
				status: CustomCommandStatus.Failure,
			},
		};
	}
	if (context.json === undefined) {
		return {
			properties: undefined,
			result: {
				status: CustomCommandStatus.Success,
			},
		};
	}
	const propertiesResult = parseCommandJson(
		context.json,
		context.itemType.id,
		context.itemAmount,
	);
	if (propertiesResult.properties === undefined) {
		return {
			properties: undefined,
			result: {
				message: givexFormatMessage(
					context,
					0,
					propertiesResult.syntaxError ?? "Unknown error in your json. (sorry)",
					undefined,
					undefined,
				),
				status: CustomCommandStatus.Failure,
			},
		};
	}
	const properties: ItemProperties = propertiesResult.properties;
	const validationResult = ItemPropertiesValidation.complete(properties);
	if (!validationResult.bool) {
		return {
			properties: undefined,
			result: {
				message: givexFormatMessage(
					context,
					0,
					validationResult.message,
					undefined,
					properties.slot,
				),
				status: CustomCommandStatus.Failure,
			},
		};
	}
	return {
		properties: properties,
		result: {
			status: CustomCommandStatus.Success,
		},
	};
}

function getLocationOfSomeReciever(context: GivexContext): DimensionLocation | undefined {
	for (const reciever of context.recievers) {
		if (reciever instanceof Entity || reciever instanceof Block) {
			if (!reciever.isValid) {
				continue;
			}
			return {
				dimension: reciever.dimension,
				x: reciever.location.x,
				y: reciever.location.y,
				z: reciever.location.z,
			};
		} else {
			return reciever;
		}
	}
	return undefined;
}

function givexGetSpecialIdentifier(properties: ItemProperties): string | undefined {
	let specialIdentifier: string = "";
	if (properties.potionType) {
		specialIdentifier = properties.potionType;
	} else if (properties.arrowType) {
		specialIdentifier = properties.arrowType;
	} else if (properties.bedColor) {
		specialIdentifier = properties.bedColor;
	} else {
		return undefined;
	}
	specialIdentifier = prettyTypeId(specialIdentifier);
	specialIdentifier = `${specialIdentifier.slice(0, 128)}${specialIdentifier.length > 128 ? "..." : ""}`;
	return specialIdentifier;
}

// Automatically runs givex, blockx, or spawnx based on type of context.recievers
export function givexRun(context: GivexContext): CustomCommandResult {
	const propertiesResult = givexPrepareItemProperties(context);
	if (propertiesResult.result.status === CustomCommandStatus.Failure) {
		commandBlockOutputMessage(context.origin, propertiesResult.result);
		return propertiesResult.result;
	}
	if (context.json === undefined) {
		system.run(() => {
			const result: CustomCommandResult = givexGiveItemType(context);
			afterTickCommandResultHandler(context.origin, result);
		});
		return {
			status: CustomCommandStatus.Success,
		};
	}
	// item properties should not be undefined beyond this point
	if (propertiesResult.properties === undefined) {
		commandBlockOutputMessage(context.origin, propertiesResult.result);
		return {
			message: propertiesResult.result.message ?? "",
			status: CustomCommandStatus.Failure,
		};
	}
	const properties: ItemProperties = propertiesResult.properties;
	system.run(() => {
		const aRecieverLocation: DimensionLocation | undefined = getLocationOfSomeReciever(context);
		if (aRecieverLocation === undefined) {
			afterTickCommandResultHandler(context.origin, {
				message: "Unable to get location of any reciever",
				status: CustomCommandStatus.Failure,
			});
			return;
		}
		const itemStackResult = propertiesToItemStack(properties, aRecieverLocation);
		if (itemStackResult.item === undefined) {
			afterTickCommandResultHandler(context.origin, {
				message: itemStackResult.warnings ?? "Failed to create item stack",
				status: CustomCommandStatus.Failure,
			});
			return;
		}
		const givexResult = givexGiveItemStack(
			context,
			itemStackResult.item,
			properties.slot,
			givexGetSpecialIdentifier(properties),
		);
		// Append warnings if they exist
		if (itemStackResult.warnings) {
			givexResult.message = `${givexResult.message ?? ""}\nWarning(s):\n${itemStackResult.warnings}`;
		}
		afterTickCommandResultHandler(context.origin, givexResult);
	});
	return {
		status: CustomCommandStatus.Success,
	};
}

export function getDimensionFromOrigin(origin: CustomCommandOrigin): {
	dimension: Dimension | undefined;
	result: CustomCommandResult;
} {
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

export function blockxGetBlock(
	context: GivexContext,
	location: Vector3,
): { block: Block | undefined; result: CustomCommandResult } {
	const dimensionResult = getDimensionFromOrigin(context.origin);
	if (dimensionResult.dimension === undefined) {
		return {
			block: undefined,
			result: dimensionResult.result,
		};
	}
	const dimension = dimensionResult.dimension;
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
				message: givexFormatMessage(context, 0, blockErrorMessage, undefined, undefined),
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
