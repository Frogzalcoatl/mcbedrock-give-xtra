import {
	type Enchantment,
	EnchantmentLevelOutOfBoundsError,
	EnchantmentTypeNotCompatibleError,
	EnchantmentTypes,
	EnchantmentTypeUnknownIdError,
	InvalidItemStackError,
	ItemComponentTypes,
	type ItemEnchantableComponent,
	ItemStack,
} from "@minecraft/server";
import { ItemDataValidation } from "./itemData";
import type { BooleanWithMessage, EnchantData, ItemData, ItemDurability } from "./types";

function applyDurability(item: ItemStack, value: ItemDurability): BooleanWithMessage {
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
	if (value > durabilityComponent.maxDurability) {
		return {
			bool: false,
			message: "Durability cannot exceed max for item",
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

function applyEnchantData(
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
	} catch (e) {
		if (e instanceof EnchantmentLevelOutOfBoundsError) {
			return {
				bool: false,
				message: `Invalid enchantment level ${enchant.level} for ${enchant.type.id}. Max is ${enchant.type.maxLevel}`,
			};
		} else if (e instanceof EnchantmentTypeUnknownIdError) {
			return {
				bool: false,
				message: `Invalid enchantId "${enchant.type.id}"`,
			};
		} else if (e instanceof EnchantmentTypeNotCompatibleError) {
			return {
				bool: false,
				message: `${enchant.type} not compatible with item`,
			};
		} else {
			return {
				bool: false,
				message: `Unknown error occurred while applying ${enchant.type} to item`,
			};
		}
	}
	return {
		bool: true,
		message: `Applied ${enchant.type} to item`,
	};
}

export function dataToStack(data: ItemData): {
	item: ItemStack | undefined;
	warning: string | undefined;
} {
	let itemStack: ItemStack;
	try {
		itemStack = new ItemStack(data.typeId);
	} catch (error) {
		if (error instanceof InvalidItemStackError) {
			return {
				item: undefined,
				warning: `Invalid typeId: ${data.typeId}`,
			};
		} else if (error instanceof Error) {
			return {
				item: undefined,
				warning: error.message,
			};
		} else {
			return {
				item: undefined,
				warning: `Unknown error occurred due to typeId`,
			};
		}
	}
	if (data.slot) {
		if (data.amount > itemStack.maxAmount) {
			return {
				item: undefined,
				warning: `Amount ${data.amount} exceeds maximum for ${data.typeId} (${itemStack.maxAmount})\nIf you would like to give an amount exceeding the max stack size, you cannot select a slot.`,
			};
		}
		itemStack.amount = data.amount;
	}
	// Issues beyond this point are not fatal. Will just return a \n seperated list of warnings in a single string.
	let warning: string = "";
	if (data.lockMode) {
		if (ItemDataValidation.lockMode(data.lockMode)) {
			itemStack.lockMode = data.lockMode;
		} else {
			warning += "Invalid lockMode. Skipped.\n";
		}
	}
	if (data.nameTag) {
		const nameTagResult = ItemDataValidation.nameTag(data.nameTag);
		if (nameTagResult.bool) {
			// Add §r to reset auto italicization
			itemStack.nameTag = `§r${data.nameTag}`;
		} else {
			warning += `${nameTagResult.message}. Skipped.\n`;
		}
	}
	if (data.durability) {
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
	if (data.enchants) {
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
	return {
		item: itemStack,
		// Trim final \n if any warnings were added
		warning: warning.length > 0 ? warning.slice(0, warning.length - 1) : undefined,
	};
}
