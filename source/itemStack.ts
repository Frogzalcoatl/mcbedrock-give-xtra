import { Enchantment, EnchantmentLevelOutOfBoundsError, EnchantmentTypeNotCompatibleError, EnchantmentTypes, EnchantmentTypeUnknownIdError, InvalidItemStackError, ItemComponentTypes, ItemEnchantableComponent, ItemStack, RGB } from "@minecraft/server";
import { BooleanWithMessage, EnchantData, ItemData } from "./types";
import { ITEM_DATA_VALIDATION } from "./itemData";

function setDurability(item: ItemStack, value: number): BooleanWithMessage {
	const durabilityComponent = item.getComponent(ItemComponentTypes.Durability);
	if (durabilityComponent === undefined || !durabilityComponent.isValid) {
		return {
			bool: false,
			message: "Unable to apply durability to item"
		};
	}
	if (value > durabilityComponent.maxDurability && value !== Infinity) {
		return {
			bool: false,
			message: "Durability cannot exceed max for item"
		};
	}
	if (value === Infinity) {
		durabilityComponent.unbreakable = true;
		return {
			bool: true,
			message: "Durability set to Infinity (unbreakable)"
		};
	}
	durabilityComponent.damage = durabilityComponent.maxDurability - value;
	return {
		bool: true,
		message: `Durability set to ${value}`
	};
}

function setDye(item: ItemStack, color: RGB): BooleanWithMessage {
	const dyeableComponent = item.getComponent(ItemComponentTypes.Dyeable);
	if (dyeableComponent === undefined || !dyeableComponent.isValid) {
		return {
			bool: false,
			message: "Unable to apply dye to this item"
		};
	}
	dyeableComponent.color = color;
	return {
		bool: true,
		message: "Set dye on item"
	};
}

function applyEnchantData(enchantableComponent: ItemEnchantableComponent, data: EnchantData): BooleanWithMessage {
	const enchantType = EnchantmentTypes.get(data.id);
	if (enchantType === undefined) {
		return {
			bool: false,
			message: "Invalid enchantId"
		};
	}
	const enchant: Enchantment = {
		type: enchantType,
		level: data.level
	}
	try {
		enchantableComponent.addEnchantment(enchant);
	} catch (e) {
		if (e instanceof EnchantmentLevelOutOfBoundsError) {
			return {
				bool: false,
				message: `Invalid enchantment level ${enchant.level} for ${enchant.type}`
			};
		} else if (e instanceof EnchantmentTypeUnknownIdError) {
			return {
				bool: false,
				message: "Invalid enchantId"
			};
		} else if (e instanceof EnchantmentTypeNotCompatibleError) {
			return {
				bool: false,
				message: `${enchant.type} not compatible with item`
			};
		} else {
			return {
				bool: false,
				message: `Unknown error occurred while applying enchant ${enchant.type}`
			};
		}
	}
	return {
		bool: true,
		message: `Applied ${enchant.type} to item`
	};
}

export function dataToStack(data: ItemData): { item: ItemStack | undefined; warning: string | undefined } {
	let itemStack: ItemStack;
	try {
		itemStack = new ItemStack(data.typeId)
	} catch (error) {
		if (error instanceof InvalidItemStackError) {
			return {
				item: undefined,
				warning: `Invalid typeId: ${data.typeId}`
			};
		} else {
			return {
				item: undefined,
				warning: `Unknown error occurred due to typeId`
			};
		}
	}
	// Issues beyond this point are not fatal. Will just return a \n seperated list of warnings in a single string.
	let warning: string = "";
	// Skipping ItemData.amount, that would be passed into the give function.
	if (data.lockMode) {
		if (ITEM_DATA_VALIDATION.lockMode(data.lockMode)) {
			itemStack.lockMode = data.lockMode;
		} else {
			warning += "Invalid lockMode. Skipped.\n";
		}
	}
	if (data.nameTag) {
		const nameTagResult = ITEM_DATA_VALIDATION.nameTag(data.nameTag);
		if (nameTagResult.bool) {
			itemStack.nameTag = data.nameTag;
		} else {
			warning += `${nameTagResult.message}. Skipped.\n`;
		}
	}
	if (data.durability) {
		const result = setDurability(itemStack, data.durability);
		if (!result.bool) {
			warning += `${result.message}.\n`;
		}
	}
	if (data.dye) {
		const result = setDye(itemStack, data.dye);
		if (!result.bool) {
			warning += `${result.message}.\n`;
		}
	}
	if (data.enchants) {
		const enchantableComponent = itemStack.getComponent(ItemComponentTypes.Enchantable);
		if (enchantableComponent === undefined || !enchantableComponent.isValid) {
			warning += `Unable to apply enchantments to ${data.typeId}. Skipping\n`;
		} else {
			for (const enchant of data.enchants) {
				const result = applyEnchantData(enchantableComponent, enchant);
				if (!result.bool) {
					warning += `${result.message}.\n`;
				}
			}
		}
	}
	// Skipping ItemData.slot. Only relevant when giving the item.
	return {
		item: itemStack,
		// Trim final \n if any warnings were added
		warning: warning.length > 0 ? warning.slice(0, warning.length - 1) : undefined
	};
}
