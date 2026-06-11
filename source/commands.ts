import {
	CommandPermissionLevel,
	type CustomCommand,
	type CustomCommandOrigin,
	CustomCommandParamType,
	type CustomCommandResult,
	CustomCommandSource,
	CustomCommandStatus,
	type Entity,
	EntityComponentTypes,
	type ItemStack,
	Player,
	system,
	world,
} from "@minecraft/server";
import { giveItem, replaceItem } from "./containers";
import { ItemDataValidation, parseItemData } from "./itemData";
import { dataToStack } from "./itemStack";
import { prettyTypeId } from "./prettyTypeId";
import type { ItemData } from "./types";

const NAMESPACE: string = "givex";

const GIVEX_COMMAND: CustomCommand = {
	description: "Give items with specific properties",
	mandatoryParameters: [
		{
			name: "json",
			type: CustomCommandParamType.String,
		},
	],
	name: `${NAMESPACE}:givex`,
	optionalParameters: [
		{
			name: "target",
			type: CustomCommandParamType.EntitySelector,
		},
	],
	permissionLevel: CommandPermissionLevel.GameDirectors,
};

function afterTickCommandResultHandler(
	origin: CustomCommandOrigin,
	result: CustomCommandResult,
): void {
	if (result.message === undefined) {
		return;
	}
	if (origin.sourceBlock && world.gameRules.commandBlockOutput) {
		// §7 makes text gray, §o italicizes
		// Using same format as commandblockoutput in game
		world.sendMessage(`§7§o[CommandBlock§r: ${result.message}]`);
	} else if (
		origin.sourceEntity &&
		origin.sourceEntity instanceof Player &&
		world.gameRules.sendCommandFeedback
	) {
		origin.sourceEntity.sendMessage(
			`${result.status === CustomCommandStatus.Failure ? "§c" : ""}${result.message}`,
		);
	} else if (
		origin.initiator &&
		origin.initiator instanceof Player &&
		world.gameRules.sendCommandFeedback
	) {
		origin.initiator.sendMessage(
			`${result.status === CustomCommandStatus.Failure ? "§c" : ""}${result.message}`,
		);
	}
}

function getCommandEntities(
	origin: CustomCommandOrigin,
	selectorResult?: Entity[],
): Entity[] | undefined {
	if (selectorResult) {
		if (selectorResult.length > 0) {
			return selectorResult;
		} else {
			return undefined;
		}
	} else if (origin.sourceEntity) {
		return [origin.sourceEntity];
	} else if (origin.initiator) {
		return [origin.initiator];
	} else {
		return undefined;
	}
}

function getSelectorName(entities: Entity[]): string {
	if (entities.length > 1) {
		return "selectors";
	} else if (entities.length === 1) {
		const entity: Entity | undefined = entities[0];
		if (entity) {
			return entity.nameTag ? entity.nameTag : entity.typeId;
		} else {
			return "selector";
		}
	} else {
		return "unknown selector";
	}
}

function getGivexMessage(
	entities: Entity[],
	itemData: ItemData,
	selectorName: string,
	successCount: number,
	errors: string,
): string {
	let message: string = "";
	if (successCount === entities.length) {
		message = `Gave ${prettyTypeId(itemData.typeId)}§r * ${itemData.amount} to ${selectorName}§r`;
	} else if (successCount > 0) {
		message = `Gave ${prettyTypeId(itemData.typeId)}§r * ${itemData.amount} to ${selectorName}§r\n§6However, failed to give to ${entities.length - successCount}/${entities.length} entit${entities.length - successCount !== 1 ? "ies" : "y"}`;
	} else {
		message = `§cUnable to give ${itemData.typeId}§r§c to ${selectorName}§r§c`;
	}
	if (errors) {
		message += `\n§cError(s):\n${errors.slice(0, 1024)}${errors.length > 1024 ? "...\n" : ""}`;
	}
	return message;
}

