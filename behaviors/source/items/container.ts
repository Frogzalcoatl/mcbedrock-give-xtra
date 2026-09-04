import {
	type Block,
	BlockComponentTypes,
	type BlockInventoryComponent,
	type Container,
	type CustomCommandResult,
	CustomCommandStatus,
	type Dimension,
	type Entity,
	EntityComponentTypes,
	type EntityEnderInventoryComponent,
	type EntityEquippableComponent,
	type EntityInventoryComponent,
	type EntityIsTamedComponent,
	EquipmentSlot,
	type ItemStack,
	Player,
	type Vector3,
} from "@minecraft/server";
import { getSelectorName, prettyTypeId, vector3ToString } from "../commands/utils/beautification";
import { SlotName } from "./slot";
import "@minecraft/vanilla-data";
import { MinecraftBlockTypes, MinecraftEntityTypes } from "@minecraft/vanilla-data";

function addItemsInContainer(
	selector: Entity | Block,
	container: Container,
	itemStack: ItemStack,
	amountToGive: number,
): CustomCommandResult {
	let amountLeft: number = amountToGive;
	while (amountLeft > 0) {
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		let result: ItemStack | undefined;
		try {
			// I don't feel like setting up a func to check whether adding an item follows the container's rules.
			result = container.addItem(itemStack);
		} catch (error) {
			let message: string = `Unable to add ${prettyTypeId(itemStack.typeId)} to container of ${getSelectorName(selector)}`;
			if (error instanceof Error) {
				message += `: ${error.message}`;
			}
			return {
				message: message,
				status: CustomCommandStatus.Failure,
			};
		}
		if (result !== undefined) {
			// Inventory is full
			amountLeft -= itemStack.amount - result.amount; // In case a partial itemStack was given
			break;
		}
		amountLeft -= itemStack.amount;
	}
	while (amountLeft > 0) {
		// Spawn remaining items as entities
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		if (!selector.dimension.isChunkLoaded(selector.location)) {
			return {
				message: `Unable to spawn ${prettyTypeId(itemStack.typeId)} on ${getSelectorName(selector)} in unloaded chunks.`,
				status: CustomCommandStatus.Failure,
			};
		}
		selector.dimension.spawnItem(itemStack, selector.location);
		amountLeft -= itemStack.amount;
	}
	return {
		message: `Gave ${prettyTypeId(itemStack.type.id)} * ${amountToGive} to ${getSelectorName(selector)}`,
		status: CustomCommandStatus.Success,
	};
}

function inContainer(
	selector: Entity | Block,
	container: Container,
	item: ItemStack,
	slot: string,
	slotId: number | null,
	replaceMode: string,
): CustomCommandResult {
	if (slotId === null) {
		if (slot !== SlotName.Hotbar) {
			return addItemsInContainer(selector, container, item, item.amount);
		} else {
			let addToSlot: number | undefined = container.find(item);
			if (addToSlot === undefined || addToSlot > 8) {
				addToSlot = container.firstEmptySlot();
				if (addToSlot === undefined) {
					addToSlot;
				}
			}
			let firstEmptySlot: number | undefined = container.firstEmptySlot();
			if (firstEmptySlot === undefined || firstEmptySlot > 8) {
				firstEmptySlot = 8;
			}
			slotId = firstEmptySlot;
			return inContainer(selector, container, item, slot, slotId, replaceMode);
		}
	}
	if (slotId < 0 || slotId >= container.size) {
		return {
			message: `slotId "${slotId}" is invalid for ${getSelectorName(selector)}. Must be between 0 and ${container.size - 1}`,
			status: CustomCommandStatus.Failure,
		};
	}
	let oldItem: ItemStack | undefined;
	if (replaceMode === "keep") {
		oldItem = container.getItem(slotId);
	}
	container.setItem(slotId, item);
	let oldItemGiveResult: CustomCommandResult | undefined;
	if (oldItem) {
		oldItemGiveResult = addItemsInContainer(selector, container, oldItem, oldItem.amount);
	}
	let message: string = `Replaced item in slot ${slotId}`;
	if (
		oldItemGiveResult !== undefined &&
		oldItemGiveResult.status === CustomCommandStatus.Failure
	) {
		message += `\nHowever, ${oldItemGiveResult.message}`;
	}
	return {
		message: message,
		status: CustomCommandStatus.Success,
	};
}

