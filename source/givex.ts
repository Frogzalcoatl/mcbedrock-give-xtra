import { Entity, Block, CustomCommandResult, CustomCommandStatus, ItemStack, system, CustomCommandOrigin, CustomCommandSource, Player, world, Vector3, Dimension } from "@minecraft/server";
import { giveItemToEntity, giveItemToBlock } from "./containers";
import { getItemCommandDataValue } from "./dataValueItems";
import { parseItemData, ItemDataValidation } from "./itemData";
import { dataToStack } from "./itemStack";
import { prettyTypeId, appendColorAfterResets, vector3ToString } from "./prettyTypeId";
import { GivexContext, ItemDataMaxAmount, SlotData, BooleanWithMessage, ItemData } from "./types";

// Errors are often too long to fit in the command block ui, so send them in chat if commandblockoutput is enabled.
function commandBlockOutputMessage(
	origin: CustomCommandOrigin,
	result: CustomCommandResult
): void {
	if (origin.sourceType === CustomCommandSource.Block && world.gameRules.commandBlockOutput && result.message) {
		// §7 makes text gray, §o italicizes, §r resets formatting
		// Using same format as commandblockoutput in game
		world.sendMessage(
			`§7§o[CommandBlock§r:\n${result.status === CustomCommandStatus.Failure ? "§c" : ""}${result.message}§r]`,
		);
	}
}

