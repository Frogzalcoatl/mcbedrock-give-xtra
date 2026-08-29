import {
	type BlockType,
	BlockTypes,
	type Enchantment,
	type EnchantmentType,
	EnchantmentTypes,
} from "@minecraft/server";

// Comma separated lists
export function parseList(list: string): string[] {
	return list.split(/\s*,\s*/);
}

// Returns invalid index (if it exists)
export function validBlockTypes(list: string[]): number | undefined {
	for (let i: number = 0; i < list.length; i++) {
		let current: string | undefined = list[i];
		if (!current) {
			return i;
		}
		if (current.indexOf(":") === -1) {
			current = `minecraft:${current}`;
		}
		const blockType: BlockType | undefined = BlockTypes.get(current);
		if (blockType === undefined) {
			return i;
		}
	}
	return undefined;
}

// Ex valid enchant list: "protection, 4, mending, feather_falling"
// If level is not included, assume level 1
// Returns enchantments or invalid index
export function getEnchantsFromList(list: (string | number)[]): Enchantment[] | number {
	const enchantments: Enchantment[] = [];
	let currentEnchantType: EnchantmentType | undefined;
	for (let i: number = 0; i < list.length; i++) {
		let currentVal: string | number | undefined = list[i];
		if (currentVal === undefined) {
			return i;
		}
		if (currentEnchantType !== undefined) {
			if (typeof currentVal === "number") {
			}
			if (cu) {
				enchantments.push({
					level: 1,
					type: currentEnchantType,
				});
			} else if (enchantLevel >= 1 && enchantLevel <= currentEnchantType.maxLevel) {
				enchantments.push({
					level: enchantLevel,
					type: currentEnchantType,
				});
				currentEnchantType = undefined;
			} else {
				return i;
			}
		}
		if (currentVal.indexOf(":") === -1) {
			currentVal = `minecraft:${currentVal}`;
		}
		currentEnchantType = EnchantmentTypes.get(currentVal);
		if (currentEnchantType === undefined) {
			return i;
		}
	}
	return enchantments;
}
