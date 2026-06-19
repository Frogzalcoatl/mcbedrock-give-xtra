import {
	type Dimension,
	type DimensionLocation,
	type Entity,
	EntityComponentTypes,
	type EntityInventoryComponent,
	ItemComponentTypes,
	type ItemStack,
	type Vector3,
} from "@minecraft/server";
import {
	ArrowTypeStartingDataValue,
	ArrowTypes,
	BedColors,
	type BooleanWithMessage,
	type ItemProperties,
} from "./types";

const CustomContainerEntityType = "givex:custom_container";

function removeEntity(entity: Entity): BooleanWithMessage {
	try {
		entity.remove();
	} catch (error) {
		let message: string = "Unable to remove entity";
		if (error instanceof Error) {
			message += `: ${error.message}`;
		}
		return {
			bool: false,
			message: message,
		};
	}
	return {
		bool: true,
		message: "Removed entity",
	};
}

// Only returns false when it fails to copy enchants
function copyItemStackComponents(from: ItemStack, to: ItemStack): BooleanWithMessage {
	to.lockMode = from.lockMode;
	if (from.nameTag) {
		to.nameTag = from.nameTag;
	}
	const fromDurability = from.getComponent(ItemComponentTypes.Durability);
	const toDurability = to.getComponent(ItemComponentTypes.Durability);
	if (fromDurability && toDurability) {
		toDurability.damage = fromDurability.damage;
		toDurability.unbreakable = fromDurability.unbreakable;
	}
	to.keepOnDeath = from.keepOnDeath;
	to.setCanPlaceOn(from.getCanPlaceOn());
	to.setCanDestroy(from.getCanDestroy());
	const templateEnchantable = from.getComponent(ItemComponentTypes.Enchantable);
	const givenItemEnchantable = to.getComponent(ItemComponentTypes.Enchantable);
	if (templateEnchantable && givenItemEnchantable) {
		try {
			givenItemEnchantable.addEnchantments(templateEnchantable.getEnchantments());
		} catch (error) {
			let message: string = `Unable to copy itemstack echantments`;
			if (error instanceof Error) {
				message += `: ${error.message}`;
			}
			return {
				bool: false,
				message: message,
			};
		}
	}
	return {
		bool: true,
		message: "Copied itemstack components",
	};
}

// Cannot be run in restricted execution
// Uses /give on a custom entity for command data value, applies components of itemstack, then returns new itemstack with data value attached internally.
export function getDataValueItem(
	item: ItemStack,
	dataValue: number,
	locationForCustomEntity: DimensionLocation,
): { item: ItemStack | undefined; message: string } {
	if (dataValue === 0) {
		return {
			item: item,
			message: "No data value to change (default is 0)",
		};
	}
	const dimension: Dimension = locationForCustomEntity.dimension;
	const location: Vector3 = {
		x: locationForCustomEntity.x,
		y: locationForCustomEntity.y,
		z: locationForCustomEntity.z,
	};
	let containerEntity: Entity;
	try {
		containerEntity = dimension.spawnEntity(CustomContainerEntityType, location);
	} catch (error) {
		let message: string = "Unable to spawn container entity";
		if (error instanceof Error) {
			message += `: ${error.message}`;
		}
		return {
			item: undefined,
			message: message,
		};
	}
	const inventory: EntityInventoryComponent | undefined = containerEntity.getComponent(
		EntityComponentTypes.Inventory,
	);
	if (inventory === undefined || !inventory.isValid || !inventory.container.isValid) {
		let message: string = "Unable to get valid inventory of container entity";
		const removalResult: BooleanWithMessage = removeEntity(containerEntity);
		if (!removalResult.bool) {
			message += `\nAdditionally ${removalResult.message}`;
		}
		return {
			item: undefined,
			message: message,
		};
	}
	try {
		containerEntity.runCommand(
			`/replaceitem entity @s slot.inventory 0 ${item.typeId} ${item.amount} ${dataValue}`,
		);
	} catch (error) {
		let message: string = "Unable to run /give command on container entity";
		if (error instanceof Error) {
			message += `: ${error.message}`;
		}
		const removalResult: BooleanWithMessage = removeEntity(containerEntity);
		if (!removalResult.bool) {
			message += `\nAdditionally ${removalResult.message}`;
		}
		return {
			item: undefined,
			message: message,
		};
	}
	// Container only has a single slot, so this should be the data value item recieved by the /give command
	const dataValueItem: ItemStack | undefined = inventory.container.getItem(0);
	if (dataValueItem === undefined) {
		let message: string = "Unable to retrieve data value itemstack from container entity";
		const removalResult: BooleanWithMessage = removeEntity(containerEntity);
		if (!removalResult.bool) {
			message += `\nAdditionally ${removalResult.message}`;
		}
		return {
			item: undefined,
			message: message,
		};
	}
	copyItemStackComponents(item, dataValueItem);
	let message: string = "Successfully got data value item";
	const removalResult: BooleanWithMessage = removeEntity(containerEntity);
	if (!removalResult.bool) {
		message += `\nHowever, ${removalResult.message}`;
	}
	return {
		item: dataValueItem,
		message: message,
	};
}

// For arrowType, bedColor, etc
export function getCommandDataValue(properties: ItemProperties): number {
	if (properties.arrowType && properties.typeId === "minecraft:arrow") {
		const arrowEffectResult: number = ArrowTypes.indexOf(properties.arrowType);
		if (arrowEffectResult !== -1) {
			return arrowEffectResult + ArrowTypeStartingDataValue;
		}
	} else if (properties.bedColor && properties.typeId === "minecraft:bed") {
		const bedColorResult = BedColors.indexOf(properties.bedColor);
		if (bedColorResult !== -1) {
			return bedColorResult;
		}
	} else if (properties.typeId === "minecraft:spawn_egg") {
		// npcs are the only spawn egg that still use data values. The rest have their own type id. Just redirect all references of the old spawn egg typeid to npc.
		return 51;
	}
	return 0;
}
