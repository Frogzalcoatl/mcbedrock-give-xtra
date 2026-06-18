import {
	type DimensionLocation,
	type Enchantment,
	EnchantmentLevelOutOfBoundsError,
	EnchantmentTypeNotCompatibleError,
	EnchantmentTypes,
	EnchantmentTypeUnknownIdError,
	ItemComponentTypes,
	type ItemEnchantableComponent,
	ItemStack,
	Potions,
} from "@minecraft/server";
import { getCommandDataValue, getDataValueItem } from "./dataValueItems";
import { ItemDataValidation, itemTypeToPotionDeliveryType } from "./itemData";
import type { BooleanWithMessage, EnchantData, ItemData, ItemDurability } from "./types";

export function applyDurability(item: ItemStack, value: ItemDurability): BooleanWithMessage {
	const durabilityComponent = item.getComponent(ItemComponentTypes.Durability);
	if (durabilityComponent === undefined || !durabilityComponent.isValid) {
		return {
			bool: false,
			message: "Unable to apply durability to item",
		};
	}
	if (value === "unbreakable") {
		durabilityComponent.unbreakable = true;
		return {
			bool: true,
			message: "Durability set to unbreakable",
		};
	}
	if (value > durabilityComponent.maxDurability || value < 0) {
		return {
			bool: false,
			message: `Durability must be with range 0-${durabilityComponent.maxDurability} for this item`,
		};
	}
	durabilityComponent.damage = durabilityComponent.maxDurability - value;
	return {
		bool: true,
		message: `Durability set to ${value}`,
	};
}

/* Will add back once mojang fixes dyeable component (Bug tracker MCPE-237577 and MCPE-232617)

function applyDye(item: ItemStack, color: RGB): BooleanWithMessage {
	const dyeableComponent = item.getComponent(ItemComponentTypes.Dyeable);
	if (dyeableComponent === undefined || !dyeableComponent.isValid) {
		return {
			bool: false,
			message: "Unable to apply dye to this item",
		};
	}
	dyeableComponent.color = color;
	return {
		bool: true,
		message: "Set dye on item",
	};
}
*/

export function applyEnchantData(
	enchantableComponent: ItemEnchantableComponent,
	data: EnchantData,
): BooleanWithMessage {
	const enchantType = EnchantmentTypes.get(data.id);
	if (enchantType === undefined) {
		return {
			bool: false,
			message: `Invalid enchantId "${data.id}"`,
		};
	}
	const enchant: Enchantment = {
		level: data.level,
		type: enchantType,
	};
	try {
		enchantableComponent.addEnchantment(enchant);
	} catch (error) {
		let message: string = `Unable to apply ${enchant.type} to item`;
		if (error instanceof EnchantmentLevelOutOfBoundsError) {
			message = `Invalid enchantment level ${enchant.level} for ${enchant.type.id}. Max is ${enchant.type.maxLevel}`;
		} else if (error instanceof EnchantmentTypeUnknownIdError) {
			message = `Invalid enchantId "${enchant.type.id}"`;
		} else if (error instanceof EnchantmentTypeNotCompatibleError) {
			message = `${enchant.type} not compatible with item`;
		}
		return {
			bool: false,
			message: message,
		};
	}
	return {
		bool: true,
		message: `Applied ${enchant.type} to item`,
	};
}

function createPotionItem(
	potionType: string,
	itemTypeId: string,
): {
	item: ItemStack | undefined;
	message: string;
} {
	const deliveryType = itemTypeToPotionDeliveryType(itemTypeId);
	if (deliveryType === undefined) {
		return {
			item: undefined,
			message: `${itemTypeId} is not compatible with potionType`,
		};
	}
	let item: ItemStack;
	let message: string = "Unable to create potion item";
	try {
		item = Potions.resolve(potionType, deliveryType);
		return {
			item: item,
			message: "Created potion item",
		};
	} catch (error) {
		if (error instanceof Error) {
			message += `: ${error.message}`;
		}
	}
	return {
		item: undefined,
		message: message,
	};
}

