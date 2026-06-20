import {
	Block,
	type CustomCommandOrigin,
	type CustomCommandResult,
	CustomCommandSource,
	CustomCommandStatus,
	type DimensionLocation,
	Entity,
	type ItemStack,
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
import { appendColorAfterResets, getSelectorName, prettyTypeId } from "./prettyTypeId";
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
	public selectorName: string;
	private _selectors: Entity[] | Block[] | DimensionLocation[];
	constructor(
		public commandType: CommandType,
		public origin: CustomCommandOrigin,
		selectors: Entity[] | Block[] | DimensionLocation[],
		itemType: ItemType,
		itemAmount: number,
		public json: string | undefined,
	) {
		this.itemProperties = {
			amount: itemAmount,
			slot: undefined,
			typeId: itemType.id,
		};
		this._selectors = selectors;
		this.selectorName = "";
		this.updateSelectorName();
	}

	public get selectors() {
		return this._selectors;
	}

	public set selectors(value: Entity[] | Block[] | DimensionLocation[]) {
		this._selectors = value;
		this.updateSelectorName();
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
		if (this.commandType === "spawnx") {
			actionWordPastTense = "Spawned";
			actionWordPresentTense = "spawn";
			wordBeforeSelectorName = "at";
		} else if (this.commandType === "givex" || this.commandType === "blockx") {
			if (
				this.itemProperties.slot !== undefined &&
				this.itemProperties.slot.name !== undefined
			) {
				actionWordPastTense = "Set";
				actionWordPresentTense = "set";
				wordBeforeSelectorName = `in ${this.itemProperties.slot.name}`;
				wordBeforeSelectorName +=
					this.itemProperties.slot.id !== undefined
						? ` ${this.itemProperties.slot.id}`
						: "";
				wordBeforeSelectorName += " for";
			} else {
				actionWordPastTense = "Gave";
				actionWordPresentTense = "give";
				wordBeforeSelectorName = "to";
			}
		}
		if (successCount === this._selectors.length) {
			message = `${actionWordPastTense} ${itemName} * ${this.itemProperties.amount} ${wordBeforeSelectorName} ${this.selectorName}`;
		} else if (successCount > 0) {
			message = `${actionWordPastTense} ${itemName} * ${this.itemProperties.amount} ${wordBeforeSelectorName} ${this.selectorName}`;
			message += `\n§6However, this failed for ${this._selectors.length - successCount}/${this._selectors.length} selectors`;
		} else {
			message = `§cUnable to ${actionWordPresentTense} ${itemName} ${wordBeforeSelectorName} ${this.selectorName}`;
		}
		if (
			successCount > 0 &&
			this.itemProperties.slot !== undefined &&
			this.itemProperties.slot.id !== undefined &&
			this.itemProperties.slot.keepOldItem === true
		) {
			message += `\n§6If any items were previously in slot ${this.itemProperties.slot.id}, they were given back to ${this.selectorName}§r`;
		}
		if (errors) {
			message += `\n§cError(s):\n${errors.slice(0, 1024)}${errors.length > 1024 ? "...\n" : ""}`;
			message = appendColorAfterResets(message, "§c");
		}
		return message;
	}

	// ex: "Poison Potion" instead of just "Potion"
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

	private updateSelectorName() {
		if (this._selectors.length > 1) {
			this.selectorName = "selectors";
			return;
		}
		const firstSelector = this.selectors[0];
		if (firstSelector === undefined) {
			this.selectorName = "unknown selector";
			return;
		}
		this.selectorName = getSelectorName(firstSelector);
	}

	private prepareItemProperties(): CustomCommandResult {
		if (this._selectors.length === 0) {
			return {
				message: "No valid selector",
				status: CustomCommandStatus.Failure,
			};
		}
		if (this.itemProperties.typeId === "minecraft:air") {
			// Trying to access an itemstack created using minecraft:air crashes the world
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
		for (const selector of this._selectors) {
			let result: BooleanWithMessage;
			if (selector instanceof Entity) {
				result = giveItemToEntity(
					selector,
					itemStack,
					this.itemProperties.amount,
					this.itemProperties.slot,
				);
			} else if (selector instanceof Block) {
				result = giveItemToBlock(
					selector,
					itemStack,
					this.itemProperties.amount,
					this.itemProperties.slot,
				);
			} else {
				result = spawnItemAtDimensionLocation(
					selector,
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

	private getLocationOfSomeSelector(): DimensionLocation | undefined {
		for (const selector of this._selectors) {
			if (selector instanceof Entity || selector instanceof Block) {
				if (!selector.isValid) {
					continue;
				}
				return {
					dimension: selector.dimension,
					x: selector.location.x,
					y: selector.location.y,
					z: selector.location.z,
				};
			} else {
				return selector;
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
		system.run(() => {
			const aSelectorLocation: DimensionLocation | undefined =
				this.getLocationOfSomeSelector();
			if (aSelectorLocation === undefined) {
				afterTickCommandResultHandler(this.origin, {
					message: "Unable to get location of any selector",
					status: CustomCommandStatus.Failure,
				});
				return;
			}
			const itemStackResult: PropertiesToItemStackResult = propertiesToItemStack(
				this.itemProperties,
				aSelectorLocation,
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
				giveResult.message = `${giveResult.message ?? ""}\nWarning(s):\n§6${appendColorAfterResets(itemStackResult.warnings, "§6")}`;
			}
			afterTickCommandResultHandler(this.origin, giveResult);
		});
		return {
			status: CustomCommandStatus.Success,
		};
	}
}
