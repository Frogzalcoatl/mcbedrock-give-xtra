import "@minecraft/server";
import type { Container, ItemStack, ItemType, Player } from "@minecraft/server";
import { prettyTypeId } from "./prettyTypeId";
import type { BooleanWithMessage } from "./types";

// Determines whether a container has at least x amount of item type. Returns array of slot ids containing item type.
export function hasItemAmount(
	container: Container,
	item: ItemType,
	amountToFind: number,
): { bool: boolean; inSlots: number[] } {
	if (amountToFind === 0) {
		return {
			bool: true,
			inSlots: [],
		};
	}
	if (amountToFind < 0) {
		return {
			bool: false,
			inSlots: [],
		};
	}
	let amountFound: number = 0;
	const inSlots: number[] = [];
	for (let i = 0; i < container.size; i++) {
		const slotItem = container.getItem(i);
		if (!slotItem) {
			continue;
		}

		if (slotItem.type.id === item.id) {
			amountFound += slotItem.amount;
			inSlots.push(i);
		}

		if (amountFound >= amountToFind) {
			return {
				bool: true,
				inSlots: inSlots,
			};
		}
	}
	return {
		bool: false,
		inSlots: inSlots,
	};
}

// Works similarly to the /clear command. Only difference is that it will not clear if container does not have enough of requested item.
// If amountToClear is undefined, clears all instances of item.
export function clearItem(
	container: Container,
	item: ItemType,
	amountToClear?: number,
): BooleanWithMessage {
	if (amountToClear === 0) {
		return {
			bool: true,
			message: `Cleared 0 ${prettyTypeId(item.id)} (as requested)`,
		};
	}
	if (amountToClear !== undefined && amountToClear < 0) {
		return {
			bool: false,
			message: "Unable to clear negative amount of item. (Use give instead?)",
		};
	}
	const hasItemAmountResult = hasItemAmount(container, item, amountToClear ?? 1);
	if (!hasItemAmountResult.bool) {
		return {
			bool: false,
			message: `Not enough ${prettyTypeId(item.id)}`,
		};
	}
	const inSlots: number[] = hasItemAmountResult.inSlots;

	// Clears all instances of item when amountToClear is undefined
	if (amountToClear === undefined) {
		for (const slot of inSlots) {
			const slotItem = container.getItem(slot);
			if (!slotItem) {
				continue;
			}
			if (slotItem.type.id === item.id) {
				container.setItem(slot);
			}
		}
		return {
			bool: true,
			message: `Cleared all instances of ${prettyTypeId(item.id)}`,
		};
	}

	// Clears a specific amount of an item
	let amountLeft: number = amountToClear;
	for (const slot of inSlots) {
		const slotItem = container.getItem(slot);
		if (!slotItem) {
			continue;
		}
		if (slotItem.amount <= amountLeft) {
			amountLeft -= slotItem.amount;
			container.setItem(slot);
		} else {
			slotItem.amount -= amountLeft;
			container.setItem(slot, slotItem);
			break;
		}
	}

	if (amountLeft !== 0) {
		return {
			bool: false,
			message: `Did not clear intended amount of ${prettyTypeId(item.id)}. (amountLeftToClear = ${amountLeft})`,
		};
	}

	return {
		bool: true,
		message: `Cleared ${amountToClear}x ${prettyTypeId(item.id)}`,
	};
}

export function giveItem(
	player: Player,
	container: Container,
	itemStack: ItemStack,
	amountToGive: number = 1,
): BooleanWithMessage {
	let amountLeft: number = amountToGive;
	while (amountLeft > 0) {
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		const result = container.addItem(itemStack);

		// Inventory is full
		if (result !== undefined) {
			break;
		}

		amountLeft -= itemStack.amount;
	}

	// Items should be spawned as entities
	while (amountLeft > 0) {
		if (!player.isValid) {
			return {
				bool: false,
				message: `Only able to give ${player.name} ${amountToGive - amountLeft}/${amountToGive} ${prettyTypeId(itemStack.type.id)}. Unable to spawn items on invalid player.`,
			};
		}
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		player.dimension.spawnItem(itemStack, {
			x: player.location.x,
			y: player.location.y + 1,
			z: player.location.z,
		});
		amountLeft -= itemStack.amount;
	}

	return {
		bool: true,
		message: `Gave ${player.name} ${amountToGive} ${prettyTypeId(itemStack.type.id)}`,
	};
}