// Cannot be run in restricted execution
export function dataToStack(
	data: ItemData,
	locationOfReciever: DimensionLocation,
): {
	item: ItemStack | undefined;
	warnings: string | undefined;
} {
	let itemStack: ItemStack;
	try {
		if (!data.potionType) {
			itemStack = new ItemStack(data.typeId);
		} else {
			const potionItemResult = createPotionItem(data.potionType, data.typeId);
			if (potionItemResult.item) {
				itemStack = potionItemResult.item;
			} else {
				return {
					item: undefined,
					warnings: potionItemResult.message,
				};
			}
		}
	} catch (error) {
		let message: string = `Unable to create item`;
		if (error instanceof Error) {
			message += `: ${error.message}`;
		}
		return {
			item: undefined,
			warnings: message,
		};
	}
	if (data.slot !== undefined) {
		if (data.amount > itemStack.maxAmount) {
			return {
				item: undefined,
				warnings: `Amount ${data.amount} exceeds maximum for ${data.typeId} (${itemStack.maxAmount})\nIf you would like to give an amount exceeding the max stack size, you cannot select a slot.`,
			};
		}
		itemStack.amount = data.amount;
	}
	// Issues beyond this point are not fatal. Will just return a \n seperated list of warnings in a single string.
	let warning: string = "";
	if (data.lockMode !== undefined) {
		if (ItemDataValidation.lockMode(data.lockMode)) {
			itemStack.lockMode = data.lockMode;
		} else {
			warning += "Invalid lockMode. Skipped.\n";
		}
	}
	if (data.nameTag !== undefined) {
		const nameTagResult = ItemDataValidation.nameTag(data.nameTag);
		if (nameTagResult) {
			// Add §r to reset auto italicization
			itemStack.nameTag = `§r${data.nameTag}`;
		} else {
			warning += `Invalid nameTag. Skipped.\n`;
		}
	}
	if (data.durability !== undefined) {
		const result = applyDurability(itemStack, data.durability);
		if (!result.bool) {
			warning += `${result.message}.\n`;
		}
	}
	/* Will add back once mojang fixes dyeable component (Bug tracker MCPE-237577 and MCPE-232617)
	if (data.dye) {
		const result = applyDye(itemStack, data.dye);
		if (!result.bool) {
			warning += `${result.message}.\n`;
		}
	}
	*/
	if (data.enchants !== undefined) {
		const enchantableComponent = itemStack.getComponent(ItemComponentTypes.Enchantable);
		if (enchantableComponent === undefined || !enchantableComponent.isValid) {
			warning += `Unable to apply enchantments to ${itemStack.typeId}. Skipping\n`;
		} else {
			for (const enchant of data.enchants) {
				const result = applyEnchantData(enchantableComponent, enchant);
				if (!result.bool) {
					warning += `${result.message}.\n`;
				}
			}
		}
	}
	if (data.keepOnDeath !== undefined) {
		itemStack.keepOnDeath = data.keepOnDeath;
	}
	if (data.canPlaceOn !== undefined) {
		try {
			itemStack.setCanPlaceOn(data.canPlaceOn);
		} catch (error) {
			let message: string = "Unable to set canPlaceOn";
			if (error instanceof Error) {
				message += `: ${error.message}`;
			}
			warning += `${message}\n`;
		}
	}
	if (data.canDestroy !== undefined) {
		try {
			itemStack.setCanDestroy(data.canDestroy);
		} catch (error) {
			let message: string = "Unable to set canDestroy";
			if (error instanceof Error) {
				message += `: ${error.message}`;
			}
			warning += `${message}\n`;
		}
	}
	const dataValue: number = getCommandDataValue(data);
	if (dataValue !== 0) {
		const dataValueResult = getDataValueItem(itemStack, dataValue, locationOfReciever);
		if (dataValueResult.item !== undefined) {
			itemStack = dataValueResult.item;
		} else {
			warning += `Unable to apply data value ${dataValue} to item.\n${dataValueResult.message}. Skipped\n`;
		}
	}
	return {
		item: itemStack,
		// Trim final \n if any warnings were added
		warnings: warning.length > 0 ? warning.slice(0, warning.length - 1) : undefined,
	};
}
