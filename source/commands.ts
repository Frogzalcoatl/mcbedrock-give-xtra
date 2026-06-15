import {
	CommandPermissionLevel,
	type CustomCommand,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandResult,
	CustomCommandSource,
	CustomCommandStatus,
	type Entity,
	ItemStack,
	type ItemType,
	Player,
	PlayerPermissionLevel,
	system,
	world,
} from "@minecraft/server";
import { giveItems } from "./containers";
import { getItemCommandDataValue } from "./dataValueItems";
import { HelpForm, showForm } from "./forms";
import { ItemDataValidation, parseItemData } from "./itemData";
import { dataToStack } from "./itemStack";
import { appendColorAfterResets, getEntityName, prettyTypeId } from "./prettyTypeId";
import type { ItemData, SlotData } from "./types";

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
	if (origin.sourceType === CustomCommandSource.Block && world.gameRules.commandBlockOutput) {
		// §7 makes text gray, §o italicizes, §r resets formatting
		// Using same format as commandblockoutput in game
		world.sendMessage(
			`§7§o[CommandBlock§r:\n${status === CustomCommandStatus.Failure ? "§c" : ""}${message}§r]`,
		);
	}
}

function getSelectorName(entities: Entity[]): string {
	if (entities.length > 1) {
		return "selectors";
	} else if (entities.length === 1) {
		const entity: Entity | undefined = entities[0];
		if (entity) {
			return getEntityName(entity);
		} else {
			return "selector";
		}
	} else {
		return "unknown selector";
	}
}

function getGivexMessage(
	entities: Entity[],
	itemTypeId: string,
	itemAmount: number,
	selectorName: string,
	successCount: number,
	errors: string,
	specialIdentifier: string | undefined,
): string {
	let message: string = "";
	let itemName: string = prettyTypeId(itemTypeId);
	if (specialIdentifier) {
		specialIdentifier = `${specialIdentifier.slice(0, 256)}${specialIdentifier.length > 256 ? "..." : ""}`;
		specialIdentifier = prettyTypeId(specialIdentifier);
		itemName = `${specialIdentifier} ${itemName}`;
	}
	if (successCount === entities.length) {
		message = `Gave ${itemName}§r * ${itemAmount} to ${selectorName}§r`;
	} else if (successCount > 0) {
		message = `Gave ${itemName}§r * ${itemAmount} to ${selectorName}§r\n§6However, failed to give to ${entities.length - successCount}/${entities.length} entit${entities.length - successCount !== 1 ? "ies" : "y"}`;
	} else {
		message = `§cUnable to give ${itemName}§r§c to ${selectorName}§r§c`;
	}
	if (errors) {
		errors = appendColorAfterResets(errors, "§c");
		message += `\n§cError(s):\n${errors.slice(0, 1024)}${errors.length > 1024 ? "...\n" : ""}`;
	}
	return message;
}

function runGivex(
	entities: Entity[],
	itemStack: ItemStack,
	origin: CustomCommandOrigin,
	selectorName: string,
	amountToGive: number,
	slot: SlotData | undefined,
	itemDataValue: number,
	specialIdentifier: string | undefined, // For potions, tipped arrows, bed colors
): void {
	system.run(() => {
		let errors: string = "";
		let successCount: number = 0;
		for (const entity of entities) {
			const result = giveItems(entity, itemStack, amountToGive, slot, itemDataValue);
			if (result.bool) {
				successCount++;
			} else {
				errors += `-${result.message}\n`;
			}
		}
		afterTickCommandResultHandler(
			origin,
			getGivexMessage(
				entities,
				itemStack.typeId,
				amountToGive,
				selectorName,
				successCount,
				errors,
				specialIdentifier,
			),
			successCount > 0 ? CustomCommandStatus.Success : CustomCommandStatus.Failure,
		);
	});
}

export const GIVEX_COMMAND: CustomCommand = {
	description: "Give items with specific properties.",
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
	const entities: Entity[] = selectorResult;
	const selectorName: string = getSelectorName(entities);
	if (entities.length === 0) {
		const message: string = getGivexMessage(
			entities,
			itemType.id,
			amount,
			selectorName,
			0,
			"No valid selector",
			undefined,
		);
		const status = CustomCommandStatus.Failure;
		commandBlockOutputMessage(origin, message, status);
		return {
			message: message,
			status: CustomCommandStatus.Failure,
		};
	}
	if (json === undefined) {
		runGivex(
			entities,
			new ItemStack(itemType.id),
			origin,
			selectorName,
			amount,
			undefined,
			getItemCommandDataValue(itemType.id, undefined),
			undefined,
		);
		return {
			message: "Ran givex",
			status: CustomCommandStatus.Success,
		};
	}
	const itemDataResult = parseItemData(json, itemType.id, amount);
	if (itemDataResult.itemData === undefined) {
		const message: string = getGivexMessage(
			entities,
			itemType.id,
			amount,
			selectorName,
			0,
			itemDataResult.syntaxError ?? "Unknown error in your json. (sorry)",
			undefined,
		);
		const status = CustomCommandStatus.Failure;
		commandBlockOutputMessage(origin, message, status);
		return {
			message: message,
			status: status,
		};
	}
	const itemData: ItemData = itemDataResult.itemData;
	const validationResult = ItemDataValidation.complete(itemData);
	if (!validationResult.bool) {
		const message = getGivexMessage(
			entities,
			itemType.id,
			amount,
			selectorName,
			0,
			validationResult.message,
			undefined,
		);
		const status = CustomCommandStatus.Failure;
		commandBlockOutputMessage(origin, message, status);
		return {
			message: message,
			status: status,
		};
	}
	system.run(() => {
		const itemStackResult = dataToStack(itemData);
		if (itemStackResult.item === undefined) {
			afterTickCommandResultHandler(
				origin,
				getGivexMessage(
					entities,
					itemType.id,
					amount,
					selectorName,
					0,
					itemStackResult.warning ?? "Failed to create item stack.",
					undefined,
				),
				CustomCommandStatus.Failure,
			);
			return;
		}
		const itemStack = itemStackResult.item;
		let specialIdentifier: string | undefined;
		if (itemData.potionType) {
			specialIdentifier = itemData.potionType;
		} else if (itemData.arrowType) {
			specialIdentifier = itemData.arrowType;
		} else if (itemData.bedColor) {
			specialIdentifier = itemData.bedColor;
		}
		// Used for items that still use the old data system instead of individual typeIds
		let itemCommandDataValue: number = 0;
		if (itemData.arrowType) {
			itemCommandDataValue = getItemCommandDataValue(itemData.typeId, itemData.arrowType);
		} else if (itemData.bedColor) {
			itemCommandDataValue = getItemCommandDataValue(itemData.typeId, itemData.bedColor);
		}
		runGivex(
			entities,
			itemStack,
			origin,
			selectorName,
			itemData.amount,
			itemData.slot,
			itemCommandDataValue,
			specialIdentifier,
		);
	});
	return {
		message: `Ran givex`,
		status: CustomCommandStatus.Success,
	};
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
