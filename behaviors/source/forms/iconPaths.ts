import { removeMcNamespace } from "../prettyTypeId";
import { type ItemProperties, ItemPropertyKeys } from "../types";

const ItemsPath: string = "textures/items/";
const BlocksPath: string = "textures/blocks/";
const uiPath: string = "textures/ui/";

function getArrowTypeIconFileName(arrowType: string | undefined): string {
	switch (arrowType) {
		case "night_vision":
		case "long_night_vision":
			return "tipped_arrow_nightvision";

		case "invisibility":
		case "long_invisibility":
			return "tipped_arrow_invisibility";

		case "leaping":
		case "long_leaping":
		case "strong_leaping":
			return "tipped_arrow_leaping";

		case "fire_resistance":
		case "long_fire_resistance":
			return "tipped_arrow_fireres";

		case "swiftness":
		case "long_swiftness":
		case "strong_swiftness":
			return "tipped_arrow_swift";

		case "slowness":
		case "long_slowness":
		case "strong_slowness":
			return "tipped_arrow_slow";

		case "water_breathing":
		case "long_water_breathing":
			return "tipped_arrow_waterbreathing";

		case "healing":
		case "strong_healing":
			return "tipped_arrow_healing";

		case "harming":
		case "strong_harming":
			return "tipped_arrow_harm";

		case "poison":
		case "long_poison":
		case "strong_poison":
			return "tipped_arrow_poison";

		case "regeneration":
		case "long_regeneration":
		case "strong_regeneration":
			return "tipped_arrow_regen";

		case "strength":
		case "long_strength":
		case "strong_strength":
			return "tipped_arrow_strength";

		case "weakness":
		case "long_weakness":
			return "tipped_arrow_weakness";

		case "decay":
			return "tipped_arrow_wither";

		case "turtle_master":
		case "long_turtle_master":
		case "strong_turtle_master":
			return "tipped_arrow_turtlemaster";

		case "slow_falling":
		case "long_slow_falling":
			return "tipped_arrow_slowfalling";

		case "wind_charging":
			return "tipped_arrow_windCharged";

		case "weaving":
			return "tipped_arrow_weaving";

		case "oozing":
			return "tipped_arrow_oozing";

		case "infestation":
			return "tipped_arrow_infested";

		default:
			return "arrow";
	}
}

function getBedColorIconFileName(bedColor: string | undefined): string {
	if (bedColor === undefined) {
		return `bed_red`;
	} else if (bedColor === "gray") {
		return "bed_silver";
	} else {
		return `bed_${bedColor}`;
	}
}

function getPotionTypeIconFileName(properties: ItemProperties | undefined): string {
	if (properties === undefined) {
		return "potion_bottle_drinkable";
	}
	let potionBottleName: string = "";
	if (properties.typeId === "minecraft:potion") {
		potionBottleName = "potion_bottle";
	} else if (properties.typeId === "minecraft:splash_potion") {
		potionBottleName = "potion_bottle_splash";
	} else if (properties.typeId === "minecraft:lingering_potion") {
		potionBottleName = "potion_bottle_lingering";
	} else {
		return "potion_bottle_empty";
	}

	let effectName: string = "";

	switch (removeMcNamespace(properties.potionType ?? "")) {
		case "water":
		case "mundane":
		case "long_mundane":
		case "thick":
		case "awkward":
			effectName = "";
			break;

		case "nightvision":
		case "long_nightvision":
			effectName = "nightVision";
			break;

		case "invisibility":
		case "long_invisibility":
			effectName = "invisibility";
			break;

		case "leaping":
		case "long_leaping":
		case "strong_leaping":
			effectName = "jump";
			break;

		case "fire_resistance":
		case "long_fire_resistance":
			effectName = "fireResistance";
			break;

		case "swiftness":
		case "long_swiftness":
		case "strong_swiftness":
			effectName = "moveSpeed";
			break;

		case "slowness":
		case "long_slowness":
		case "strong_slowness":
			effectName = "moveSlowdown";
			break;

		case "water_breathing":
		case "long_water_breathing":
			effectName = "waterBreathing";
			break;

		case "healing":
		case "strong_healing":
			effectName = "heal";
			break;

		case "harming":
		case "strong_harming":
			effectName = "harm";
			break;

		case "poison":
		case "long_poison":
		case "strong_poison":
			effectName = "poison";
			break;

		case "regeneration":
		case "long_regeneration":
		case "strong_regeneration":
			effectName = "regeneration";
			break;

		case "strength":
		case "long_strength":
		case "strong_strength":
			effectName = "damageBoost";
			break;

		case "weakness":
		case "long_weakness":
			effectName = "weakness";
			break;

		case "wither":
			effectName = "wither";
			break;

		case "turtle_master":
		case "long_turtle_master":
		case "strong_turtle_master":
			effectName = "turtleMaster";
			break;

		case "slow_falling":
		case "long_slow_falling":
			effectName = "slowFall";
			break;

		case "wind_charged":
			effectName = "windCharged";
			break;

		case "weaving":
			effectName = "weaving";
			break;

		case "oozing":
			effectName = "oozing";
			break;

		case "infested":
			effectName = "infested";
			break;

		default:
			effectName = "";
			break;
	}

	if (effectName === "") {
		if (potionBottleName === "potion_bottle") {
			// minecraft:potion of water is named in a different way than splash and lingering for some reason
			return "potion_bottle_drinkable";
		}
		return `${potionBottleName}`;
	}

	return `${potionBottleName}_${effectName}`;
}

export function getItemPropertyIconPath(
	propertyType: string,
	properties: ItemProperties | undefined,
): string {
	switch (propertyType) {
		case "location": {
			return `${ItemsPath}map_filled.png`;
		}
		case ItemPropertyKeys.Amount: {
			return `${ItemsPath}hopper.png`;
		}
		case ItemPropertyKeys.ArrowType: {
			return `${ItemsPath}${getArrowTypeIconFileName(properties?.arrowType)}.png`;
		}
		case ItemPropertyKeys.BedColor: {
			return `${ItemsPath}${getBedColorIconFileName(properties?.bedColor)}.png`;
		}
		case ItemPropertyKeys.CanDestroy: {
			return `${ItemsPath}iron_pickaxe.png`;
		}
		case ItemPropertyKeys.CanPlaceOn: {
			return `${BlocksPath}target_side.png`;
		}
		case ItemPropertyKeys.Durability: {
			return `${uiPath}anvil_icon.png`;
		}
		case ItemPropertyKeys.Enchants: {
			return `${ItemsPath}book_enchanted.png`;
		}
		case ItemPropertyKeys.KeepOnDeath: {
			return `${ItemsPath}totem.png`;
		}
		case ItemPropertyKeys.LockMode: {
			return `${uiPath}accessibility_glyph_color.png`;
		}
		case ItemPropertyKeys.NameTag: {
			return `${ItemsPath}name_tag.png`;
		}
		case ItemPropertyKeys.PotionType: {
			return `${ItemsPath}${getPotionTypeIconFileName(properties)}.png`;
		}
		case ItemPropertyKeys.Slot: {
			return `${BlocksPath}chest_front.png`;
		}
		case ItemPropertyKeys.TypeId: {
			return `${ItemsPath}spyglass.png`;
		}
		default: {
			return "";
		}
	}
}
