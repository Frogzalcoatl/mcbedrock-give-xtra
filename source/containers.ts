import "@minecraft/server";
import {
	type Container,
	type Entity,
	EntityComponentTypes,
	EquipmentSlot,
	type ItemStack,
	Player,
} from "@minecraft/server";
import { prettyTypeId } from "./prettyTypeId";
import { type BooleanWithMessage, type SlotData, SlotName } from "./types";

// Cannot be used in restricted execution
export function giveItem(
	entity: Entity,
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

	const entityName = entity instanceof Player ? entity.name : prettyTypeId(entity.typeId);

	// Spawn items as entities
	while (amountLeft > 0) {
		if (!entity.isValid) {
			return {
				bool: false,
				message: `Only able to give ${entityName}§r ${amountToGive - amountLeft}/${amountToGive} ${prettyTypeId(itemStack.type.id)}. Unable to spawn items on invalid player.`,
			};
		}
		itemStack.amount = Math.min(itemStack.maxAmount, amountLeft);
		entity.dimension.spawnItem(itemStack, {
			x: entity.location.x,
			y: entity.location.y + 1,
			z: entity.location.z,
		});
		amountLeft -= itemStack.amount;
	}

	return {
		bool: true,
		message: `Gave ${entityName}§r ${amountToGive} ${prettyTypeId(itemStack.type.id)}`,
	};
}

function setItemInContainer(
	entity: Entity,
	container: Container,
	item: ItemStack,
	slotId: number | undefined,
	replace: boolean,
	isHotbar: boolean,
): BooleanWithMessage {
	if (!container.isValid) {
		return {
			bool: false,
			message: `${entity.typeId} container is invalid`,
		};
	}
	const minSlotId = 0;
	const maxSlotId = isHotbar ? 8 : container.size - 1;
	if (slotId === undefined) {
		const firstEmptySlot: number | undefined = container.firstEmptySlot();
		if (
			firstEmptySlot !== undefined &&
			firstEmptySlot >= minSlotId &&
			firstEmptySlot <= maxSlotId
		) {
			slotId = firstEmptySlot;
		} else {
			return {
				bool: false,
				message: "Unable to find valid slot id",
			};
		}
	}
	if (slotId < minSlotId || slotId > maxSlotId) {
		return {
			bool: false,
			message: `Invalid slot id. Should be between ${minSlotId} and ${maxSlotId}`,
		};
	}
	let oldItem: ItemStack | undefined;
	if (!replace) {
		oldItem = container.getItem(slotId);
	}
	container.setItem(slotId, item);
	let giveResult: BooleanWithMessage | undefined;
	if (oldItem) {
		giveResult = giveItem(entity, container, oldItem, oldItem.amount);
	}
	let message: string = `Replaced item in slot ${slotId}`;
	if (giveResult && !giveResult.bool) {
		message += `\nHowever, ${giveResult.message}`;
	}
	return {
		bool: true,
		message: message,
	};
}

function slotNameToEquipmentSlot(name: SlotName): EquipmentSlot | undefined {
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
			return undefined;
	}
}

export function replaceItem(entity: Entity, item: ItemStack, slot: SlotData): BooleanWithMessage {
	if (slot.name === SlotName.Inventory || slot.name === SlotName.MobChest) {
		const inventory = entity.getComponent(EntityComponentTypes.Inventory);
		if (inventory === undefined) {
			return {
				bool: false,
				message: "Unable to get inventory",
			};
		}
		return setItemInContainer(
			entity,
			inventory.container,
			item,
			slot.id,
			slot.replaceItem ?? true,
			false,
		);
	}
	if (slot.name === SlotName.Hotbar) {
		if (!(entity instanceof Player)) {
			return {
				bool: false,
				message: "Only players have a hotbar",
			};
		}
		const inventory = entity.getComponent(EntityComponentTypes.Inventory);
		if (inventory === undefined) {
			return {
				bool: false,
				message: "Unable to get inventory",
			};
		}
		return setItemInContainer(
			entity,
			inventory.container,
			item,
			slot.id,
			slot.replaceItem ?? true,
			true,
		);
	}
	// The rest of the SlotNames require equippable
	const equippable = entity.getComponent(EntityComponentTypes.Equippable);
	if (equippable === undefined) {
		return {
			bool: false,
			message: `Unable to get equippable component on ${entity.typeId}`,
		};
	}
	const equipmentSlot: EquipmentSlot | undefined = slotNameToEquipmentSlot(slot.name);
	if (equipmentSlot === undefined) {
		return {
			bool: false,
			message: `Unable to convert ${slot.name} to EquipmentSlot`,
		};
	}
	let oldItem: ItemStack | undefined;
	if (slot.replaceItem === false) {
		oldItem = equippable.getEquipment(equipmentSlot);
	}
	const equippableResult: boolean = equippable.setEquipment(equipmentSlot, item);
	if (!equippableResult) {
		return {
			bool: false,
			message: `Unable to equip ${item.typeId} in ${slot.name}`,
		};
	}
	let giveResult: BooleanWithMessage | undefined;
	if (oldItem) {
		const inventory = entity.getComponent(EntityComponentTypes.Inventory);
		if (inventory === undefined) {
			const itemEntity = entity.dimension.spawnItem(item, entity.location);
			giveResult = {
				bool: itemEntity.isValid,
				message: itemEntity.isValid
					? "Spawned old item as entity"
					: "Unable to spawn old item as entity",
			};
		} else {
			giveResult = giveItem(entity, inventory.container, item, item.amount);
		}
	}
	let message: string = `Equipped ${item.typeId} in slot ${slot.name}`;
	if (giveResult && !giveResult.bool) {
		message += `\nHowever, ${giveResult.message}`;
	}
	return {
		bool: true,
		message: message,
	};
}
