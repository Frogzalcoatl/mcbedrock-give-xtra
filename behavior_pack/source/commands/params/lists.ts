import {
	type BlockType,
	BlockTypes,
	type Enchantment,
	type EnchantmentType,
	EnchantmentTypes,
} from "@minecraft/server";

// Returns invalid index (if it exists)
export function validBlockTypes(blockTypes: string[]): number | undefined {
	for (let i: number = 0; i < blockTypes.length; i++) {
		let current: string | undefined = blockTypes[i];
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
		if (typeof currentVal === "string") {
			if (currentEnchantType !== undefined) {
				enchantments.push({
					level: 1,
					type: currentEnchantType,
				});
			}
			if (currentVal.indexOf(":") === -1) {
				currentVal = `minecraft:${currentVal}`;
			}
			currentEnchantType = EnchantmentTypes.get(currentVal);
			if (currentEnchantType === undefined) {
				return i;
			}
		} else if (
			typeof currentVal === "number" &&
			currentEnchantType !== undefined &&
			currentVal >= 1 &&
			currentVal <= currentEnchantType.maxLevel
		) {
			enchantments.push({
				level: 1,
				type: currentEnchantType,
			});
		} else {
			return i;
		}
	}
	return enchantments;
}
