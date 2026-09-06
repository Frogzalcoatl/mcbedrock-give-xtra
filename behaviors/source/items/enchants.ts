import {
	type Enchantment,
	ItemComponentTypes,
	type ItemEnchantableComponent,
	type ItemStack,
} from "@minecraft/server";

// Returns index of incompatible enchant if applicable
export function applyEnchants(enchants: Enchantment[], item: ItemStack): number | null {
	if (enchants.length === 0) {
		return null;
	}
	const enchantable: ItemEnchantableComponent | undefined = item.getComponent(
		ItemComponentTypes.Enchantable,
	);
	if (enchantable === undefined) {
		return 0;
	}
	for (let i: number = 0; i < enchants.length; i++) {
		const current: Enchantment | undefined = enchants[i];
		if (current === undefined) {
			return i;
		}
		try {
			enchantable.addEnchantment(current);
		} catch (_error) {
			// forced to use try catch since enchantable.canAddEnchantment does not consider conflicts
			// (ex: sharpness and smite cannot be applied to same item)
			return i;
		}
	}
	return null;
}