function commandBlockFailureMessage(origin: CustomCommandOrigin, message: string): void {
	if (origin.sourceType === CustomCommandSource.Block && world.gameRules.commandBlockOutput) {
		world.sendMessage(`§7§o[CommandBlock§r:\n§c${message}§r]`);
	}
}

// Example givex command: /givex "{\"typeId\":\"minecraft:dirt\",\"amount\":1}"
// Players must use escape characters for double quotes: \"
function givexCommandCallback(
	origin: CustomCommandOrigin,
	json: string,
	selectorResult?: Entity[],
): CustomCommandResult {
	const entities: Entity[] | undefined = getCommandEntities(origin, selectorResult);
	if (entities === undefined) {
		const message = "Unable to give item to selector\nError(s):\nNo valid selector";
		commandBlockFailureMessage(origin, message);
		return {
			message: message,
			status: CustomCommandStatus.Failure,
		};
	}
	const selectorName: string = getSelectorName(entities);
	const itemDataResult = parseItemData(json);
	if (itemDataResult.itemData === undefined) {
		const message = `Unable to give item to ${selectorName}§r§c\nError(s):\n-${itemDataResult.syntaxError ?? "Unknown error in your json. (sorry)"}`;
		commandBlockFailureMessage(origin, message);
		return {
			message: message,
			status: CustomCommandStatus.Failure,
		};
	}
	const itemData: ItemData = itemDataResult.itemData;
	const validationResult = ItemDataValidation.complete(itemDataResult.itemData);
	if (!validationResult.bool) {
		const message = `Unable to give item to ${selectorName}§r§c\nError(s)\n${validationResult.message}`;
		commandBlockFailureMessage(origin, message);
		return {
			message: message,
			status: CustomCommandStatus.Failure,
		};
	}
	system.run(() => {
		const itemStackResult = dataToStack(itemData);
		if (itemStackResult.item === undefined) {
			afterTickCommandResultHandler(origin, {
				message: `Unable to give item to ${selectorName}§r§c\nError(s)\n${itemStackResult.warning ?? "Failed to create item stack."}`,
				status: CustomCommandStatus.Failure,
			});
			return;
		}
		const itemStack: ItemStack = itemStackResult.item;
		let successCount: number = 0;
		let errors: string = "";
		if (itemData.slot) {
			for (const entity of entities) {
				const result = replaceItem(entity, itemStack, itemData.slot);
				if (result.bool) {
					successCount++;
				} else {
					errors += `-${result.message}\n`;
				}
			}
		} else {
			for (const entity of entities) {
				const inventory = entity.getComponent(EntityComponentTypes.Inventory);
				if (inventory === undefined || !inventory.isValid) {
					errors += `-Unable to get inventory of ${entity.nameTag.length !== 0 ? entity.nameTag : entity.typeId}\n`;
					continue;
				}
				const result = giveItem(entity, inventory.container, itemStack, itemData.amount);
				if (result.bool) {
					successCount++;
				} else {
					errors += `-${result.message}\n`;
				}
			}
		}
		afterTickCommandResultHandler(origin, {
			message: getGivexMessage(entities, itemData, selectorName, successCount, errors),
			status: successCount > 0 ? CustomCommandStatus.Success : CustomCommandStatus.Failure,
		});
	});
	return {
		message: `Ran givex`,
		status: CustomCommandStatus.Success,
	};
}

// Use server ui to easily generate item data json
const HELP_COMMAND: CustomCommand = {
	description: "Easily generate a givex command",
	name: `${NAMESPACE}:help`,
	permissionLevel: CommandPermissionLevel.GameDirectors,
};

function helpCommandCallback(_origin: CustomCommandOrigin): CustomCommandResult {
	return {
		message: "In progress",
		status: CustomCommandStatus.Success,
	};
}

system.beforeEvents.startup.subscribe((e) => {
	e.customCommandRegistry.registerCommand(GIVEX_COMMAND, givexCommandCallback);
	e.customCommandRegistry.registerCommand(HELP_COMMAND, helpCommandCallback);
});
