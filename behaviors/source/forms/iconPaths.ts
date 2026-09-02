const itemsPath: string = "textures/items/";
const blocksPath: string = "textures/blocks/";
const uiPath: string = "textures/ui/";

export function getItemPropertyIconPath(propertyType: string): string {
	switch (propertyType) {
		case "location": {
			return `${itemsPath}map_filled.png`;
		}
		case "amount": {
			return `${itemsPath}hopper.png`;
		}
		case "canDestroy": {
			return `${itemsPath}iron_pickaxe.png`;
		}
		case "canPlaceOn": {
			return `${blocksPath}target_side.png`;
		}
		case "durability": {
			return `${uiPath}anvil_icon.png`;
		}
		case "enchants": {
			return `${itemsPath}book_enchanted.png`;
		}
		case "keepOnDeath": {
			return `${itemsPath}totem.png`;
		}
		case "lockMode": {
			return `${uiPath}accessibility_glyph_color.png`;
		}
		case "nameTag": {
			return `${itemsPath}name_tag.png`;
		}
		case "slot": {
			return `${blocksPath}chest_front.png`;
		}
		case "typeId": {
			return `${itemsPath}spyglass.png`;
		}
		default: {
			return "";
		}
	}
}
