export function getIconPath(propertyType: string): string {
	switch (propertyType) {
		case "location": {
			return `textures/items/map_filled.png`;
		}
		case "amount": {
			return `textures/items/hopper.png`;
		}
		case "canDestroy": {
			return `textures/items/iron_pickaxe.png`;
		}
		case "canPlaceOn": {
			return `textures/blocks/target_side.png`;
		}
		case "durability": {
			return `textures/ui/anvil_icon.png`;
		}
		case "enchants": {
			return `textures/items/book_enchanted.png`;
		}
		case "keepOnDeath": {
			return `textures/items/totem.png`;
		}
		case "lockMode": {
			return `textures/ui/accessibility_glyph_color.png`;
		}
		case "nameTag": {
			return `textures/items/name_tag.png`;
		}
		case "slot":
		case "slotId":
		case "replaceMode": {
			return `textures/blocks/chest_front.png`;
		}
		case "typeId": {
			return `textures/items/spyglass.png`;
		}
		case "data": {
			return `textures/blocks/command_block_side_mipmap.png`;
		}
		default: {
			return "";
		}
	}
}
