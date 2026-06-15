import { type Entity, Player } from "@minecraft/server";

export function prettyTypeId(typeId: string): string {
	const namespaceColonIndex: number = typeId.indexOf(":");
	if (namespaceColonIndex !== -1) {
		typeId = typeId.slice(namespaceColonIndex + 1);
	}
	const words: string[] = typeId.split("_");
	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		if (!word) {
			continue;
		}
		const firstLetter = word[0];
		if (!firstLetter) {
			continue;
		}
		words[i] = `${firstLetter.toUpperCase()}${word.slice(1)}`;
	}
	return words.join(" ");
}

export function getMcNamespace(typeId: string): string | undefined {
	const namespaceColonIndex: number = typeId.indexOf(":");
	if (namespaceColonIndex === -1) {
		return undefined;
	} else {
		return typeId.slice(0, namespaceColonIndex);
	}
}

export function getEntityName(entity: Entity): string {
	if (entity instanceof Player) {
		return `${entity.name}§r`;
	} else if (entity.nameTag) {
		return `${entity.nameTag}`;
	} else {
		return prettyTypeId(entity.typeId);
	}
}

// Since names are trailed with §r, if I want to maintain the color of the message, i need to append a color after each §r
export function appendColorAfterResets(str: string, colorCode: string): string {
	str.replaceAll("§r", `§r${colorCode}`);
	return str;
}
