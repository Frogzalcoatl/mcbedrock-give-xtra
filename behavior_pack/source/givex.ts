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
import { ItemDataValidation, parseJsonArg } from "./itemData";
import { dataToStack } from "./itemStack";
import { appendColorAfterResets, prettyTypeId, vector3ToString } from "./prettyTypeId";
import type { BooleanWithMessage, GivexContext, ItemData, SlotData } from "./types";

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
	specialIdentifier: string | undefined,
): string {
	let message: string = "";
	let itemName: string = prettyTypeId(context.itemType.id);
	if (specialIdentifier) {
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
		message: givexFormatMessage(context, successCount, errors, specialIdentifier),
		status: successCount > 0 ? CustomCommandStatus.Success : CustomCommandStatus.Failure,
	};
}

function givexGiveItemType(context: GivexContext): CustomCommandResult {
	const itemStack: ItemStack = new ItemStack(context.itemType);
	if (context.commandName === "spawnx" && context.itemAmount > itemStack.maxAmount) {
		return {
			message: givexFormatMessage(
				context,
				0,
				`Amount ${context.itemAmount} exceeds the maximum of ${itemStack.maxAmount} for ${prettyTypeId(itemStack.typeId)}`,
				undefined,
			),
			status: CustomCommandStatus.Failure,
		};
	}
	return givexGiveItemStack(context, itemStack, undefined, undefined);
}

function givexPrepareItemData(context: GivexContext): {
	result: CustomCommandResult;
	itemData: ItemData | undefined;
} {
	if (context.recievers.length === 0) {
		return {
			itemData: undefined,
			result: {
				message: "No valid selector",
				status: CustomCommandStatus.Failure,
			},
		};
	}
	// Trying to access an itemstack created using minecraft:air crashes the world
	if (context.itemType.id === "minecraft:air") {
		return {
			itemData: undefined,
			result: {
				message: givexFormatMessage(context, 0, `Invalid item type "Air"`, undefined),
				status: CustomCommandStatus.Failure,
			},
		};
	}
	if (context.json === undefined) {
		return {
			itemData: undefined,
			result: {
				status: CustomCommandStatus.Success,
			},
		};
	}
	const itemDataResult = parseJsonArg(context.json, context.itemType.id, context.itemAmount);
	if (itemDataResult.itemData === undefined) {
		return {
			itemData: undefined,
			result: {
				message: givexFormatMessage(
					context,
					0,
					itemDataResult.syntaxError ?? "Unknown error in your json. (sorry)",
					undefined,
				),
				status: CustomCommandStatus.Failure,
			},
		};
	}
	const itemData: ItemData = itemDataResult.itemData;
	const validationResult = ItemDataValidation.complete(itemData);
	if (!validationResult.bool) {
		return {
			itemData: undefined,
			result: {
				message: givexFormatMessage(context, 0, validationResult.message, undefined),
				status: CustomCommandStatus.Failure,
			},
		};
	}
	return {
		itemData: itemData,
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

function givexGetSpecialIdentifier(itemData: ItemData): string | undefined {
	let specialIdentifier: string = "";
	if (itemData.potionType) {
		specialIdentifier = itemData.potionType;
	} else if (itemData.arrowType) {
		specialIdentifier = itemData.arrowType;
	} else if (itemData.bedColor) {
		specialIdentifier = itemData.bedColor;
	} else {
		return undefined;
	}
	specialIdentifier = prettyTypeId(specialIdentifier);
	specialIdentifier = `${specialIdentifier.slice(0, 128)}${specialIdentifier.length > 128 ? "..." : ""}`;
	return specialIdentifier;
}

// Automatically runs givex, blockx, or spawnx based on type of context.recievers
export function givexRun(context: GivexContext): CustomCommandResult {
	const itemDataResult = givexPrepareItemData(context);
	if (itemDataResult.result.status === CustomCommandStatus.Failure) {
		commandBlockOutputMessage(context.origin, itemDataResult.result);
		return itemDataResult.result;
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
	// itemData should not be undefined beyond this point
	if (itemDataResult.itemData === undefined) {
		commandBlockOutputMessage(context.origin, itemDataResult.result);
		return {
			message: itemDataResult.result.message ?? "",
			status: CustomCommandStatus.Failure,
		};
	}
	const itemData: ItemData = itemDataResult.itemData;
	system.run(() => {
		const aRecieverLocation: DimensionLocation | undefined = getLocationOfSomeReciever(context);
		if (aRecieverLocation === undefined) {
			afterTickCommandResultHandler(context.origin, {
				message: "Unable to get location of any reciever",
				status: CustomCommandStatus.Failure,
			});
			return;
		}
		const itemStackResult = dataToStack(itemData, aRecieverLocation);
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
			itemData.slot,
			givexGetSpecialIdentifier(itemData),
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
				message: givexFormatMessage(context, 0, blockErrorMessage, undefined),
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