function afterTickCommandResultHandler(
	origin: CustomCommandOrigin,
	result: CustomCommandResult
): void {
	if (!result.message) {
		return;
	}
	if (result.status === CustomCommandStatus.Failure) {
		result.message = `§c${result.message}`;
	}
	if (
		origin.sourceEntity &&
		origin.sourceEntity.isValid &&
		origin.sourceEntity instanceof Player &&
		world.gameRules.sendCommandFeedback
	) {
		origin.sourceEntity.sendMessage(result.message);
	} else if (
		origin.initiator &&
		origin.initiator.isValid &&
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

function givexRecieverCheck(context: GivexContext): CustomCommandResult {
	if (context.recievers.length === 0) {
		return {
			message: givexFormatMessage(
			context,
			0,
			"No valid selector",
			undefined,
		),
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
		return {
			message: givexFormatMessage(
			context,
			0,
			`Invalid item type "${prettyTypeId(context.itemType.id)}"`,
			undefined,
		),
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
		return {
			message: givexFormatMessage(
			context,
			0,
			`Amount ${context.itemAmount} exceeds the maximum of ${ItemDataMaxAmount}`,
			undefined,
		),
			status: CustomCommandStatus.Failure,
		};
	}
	return {
		message: "Amount is valid",
		status: CustomCommandStatus.Success
	}
}

// Cannot be run in restricted execution
function givexGiveItemStack(
	context: GivexContext,
	itemStack: ItemStack,
	slot: SlotData | undefined,
	itemDataValue: number,
	specialIdentifier: string | undefined, // For potions, tipped arrows, bed colors
): CustomCommandResult {
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
	return {
		message: givexFormatMessage(context, successCount, errors, specialIdentifier),
		status: successCount > 0 ? CustomCommandStatus.Success : CustomCommandStatus.Failure
	}
}

function givexGiveItemType(context: GivexContext): CustomCommandResult {
	const amountCheckResult: CustomCommandResult = givexAmountCheck(context);
		if (amountCheckResult.status === CustomCommandStatus.Failure) {
			commandBlockOutputMessage(context.origin, amountCheckResult);
			return amountCheckResult;
		}
		return givexGiveItemStack(
			context,
			new ItemStack(context.itemType),
			undefined,
			getItemCommandDataValue(context.itemType.id, undefined),
			undefined,
		);
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

function givexGetItemData(context: GivexContext): { result: CustomCommandResult, itemData: ItemData | undefined } {
	if (context.json === undefined) {
		return {
			result: {
				status: CustomCommandStatus.Failure,
				message: "json is undefined"
			},
			itemData: undefined
		}
	}
	const itemDataResult = parseItemData(context.json, context.itemType.id, context.itemAmount);
	if (itemDataResult.itemData === undefined) {
		return {
			result: {
				message: givexFormatMessage(
					context,
					0,
					itemDataResult.syntaxError ?? "Unknown error in your json. (sorry)",
					undefined,
				),
				status: CustomCommandStatus.Failure,
			},
			itemData: undefined
		};
	}
	return {
		result: {
			message: "Valid ItemData",
			status: CustomCommandStatus.Success
		},
		itemData: itemDataResult.itemData
	}
}

function givexValidateItemData(context: GivexContext, itemData: ItemData): CustomCommandResult {
	const validationResult = ItemDataValidation.complete(itemData);
	if (!validationResult.bool) {
		return {
			message: givexFormatMessage(context, 0, validationResult.message, undefined),
			status: CustomCommandStatus.Failure,
		};
	}
	return {
		message: validationResult.message,
		status: CustomCommandStatus.Success
	}
}

function givexPrep(context: GivexContext): {result: CustomCommandResult, itemData: ItemData | undefined} {
	const recieverResult: CustomCommandResult = givexRecieverCheck(context);
	if (recieverResult.status === CustomCommandStatus.Failure) {
		return {
			itemData: undefined,
			result: recieverResult
		}
	}
	const airCheckResult: CustomCommandResult = givexAirCheck(context);
	if (airCheckResult.status === CustomCommandStatus.Failure) {
		return {
			itemData: undefined,
			result: airCheckResult
		}
	}
	if (context.json === undefined) {
		return {
			itemData: undefined,
			result: {
				status: CustomCommandStatus.Success
			}
		}
	}
	const itemDataResult = givexGetItemData(context);
	if (itemDataResult.result.status === CustomCommandStatus.Failure || itemDataResult.itemData === undefined) {
		return {
			itemData: undefined,
			result: itemDataResult.result
		}
	}
	const itemData: ItemData = itemDataResult.itemData;
	const validationResult = givexValidateItemData(context, itemData);
	if (validationResult.status === CustomCommandStatus.Failure) {
		return {
			itemData: undefined,
			result: validationResult
		};
	}
	return {
		itemData: itemData,
		result: {
			status: CustomCommandStatus.Success
		}
	}
}

// Cannot be run in restricted execution
function givexGetItemStack(itemData: ItemData): { itemStack: ItemStack | undefined, result: CustomCommandResult } {
	const itemStackResult = dataToStack(itemData);
		if (itemStackResult.item === undefined) {
			return {
				itemStack: undefined,
				result: {
					status: CustomCommandStatus.Failure,
					message: itemStackResult.warning ?? "Failed to create item stack."
				}
			}
		} else {
			return {
				itemStack: itemStackResult.item,
				result: {
					status: CustomCommandStatus.Success
				}
			}
		}
}

// Automatically runs givex, blockx, or spawnx based on type of context.recievers
export function givexRun(context: GivexContext, capAmountAtMaxStackSize: boolean): CustomCommandResult {
	const prep = givexPrep(context);
	if (prep.result.status === CustomCommandStatus.Failure) {
		commandBlockOutputMessage(context.origin, prep.result);
		return prep.result;
	}
	if (context.json === undefined) {
		return givexGiveItemType(context);
	}
	// itemData should not be undefined beyond this point
	if (prep.itemData === undefined) {
		commandBlockOutputMessage(context.origin, prep.result);
		return {
			message: prep.result.message ?? "",
			status: CustomCommandStatus.Failure
		}
	}
	const itemData: ItemData = prep.itemData;
	system.run(() => {
		const itemStackResult = givexGetItemStack(itemData);
		if (itemStackResult.result.status === CustomCommandStatus.Failure || itemStackResult.itemStack === undefined) {
			afterTickCommandResultHandler(context.origin, itemStackResult.result);
			return;
		}
		if (capAmountAtMaxStackSize && itemStackResult.itemStack.maxAmount < context.itemAmount) {
			afterTickCommandResultHandler(
				context.origin,
				{
					message: `Amount ${context.itemAmount} exceeds maximum ${itemStackResult.itemStack.maxAmount}`,
					status: CustomCommandStatus.Failure
				}
			);
			return;
		}
		const givexResult = givexGiveItemStack(
			context,
			itemStackResult.itemStack,
			itemData.slot,
			givexGetCommandDataValue(itemData),
			givexGetSpecialIdentifier(itemData)
		);
		afterTickCommandResultHandler(context.origin, givexResult);
	});
	return {
		status: CustomCommandStatus.Success
	}
}

export function getDimensionFromOrigin(origin: CustomCommandOrigin): {dimension: Dimension | undefined, result: CustomCommandResult} {
	let dimension: Dimension | undefined
	if (origin.sourceEntity && origin.sourceEntity.isValid) {
		dimension = origin.sourceEntity.dimension;
	} else if (origin.initiator && origin.initiator.isValid) {
		dimension = origin.initiator.dimension;
	} else if (origin.sourceBlock && origin.sourceBlock.isValid) {
		dimension = origin.sourceBlock.dimension;
	} else {
		return {
			dimension: undefined,
			result: {
				status: CustomCommandStatus.Failure,
				message: "Unable to get valid dimension from command origin"
			}
		}
	}
	return {
		dimension: dimension,
		result: {
			status: CustomCommandStatus.Success
		}
	}
}

export function blockxGetBlock(context: GivexContext, location: Vector3): {block: Block | undefined, result: CustomCommandResult} {
	const dimensionResult = getDimensionFromOrigin(context.origin);
	if (dimensionResult.dimension === undefined) {
		return {
			block: undefined,
			result: dimensionResult.result
		}
	}
	const dimension = dimensionResult.dimension;
		let block: Block | undefined;
		try {
			block = dimension.getBlock(location);
		} catch (error) {
			let errorMessage: string | undefined;
			if (error instanceof Error) {
				errorMessage = error.message;
			}
			return {
					block: undefined,
					result: {
						message: givexFormatMessage(
							context,
							0,
							errorMessage ?? `Unable to get block at location ${vector3ToString(location)}`,
							undefined,
						),
						status: CustomCommandStatus.Failure,
					}
				};
		}
		if (block === undefined) {
			return {
				block: undefined,
				result: {
					message: givexFormatMessage(
					context,
					0,
					`Unable to get block at location ${vector3ToString(location)}`,
					undefined,
				),
				status: CustomCommandStatus.Failure,
				}
			};
		}
	return {
		block: block,
		result: {
			status: CustomCommandStatus.Success
		}
	}
}
