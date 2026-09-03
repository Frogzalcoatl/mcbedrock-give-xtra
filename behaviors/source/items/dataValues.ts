import {
	type Dimension,
	type Entity,
	EntityComponentTypes,
	type EntityInventoryComponent,
	type ItemStack,
	type Vector3,
} from "@minecraft/server";

const CONTAINER_TYPE_ID: string = "givex:custom_container";

// Uses /give on a custom entity for command data value, applies components of itemstack, then returns new itemstack with data value attached internally.
export function getDataValueItem(
	typeId: string,
	dataValue: number,
	originDimension: Dimension,
	originLocation: Vector3,
): ItemStack | undefined {
	if (!originDimension.isChunkLoaded(originLocation)) {
		return undefined;
	}
	const containerEntity: Entity = originDimension.spawnEntity(CONTAINER_TYPE_ID, originLocation);
	const inventory: EntityInventoryComponent | undefined = containerEntity.getComponent(
		EntityComponentTypes.Inventory,
	);
	if (inventory === undefined) {
		containerEntity.remove();
		return undefined;
	}
	containerEntity.runCommand(`/replaceitem entity @s slot.inventory 0 ${typeId} 1 ${dataValue}`);
	const dataValueItem: ItemStack | undefined = inventory.container.getItem(0);
	containerEntity.remove();
	if (dataValueItem === undefined) {
		return undefined;
	}
	return dataValueItem;
}