function inInventory(
	selector: Entity,
	item: ItemStack,
	slot: string,
	slotId: number | null,
	replaceMode: string,
): CustomCommandResult {
	const inventory: EntityInventoryComponent | undefined = selector.getComponent(
		EntityComponentTypes.Inventory,
	);
	if (inventory === undefined) {
		return {
			message: `Unable to get inventory of ${getSelectorName(selector)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	return inContainer(selector, inventory.container, item, slot, slotId, replaceMode);
}

function inHotbar(
	selector: Entity,
	item: ItemStack,
	slot: string,
	slotId: number | null,
	replaceMode: string,
): CustomCommandResult {
	if (!(selector instanceof Player)) {
		return {
			message: `Cannot access hotbar of ${getSelectorName(selector)}. Only players have a hotbar.`,
			status: CustomCommandStatus.Failure,
		};
	}
	if (slotId !== null && (slotId < 0 || slotId > 8)) {
		return {
			message: `Invalid hotbar slot id "${slotId}". Must be between 0 and 8.`,
			status: CustomCommandStatus.Failure,
		};
	}
	return inInventory(selector, item, slot, slotId, replaceMode);
}

// Don't want to include custom tameable mobs here. My implementation was forced to be too oddly specific.
const MobChestEntityTypes: string[] = [
	MinecraftEntityTypes.Llama,
	MinecraftEntityTypes.Donkey,
	MinecraftEntityTypes.Mule,
];

// Includes SlotName.Saddle, SlotName.Armor, and SlotName.MobChest
function inTameable(
	selector: Entity,
	item: ItemStack,
	slot: string,
	slotId: number | null,
	replaceMode: string,
): CustomCommandResult {
	const inventory: EntityInventoryComponent | undefined = selector.getComponent(
		EntityComponentTypes.Inventory,
	);
	const isTamed: EntityIsTamedComponent | undefined = selector.getComponent(
		EntityComponentTypes.IsTamed,
	);
	if (inventory === undefined || isTamed === undefined) {
		return {
			message: `Unable to get ${slot} from ${getSelectorName(selector)}. Only accessible on vanilla tamed entities.`,
			status: CustomCommandStatus.Failure,
		};
	}
	if (slot === SlotName.MobChest) {
		if (!MobChestEntityTypes.includes(selector.typeId)) {
			return {
				message: `Unable to get ${slot} from ${getSelectorName(selector)}. Only accessible on vanilla tamed entities.`,
				status: CustomCommandStatus.Failure,
			};
		}
		if (slotId !== null) {
			// Account for saddle/carpet slot (slot 0);
			slotId++;
		}
		return inContainer(selector, inventory.container, item, slot, slotId, replaceMode);
	}
	if (slot === SlotName.Saddle) {
		// Saddle is inventory slot 0 on tameable mobs.
		slotId = 0;
	} else if (slot === SlotName.Armor) {
		// Horse Armor is inventory slot 1 on tameable mobs.
		slotId = 1;
	}
	const result: CustomCommandResult = inContainer(
		selector,
		inventory.container,
		item,
		slot,
		slotId,
		replaceMode,
	);
	return {
		message:
			result.status === CustomCommandStatus.Success
				? `Gave ${getSelectorName(selector)} ${item.typeId} in ${slot}`
				: (result.message ?? ""),
		status: result.status,
	};
}

function slotNameToEquipmentSlot(name: string): EquipmentSlot | null {
	switch (name) {
		case SlotName.Mainhand:
			return EquipmentSlot.Mainhand;
		case SlotName.Offhand:
			return EquipmentSlot.Offhand;
		case SlotName.Head:
			return EquipmentSlot.Head;
		case SlotName.Chest:
			return EquipmentSlot.Chest;
		case SlotName.Legs:
			return EquipmentSlot.Legs;
		case SlotName.Feet:
			return EquipmentSlot.Feet;
		default:
			return null;
	}
}

function inEquippable(
	selector: Entity,
	item: ItemStack,
	slot: string,
	replaceMode: string,
): CustomCommandResult {
	const equippable: EntityEquippableComponent | undefined = selector.getComponent(
		EntityComponentTypes.Equippable,
	);
	if (equippable === undefined) {
		return {
			message: `Unable to get equippable component of ${getSelectorName(selector)}\n(Equippable component doesn't work on vanilla mobs. Blame Mojang)`,
			status: CustomCommandStatus.Failure,
		};
	}
	const equipmentSlot: EquipmentSlot | null = slotNameToEquipmentSlot(slot);
	if (equipmentSlot === null) {
		return {
			message: `Unable to convert ${slot} to EquipmentSlot for ${getSelectorName(selector)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	let oldItem: ItemStack | undefined;
	if (replaceMode === "keep") {
		oldItem = equippable.getEquipment(equipmentSlot);
	}
	const equippableResult: boolean = equippable.setEquipment(equipmentSlot, item);
	if (!equippableResult) {
		return {
			message: `Unable to equip ${prettyTypeId(item.typeId)} in ${slot}`,
			status: CustomCommandStatus.Failure,
		};
	}
	let oldItemGiveResult: CustomCommandResult | undefined;
	if (oldItem) {
		const inventory: EntityInventoryComponent | undefined = selector.getComponent(
			EntityComponentTypes.Inventory,
		);
		let addItemsResult: CustomCommandResult | undefined;
		if (inventory !== undefined) {
			addItemsResult = addItemsInContainer(selector, inventory.container, item, item.amount);
		}
		if (
			inventory === undefined ||
			(addItemsResult !== undefined && addItemsResult.status === CustomCommandStatus.Failure)
		) {
			oldItemGiveResult = {
				message: "Spawned old item as entity",
				status: CustomCommandStatus.Success,
			};
			if (!selector.dimension.isChunkLoaded(selector.location)) {
				return {
					message: "Unable to spawn old item as entity",
					status: CustomCommandStatus.Failure,
				};
			}
			selector.dimension.spawnItem(item, selector.location);
		}
	}
	let message: string = `Equipped ${item.typeId} in slot ${slot}`;
	if (
		oldItemGiveResult !== undefined &&
		oldItemGiveResult.status === CustomCommandStatus.Failure
	) {
		message += `\nHowever, ${oldItemGiveResult.message}`;
	}
	return {
		message: message,
		status: CustomCommandStatus.Success,
	};
}

function inEndChest(
	selector: Entity,
	item: ItemStack,
	slot: string,
	slotId: number | null,
	replaceMode: string,
): CustomCommandResult {
	const enderInventory: EntityEnderInventoryComponent | undefined = selector.getComponent(
		EntityComponentTypes.EnderInventory,
	);
	if (enderInventory === undefined) {
		return {
			message: `Unable to get valid ender inventory from ${getSelectorName(selector)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	return inContainer(selector, enderInventory.container, item, slot, slotId, replaceMode);
}

export function givex(
	selector: Entity,
	item: ItemStack,
	amount: number,
	slot: string | null,
	slotId: number | null = null,
	replaceMode: string = "destroy",
): CustomCommandResult {
	if (slot === null) {
		// Just add item to free slots in inventory
		const inventory: EntityInventoryComponent | undefined = selector.getComponent(
			EntityComponentTypes.Inventory,
		);
		if (inventory === undefined) {
			return {
				message: `Unable to get ${selector.typeId} inventory`,
				status: CustomCommandStatus.Failure,
			};
		}
		return addItemsInContainer(selector, inventory.container, item, amount);
	}
	switch (slot) {
		case SlotName.Inventory:
			return inInventory(selector, item, slot, slotId, replaceMode);
		case SlotName.Hotbar:
			return inHotbar(selector, item, slot, slotId, replaceMode);
		case SlotName.Saddle:
		case SlotName.Armor:
		case SlotName.MobChest:
			return inTameable(selector, item, slot, slotId, replaceMode);
		case SlotName.Head:
		case SlotName.Chest:
		case SlotName.Legs:
		case SlotName.Feet:
		case SlotName.Mainhand:
		case SlotName.Offhand:
			return inEquippable(selector, item, slot, replaceMode);
		case SlotName.EndChest:
			return inEndChest(selector, item, slot, slotId, replaceMode);
		default:
			return {
				message: `Invalid slot "${slot}"`,
				status: CustomCommandStatus.Failure,
			};
	}
}

export function blockx(
	block: Block,
	item: ItemStack,
	amount: number,
	slotId: number | null,
	replaceMode: string = "destroy",
): CustomCommandResult {
	const inventory: BlockInventoryComponent | undefined = block.getComponent(
		BlockComponentTypes.Inventory,
	);
	if (inventory === undefined || inventory.container === undefined) {
		let message: string = `${prettyTypeId(block.typeId)} at location ${vector3ToString(block.location, 0)} does not have a valid inventory`;
		if (block.typeId === MinecraftBlockTypes.EnderChest) {
			message += `\nTo access Ender Chest slots, use /givex:givex with slot ${SlotName.EndChest}`;
		}
		return {
			message: message,
			status: CustomCommandStatus.Failure,
		};
	}
	if (slotId !== null) {
		return inContainer(
			block,
			inventory.container,
			item,
			SlotName.Inventory,
			slotId,
			replaceMode,
		);
	} else {
		return addItemsInContainer(block, inventory.container, item, amount);
	}
}

export function spawnx(
	dimension: Dimension,
	pos: Vector3,
	itemStack: ItemStack,
	itemAmount: number,
): void {
	while (itemAmount > 0) {
		if (itemAmount >= itemStack.maxAmount) {
			itemStack.amount = itemStack.maxAmount;
			itemAmount -= itemStack.maxAmount;
		} else {
			itemStack.amount = itemAmount;
			itemAmount = 0;
		}
		dimension.spawnItem(itemStack, pos);
	}
}
