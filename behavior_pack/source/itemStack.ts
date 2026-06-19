import {
	type DimensionLocation,
	type Enchantment,
	EnchantmentLevelOutOfBoundsError,
	type EnchantmentType,
	EnchantmentTypeNotCompatibleError,
	EnchantmentTypes,
	EnchantmentTypeUnknownIdError,
	ItemComponentTypes,
	type ItemDurabilityComponent,
	type ItemEnchantableComponent,
	ItemStack,
	Potions,
} from "@minecraft/server";
import {
	type GetDataValueItemResult,
	getCommandDataValue,
	getDataValueItem,
} from "./dataValueItems";
import { ItemPropertiesValidation, itemTypeToPotionDeliveryType } from "./itemProperties";
import type { BooleanWithMessage, EnchantData, ItemDurability, ItemProperties } from "./types";

export function applyDurability(item: ItemStack, value: ItemDurability): BooleanWithMessage {
	const durabilityComponent: ItemDurabilityComponent | undefined = item.getComponent(
		ItemComponentTypes.Durability,
	);
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

export function applyEnchantData(
	enchantableComponent: ItemEnchantableComponent,
	data: EnchantData,
): BooleanWithMessage {
	const enchantType: EnchantmentType | undefined = EnchantmentTypes.get(data.id);
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

interface CreatePotionItemResult {
	item: ItemStack | undefined;
	message: string;
}
function createPotionItem(potionType: string, itemTypeId: string): CreatePotionItemResult {
	const deliveryType: string | undefined = itemTypeToPotionDeliveryType(itemTypeId);
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

export interface PropertiesToItemStackResult {
	item: ItemStack | undefined;
	warnings: string | undefined;
}
export function propertiesToItemStack(
	properties: ItemProperties,
	locationOfSelector: DimensionLocation,
): PropertiesToItemStackResult {
	let itemStack: ItemStack;
	try {
		if (!properties.potionType) {
			itemStack = new ItemStack(properties.typeId);
		} else {
			const potionItemResult: CreatePotionItemResult = createPotionItem(
				properties.potionType,
				properties.typeId,
			);
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
	if (properties.slot !== undefined) {
		if (properties.amount > itemStack.maxAmount) {
			return {
				item: undefined,
				warnings: `Amount ${properties.amount} exceeds maximum for ${properties.typeId} (${itemStack.maxAmount})\nIf you would like to give an amount exceeding the max stack size, you cannot select a slot.`,
			};
		}
		itemStack.amount = properties.amount;
	}
	// Issues beyond this point are not fatal. Will just return a \n seperated list of warnings in a single string.
	let warning: string = "";
	if (properties.lockMode !== undefined) {
		if (ItemPropertiesValidation.lockMode(properties.lockMode)) {
			itemStack.lockMode = properties.lockMode;
		} else {
			warning += "Invalid lockMode. Skipped.\n";
		}
	}
	if (properties.nameTag !== undefined) {
		const nameTagResult: BooleanWithMessage = ItemPropertiesValidation.nameTag(
			properties.nameTag,
		);
		if (nameTagResult) {
			// Add §r to reset auto italicization
			itemStack.nameTag = `§r${properties.nameTag}`;
		} else {
			warning += `Invalid nameTag. Skipped.\n`;
		}
	}
	if (properties.durability !== undefined) {
		const result: BooleanWithMessage = applyDurability(itemStack, properties.durability);
		if (!result.bool) {
			warning += `${result.message}.\n`;
		}
	}
	if (properties.enchants !== undefined) {
		const enchantableComponent: ItemEnchantableComponent | undefined = itemStack.getComponent(
			ItemComponentTypes.Enchantable,
		);
		if (enchantableComponent === undefined || !enchantableComponent.isValid) {
			warning += `Unable to apply enchantments to ${itemStack.typeId}. Skipping\n`;
		} else {
			for (const enchant of properties.enchants) {
				const result: BooleanWithMessage = applyEnchantData(enchantableComponent, enchant);
				if (!result.bool) {
					warning += `${result.message}.\n`;
				}
			}
		}
	}
	if (properties.keepOnDeath !== undefined) {
		itemStack.keepOnDeath = properties.keepOnDeath;
	}
	if (properties.canPlaceOn !== undefined) {
		try {
			itemStack.setCanPlaceOn(properties.canPlaceOn);
		} catch (error) {
			let message: string = "Unable to set canPlaceOn";
			if (error instanceof Error) {
				message += `: ${error.message}`;
			}
			warning += `${message}\n`;
		}
	}
	if (properties.canDestroy !== undefined) {
		try {
			itemStack.setCanDestroy(properties.canDestroy);
		} catch (error) {
			let message: string = "Unable to set canDestroy";
			if (error instanceof Error) {
				message += `: ${error.message}`;
			}
			warning += `${message}\n`;
		}
	}
	const dataValue: number = getCommandDataValue(properties);
	if (dataValue !== 0) {
		const dataValueResult: GetDataValueItemResult = getDataValueItem(
			itemStack,
			dataValue,
			locationOfSelector,
		);
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
