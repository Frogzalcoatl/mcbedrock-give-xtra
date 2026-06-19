import {
	Block,
	type CustomCommandOrigin,
	type CustomCommandResult,
	CustomCommandSource,
	CustomCommandStatus,
	type DimensionLocation,
	Entity,
	ItemStack,
	type ItemType,
	Player,
	system,
	world,
} from "@minecraft/server";
import { giveItemToBlock, giveItemToEntity, spawnItemAtDimensionLocation } from "./containers";
import {
	ItemPropertiesValidation,
	type ParseCommandJsonResult,
	parseCommandJson,
} from "./itemProperties";
import { type PropertiesToItemStackResult, propertiesToItemStack } from "./itemStack";
import { appendColorAfterResets, prettyTypeId } from "./prettyTypeId";
import type { BooleanWithMessage, CommandType, ItemProperties } from "./types";

// Errors are often too long to fit in the command block ui, so send them in chat if commandblockoutput is enabled.
function commandBlockOutputMessage(origin: CustomCommandOrigin, result: CustomCommandResult): void {
	if (
		result.message &&
		origin.sourceType === CustomCommandSource.Block &&
		world.gameRules.commandBlockOutput
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

export class GivexCommand {
	private itemProperties: ItemProperties;
	public specialIdentifier: string | undefined;
	constructor(
		public commandType: CommandType,
		public origin: CustomCommandOrigin,
		public recievers: Entity[] | Block[] | DimensionLocation[],
		public selectorName: string,
		itemType: ItemType,
		itemAmount: number,
		public json: string | undefined,
	) {
		this.itemProperties = {
			amount: itemAmount,
			typeId: itemType.id,
		};
	}

	public formatMessage(successCount: number, errors: string): string {
		let message: string = "";
		let itemName: string = prettyTypeId(this.itemProperties.typeId);
		if (this.specialIdentifier) {
			itemName = `${this.specialIdentifier} ${itemName}`;
		}
		let actionWordPastTense: string = "";
		let actionWordPresentTense: string = "";
		let wordBeforeSelectorName: string = "";
		if (this.commandType === "givex" || this.commandType === "blockx") {
			if (
				this.itemProperties.slot === undefined ||
				this.itemProperties.slot.name === undefined
			) {
				actionWordPastTense = "Gave";
				actionWordPresentTense = "give";
				wordBeforeSelectorName = "to";
			} else {
				actionWordPastTense = "Set";
				actionWordPresentTense = "set";
				wordBeforeSelectorName = `in ${this.itemProperties.slot.name} for`;
			}
		} else if (this.commandType === "spawnx") {
			actionWordPastTense = "Spawned";
			actionWordPresentTense = "spawn";
			wordBeforeSelectorName = "at";
		}
		if (successCount === this.recievers.length) {
			message = `${actionWordPastTense} ${itemName} * ${this.itemProperties.amount} ${wordBeforeSelectorName} ${this.selectorName}§r`;
		} else if (successCount > 0) {
			message = `${actionWordPastTense} ${itemName} * ${this.itemProperties.amount} ${wordBeforeSelectorName} ${this.selectorName}§r`;
			message += `\n§6However, this failed for ${this.recievers.length - successCount}/${this.recievers.length} selectors`;
		} else {
			message = `§cUnable to ${actionWordPresentTense} ${itemName} ${wordBeforeSelectorName} ${this.selectorName}§r`;
		}
		if (errors) {
			message += `\n§cError(s):\n${errors.slice(0, 1024)}${errors.length > 1024 ? "...\n" : ""}`;
			message = appendColorAfterResets(message, "§c");
		}
		return message;
	}

	// Updates identifier to place before item name in return messages, ex: "Poison Potion" instead of just "Potion"
	private updateSpecialIdentifier(): void {
		let specialIdentifier: string = "";
		const properties: ItemProperties = this.itemProperties;
		if (properties.potionType) {
			specialIdentifier = properties.potionType;
		} else if (properties.arrowType) {
			specialIdentifier = properties.arrowType;
		} else if (properties.bedColor) {
			specialIdentifier = properties.bedColor;
		} else {
			return;
		}
		specialIdentifier = prettyTypeId(specialIdentifier);
		specialIdentifier = `${specialIdentifier.slice(0, 128)}${specialIdentifier.length > 128 ? "..." : ""}`;
		this.specialIdentifier = specialIdentifier;
	}

	private prepareItemProperties(): CustomCommandResult {
		if (this.recievers.length === 0) {
			return {
				message: "No valid selector",
				status: CustomCommandStatus.Failure,
			};
		}
		// Trying to access an itemstack created using minecraft:air crashes the world
		if (this.itemProperties.typeId === "minecraft:air") {
			return {
				message: this.formatMessage(0, `Invalid item type "Air"`),
				status: CustomCommandStatus.Failure,
			};
		}
		if (this.json === undefined) {
			return {
				status: CustomCommandStatus.Success,
			};
		}
		const propertiesResult: ParseCommandJsonResult = parseCommandJson(
			this.json,
			this.itemProperties.typeId,
			this.itemProperties.amount,
		);
		if (propertiesResult.properties === undefined) {
			return {
				message: this.formatMessage(
					0,
					propertiesResult.syntaxError ?? "Unknown error in your json. (sorry)",
				),
				status: CustomCommandStatus.Failure,
			};
		}
		this.itemProperties = propertiesResult.properties;
		const validationResult: BooleanWithMessage = ItemPropertiesValidation.full(
			this.itemProperties,
			this.commandType,
		);
		if (!validationResult.bool) {
			return {
				message: this.formatMessage(0, validationResult.message),
				status: CustomCommandStatus.Failure,
			};
		}
		this.updateSpecialIdentifier();
		return {
			status: CustomCommandStatus.Success,
		};
	}

	private giveItemStack(itemStack: ItemStack): CustomCommandResult {
		let errors: string = "";
		let successCount: number = 0;
		for (const reciever of this.recievers) {
			let result: BooleanWithMessage;
			if (reciever instanceof Entity) {
				result = giveItemToEntity(
					reciever,
					itemStack,
					this.itemProperties.amount,
					this.itemProperties.slot,
				);
			} else if (reciever instanceof Block) {
				result = giveItemToBlock(
					reciever,
					itemStack,
					this.itemProperties.amount,
					this.itemProperties.slot,
				);
			} else {
				result = spawnItemAtDimensionLocation(
					reciever,
					itemStack,
					this.itemProperties.amount,
				);
			}
			if (result.bool) {
				successCount++;
			} else {
				errors += `-${result.message}\n`;
			}
		}
		return {
			message: this.formatMessage(successCount, errors),
			status: successCount > 0 ? CustomCommandStatus.Success : CustomCommandStatus.Failure,
		};
	}

	private giveItemType(): CustomCommandResult {
		const itemStack: ItemStack = new ItemStack(this.itemProperties.typeId);
		const amountValidationResult: BooleanWithMessage = ItemPropertiesValidation.amount(
			this.itemProperties,
			this.commandType,
		);
		if (!amountValidationResult.bool) {
			return {
				message: this.formatMessage(0, amountValidationResult.message),
				status: CustomCommandStatus.Failure,
			};
		}
		return this.giveItemStack(itemStack);
	}

	private getLocationOfSomeReciever(): DimensionLocation | undefined {
		for (const reciever of this.recievers) {
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

	public run(): CustomCommandResult {
		const propertiesResult: CustomCommandResult = this.prepareItemProperties();
		if (propertiesResult.status === CustomCommandStatus.Failure) {
			commandBlockOutputMessage(this.origin, propertiesResult);
			return propertiesResult;
		}
		if (this.json === undefined) {
			// Give item with no special properties
			system.run(() => {
				const result: CustomCommandResult = this.giveItemType();
				afterTickCommandResultHandler(this.origin, result);
			});
			return {
				status: CustomCommandStatus.Success,
			};
		}
		system.run(() => {
			const aRecieverLocation: DimensionLocation | undefined =
				this.getLocationOfSomeReciever();
			if (aRecieverLocation === undefined) {
				afterTickCommandResultHandler(this.origin, {
					message: "Unable to get location of any reciever",
					status: CustomCommandStatus.Failure,
				});
				return;
			}
			const itemStackResult: PropertiesToItemStackResult = propertiesToItemStack(
				this.itemProperties,
				aRecieverLocation,
			);
			if (itemStackResult.item === undefined) {
				afterTickCommandResultHandler(this.origin, {
					message: itemStackResult.warnings ?? "Failed to create item stack",
					status: CustomCommandStatus.Failure,
				});
				return;
			}
			const giveResult: CustomCommandResult = this.giveItemStack(itemStackResult.item);
			if (itemStackResult.warnings) {
				giveResult.message = `${giveResult.message ?? ""}\nWarning(s):\n${itemStackResult.warnings}`;
			}
			afterTickCommandResultHandler(this.origin, giveResult);
		});
		return {
			status: CustomCommandStatus.Success,
		};
	}
}
