import {
	type Block,
	BlockComponentTypes,
	type BlockInventoryComponent,
	type Container,
	ContainerRulesError,
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

// spawnOverflowItems: When true, spawns item as entity if container is full
function giveItem(
	item: ItemStack,
	container: Container,
	location: Vector3,
	dimension: Dimension,
	spawnOverflowItems: boolean,
): boolean {
	try {
		const overflow: ItemStack | undefined = container.addItem(item);
		if (spawnOverflowItems && overflow !== undefined && dimension.isChunkLoaded(location)) {
			// Avoids LocationOutOfWorldBoundariesError
			const spawnLocation: Vector3 = {
				x: location.x,
				y: dimension.heightRange.min,
				z: location.z,
			};
			dimension.spawnItem(overflow, spawnLocation).teleport(location);
		}
	} catch (error) {
		// I don't feel like setting up a func to check whether adding an item follows the container's rules.
		if (error instanceof ContainerRulesError) {
			return false;
		} else {
			throw error;
		}
	}
	return true;
}

function addItems(
	selector: Entity | Block,
	container: Container,
	item: ItemStack,
	amount: number,
): CustomCommandResult {
	let remaining: number = amount;
	while (remaining > 0) {
		item.amount = Math.min(item.maxAmount, remaining);
		if (!giveItem(item, container, selector.location, selector.dimension, true)) {
			return {
				message: `Could not add ${prettyTypeId(item.typeId)} to container of ${getSelectorName(selector)}`,
				status: CustomCommandStatus.Failure,
			};
		}
		remaining -= item.amount;
	}
	return {
		message: `Gave ${prettyTypeId(item.type.id)} * ${amount} to ${getSelectorName(selector)}`,
		status: CustomCommandStatus.Success,
	};
}

function setItem(
	selector: Entity | Block,
	container: Container,
	item: ItemStack,
	slot: string,
	slotId: number,
	replaceMode: string,
): CustomCommandResult {
	let oldItem: ItemStack | undefined;
	if (replaceMode !== "destroy") {
		oldItem = container.getItem(slotId);
		if (replaceMode === "keep" && oldItem !== undefined) {
			return {
				message: `Could not replace ${slot} slot 0 with ${item.amount} * ${prettyTypeId(item.typeId)}`,
				status: CustomCommandStatus.Failure,
			};
		}
	}
	container.setItem(slotId, item);
	if (oldItem) {
		addItems(selector, container, oldItem, oldItem.amount);
	}
	return {
		message: `Replaced ${slot} slot ${slotId} with ${item.amount} * ${prettyTypeId(item.typeId)}`,
		status: CustomCommandStatus.Success,
	};
}

function handleInventory(
	selector: Entity,
	item: ItemStack,
	amount: number,
	slotId: number | null,
	replaceMode: string,
): CustomCommandResult {
	const inventory: EntityInventoryComponent | undefined = selector.getComponent(
		EntityComponentTypes.Inventory,
	);
	if (inventory === undefined) {
		return {
			message: `Could not get inventory of ${getSelectorName(selector)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	if (slotId === null) {
		return addItems(selector, inventory.container, item, amount);
	} else {
		return setItem(
			selector,
			inventory.container,
			item,
			SlotName.Inventory,
			slotId,
			replaceMode,
		);
	}
}

function handleHotbar(
	selector: Entity,
	item: ItemStack,
	amount: number,
	slotId: number | null,
	replaceMode: string,
): CustomCommandResult {
	if (selector instanceof Player === false) {
		return {
			message: `Could not access hotbar of ${getSelectorName(selector)}. Only players have a hotbar`,
			status: CustomCommandStatus.Failure,
		};
	}
	if (slotId === null) {
		return {
			message: `Could not replace ${SlotName.Hotbar} with ${amount} * ${prettyTypeId(item.typeId)}. Slot id must be specified`,
			status: CustomCommandStatus.Failure,
		};
	}
	const inventory: EntityInventoryComponent | undefined = selector.getComponent(
		EntityComponentTypes.Inventory,
	);
	if (inventory === undefined) {
		return {
			message: `Could not get inventory of ${getSelectorName(selector)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	return setItem(selector, inventory.container, item, SlotName.Hotbar, slotId, replaceMode);
}

// Don't want to include custom tameable mobs here. My implementation was forced to be too oddly specific.
const MobChestEntityTypes: string[] = [
	MinecraftEntityTypes.Llama,
	MinecraftEntityTypes.Donkey,
	MinecraftEntityTypes.Mule,
];

// Includes SlotName.Saddle, SlotName.Armor, and SlotName.MobChest
function handleTameable(
	selector: Entity,
	item: ItemStack,
	slot: SlotName.Saddle | SlotName.Armor | SlotName.MobChest,
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
			message: `Could not get ${slot} from ${getSelectorName(selector)}. Only accessible on vanilla tamed entities`,
			status: CustomCommandStatus.Failure,
		};
	}
	if (slot === SlotName.MobChest) {
		if (!MobChestEntityTypes.includes(selector.typeId)) {
			return {
				message: `Could not get ${slot} from ${getSelectorName(selector)}. Only accessible on vanilla tamed entities`,
				status: CustomCommandStatus.Failure,
			};
		}
		if (slotId !== null) {
			slotId++; // Account for saddle/carpet slot (slot 0)
			return setItem(selector, inventory.container, item, slot, slotId, replaceMode);
		} else {
			return addItems(selector, inventory.container, item, item.amount);
		}
	} else if (slot === SlotName.Saddle) {
		// Saddle is inventory slot 0 on tameable mobs.
		slotId = 0;
	} else {
		// Horse Armor is inventory slot 1 on tameable mobs.
		slotId = 1;
	}
	const result: CustomCommandResult = setItem(
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
				? `Replaced ${slot} with ${item.amount} * ${prettyTypeId(item.typeId)}`
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

function handleEquippable(
	selector: Entity,
	item: ItemStack,
	slot: SlotName,
	replaceMode: string,
): CustomCommandResult {
	const equippable: EntityEquippableComponent | undefined = selector.getComponent(
		EntityComponentTypes.Equippable,
	);
	if (equippable === undefined) {
		return {
			message: `Could not get equippable component of ${getSelectorName(selector)}\n(Equippable component doesn't work on vanilla mobs. Blame Mojang)`,
			status: CustomCommandStatus.Failure,
		};
	}
	const equipmentSlot: EquipmentSlot | null = slotNameToEquipmentSlot(slot);
	if (equipmentSlot === null) {
		return {
			message: `Could not convert ${slot} to EquipmentSlot for ${getSelectorName(selector)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	let oldItem: ItemStack | undefined;
	if (replaceMode !== "destroy") {
		oldItem = equippable.getEquipment(equipmentSlot);
		if (replaceMode === "keep" && oldItem !== undefined) {
			return {
				message: `Could not replace ${slot} slot 0 with ${item.amount} * ${prettyTypeId(item.typeId)}`,
				status: CustomCommandStatus.Failure,
			};
		}
	}
	const equippableResult: boolean = equippable.setEquipment(equipmentSlot, item);
	if (!equippableResult) {
		return {
			message: `Could not replace ${slot} with ${item.amount} * ${prettyTypeId(item.typeId)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	if (oldItem) {
		const inventory: EntityInventoryComponent | undefined = selector.getComponent(
			EntityComponentTypes.Inventory,
		);
		let addItemsResult: CustomCommandResult | undefined;
		if (inventory !== undefined) {
			addItemsResult = addItems(selector, inventory.container, item, item.amount);
		}
		if (
			inventory === undefined ||
			(addItemsResult !== undefined && addItemsResult.status === CustomCommandStatus.Failure)
		) {
			spawnx(selector.dimension, selector.location, oldItem, oldItem.amount);
		}
	}
	return {
		message: `Replaced ${slot} with ${item.amount} * ${prettyTypeId(item.typeId)} in slot ${slot}`,
		status: CustomCommandStatus.Success,
	};
}

function handleEndChest(
	selector: Entity,
	item: ItemStack,
	slot: SlotName,
	slotId: number | null,
	replaceMode: string,
): CustomCommandResult {
	const enderInventory: EntityEnderInventoryComponent | undefined = selector.getComponent(
		EntityComponentTypes.EnderInventory,
	);
	if (enderInventory === undefined) {
		return {
			message: `Could not get valid ender inventory from ${getSelectorName(selector)}`,
			status: CustomCommandStatus.Failure,
		};
	}
	if (slotId !== null) {
		return setItem(selector, enderInventory.container, item, slot, slotId, replaceMode);
	} else {
		return addItems(selector, enderInventory.container, item, item.amount);
	}
}

export function givex(
	selector: Entity,
	item: ItemStack,
	amount: number,
	slot: SlotName = SlotName.Inventory,
	slotId: number | null = null,
	replaceMode: string = "destroy",
): CustomCommandResult {
	switch (slot) {
		case SlotName.Inventory:
			return handleInventory(selector, item, amount, slotId, replaceMode);
		case SlotName.Hotbar:
			return handleHotbar(selector, item, amount, slotId, replaceMode);
		case SlotName.Saddle:
		case SlotName.Armor:
		case SlotName.MobChest:
			return handleTameable(selector, item, slot, slotId, replaceMode);
		case SlotName.Head:
		case SlotName.Chest:
		case SlotName.Legs:
		case SlotName.Feet:
		case SlotName.Mainhand:
		case SlotName.Offhand:
			return handleEquippable(selector, item, slot, replaceMode);
		case SlotName.EndChest:
			return handleEndChest(selector, item, slot, slotId, replaceMode);
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
		return setItem(block, inventory.container, item, SlotName.Inventory, slotId, replaceMode);
	} else {
		return addItems(block, inventory.container, item, amount);
	}
}

export function spawnx(
	dimension: Dimension,
	pos: Vector3,
	item: ItemStack,
	amount: number,
): CustomCommandResult {
	const spawnPos: Vector3 = {
		x: pos.x,
		y: dimension.heightRange.min,
		z: pos.z,
	};
	if (!dimension.isChunkLoaded(spawnPos)) {
		return {
			message: "Cannot access blocks outside of world",
			status: CustomCommandStatus.Failure,
		};
	}
	while (amount > 0) {
		if (amount >= item.maxAmount) {
			item.amount = item.maxAmount;
			amount -= item.maxAmount;
		} else {
			item.amount = amount;
			amount = 0;
		}
		// Teleport to avoid LocationOutOfWorldBoundariesError
		dimension.spawnItem(item, spawnPos).teleport(pos);
	}
	return {
		message: `Spawned ${prettyTypeId(item.typeId)} * ${amount} at ${vector3ToString(pos)}`,
		status: CustomCommandStatus.Success,
	};
}
