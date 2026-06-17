import { Block, type Entity, Player, type Vector3 } from "@minecraft/server";

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

export function getRecieverName(reciever: Entity | Block): string {
	if (!reciever.isValid) {
		return "Unknown reciever";
	}
	if (reciever instanceof Block) {
		return prettyTypeId(reciever.typeId);
	} else if (reciever instanceof Player) {
		return `${reciever.name}§r`;
	} else if (reciever.nameTag) {
		return `${reciever.nameTag}`;
	} else {
		return prettyTypeId(reciever.typeId);
	}
}

// Since names are trailed with §r, if I want to maintain the color of the message, i need to append a color after each §r
export function appendColorAfterResets(str: string, colorCode: string): string {
	return str.replaceAll("§r", `§r${colorCode}`);
}

function truncTo(num: number, decimalPlaces: number) {
	if (decimalPlaces < 0) {
		return num;
	}
	return Math.trunc(num * 10 ** decimalPlaces) / 10 ** decimalPlaces;
}

export function vector3ToString(vector: Vector3, decimalPlaces: number): string {
	return `${truncTo(vector.x, decimalPlaces)} ${truncTo(vector.y, decimalPlaces)} ${truncTo(vector.z, decimalPlaces)}`;
}

export function camelToTitleCase(str: string): string {
	const splitStr = str.split("");
	const firstChar = splitStr[0];
	if (firstChar !== undefined) {
		splitStr[0] = firstChar.toUpperCase();
	}
	for (let i = 1; i < splitStr.length; i++) {
		const currentChar = splitStr[i];
		if (!currentChar) {
			continue;
		}
		if (
			currentChar.toUpperCase() === currentChar &&
			currentChar.toLowerCase() !== currentChar
		) {
			splitStr[i] = ` ${currentChar.toUpperCase()}`;
		}
	}
	return splitStr.join("");
}
