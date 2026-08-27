import {
	type Dimension,
	type Entity,
	EntityComponentTypes,
	type EntityInventoryComponent,
	type ItemStack,
	type ItemType,
	type Vector3,
} from "@minecraft/server";

const CONTAINER_TYPE_ID: string = "givex:custom_container";

// Uses /give on a custom entity for command data value, applies components of itemstack, then returns new itemstack with data value attached internally.
export function getDataValueItem(
	itemType: ItemType,
	dataValue: number,
	originDimension: Dimension,
	originLocation: Vector3,
): ItemStack | undefined {
	let containerEntity: Entity;
	try {
		containerEntity = originDimension.spawnEntity(CONTAINER_TYPE_ID, originLocation);
	} catch (_error) {
		return undefined;
	}
	const inventory: EntityInventoryComponent | undefined = containerEntity.getComponent(
		EntityComponentTypes.Inventory,
	);
	if (inventory === undefined) {
		containerEntity.remove();
		return undefined;
	}
	try {
		containerEntity.runCommand(
			`/replaceitem entity @s slot.inventory 0 ${itemType} 1 ${dataValue}`,
		);
	} catch (_error) {
		containerEntity.remove();
		return undefined;
	}
	const dataValueItem: ItemStack | undefined = inventory.container.getItem(0);
	containerEntity.remove();
	if (dataValueItem === undefined) {
		return undefined;
	}
	return dataValueItem;
}
