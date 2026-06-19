import { Block, type DimensionLocation, Entity, Player, type Vector3 } from "@minecraft/server";

export function prettyTypeId(typeId: string): string {
	const namespaceColonIndex: number = typeId.indexOf(":");
	if (namespaceColonIndex !== -1) {
		typeId = typeId.slice(namespaceColonIndex + 1);
	}
	const words: string[] = typeId.split("_");
	for (let i: number = 0; i < words.length; i++) {
		const word: string | undefined = words[i];
		if (!word) {
			continue;
		}
		const firstLetter: string | undefined = word[0];
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

export function getSelectorName(selector: Entity | Block | DimensionLocation): string {
	if (selector instanceof Block) {
		if (!selector.isValid) {
			return "selector";
		}
		return prettyTypeId(selector.typeId);
	} else if (selector instanceof Entity) {
		if (!selector.isValid) {
			return "selector";
		}
		if (selector instanceof Player) {
			return `${selector.name}§r`;
		} else if (selector.nameTag) {
			return `${selector.nameTag}§r`;
		} else {
			return prettyTypeId(selector.typeId);
		}
	} else {
		return `location ${vector3ToString({ x: selector.x, y: selector.y, z: selector.z }, 0)}`;
	}
}

// Since names are trailed with §r, if I want to maintain the color of the message, i need to append a color after each §r
export function appendColorAfterResets(str: string, colorCode: string): string {
	return str.replaceAll("§r", `§r${colorCode}`);
}

export function truncTo(num: number, decimalPlaces: number) {
	if (decimalPlaces < 0) {
		return num;
	}
	return Math.trunc(num * 10 ** decimalPlaces) / 10 ** decimalPlaces;
}

export function vector3ToString(vector: Vector3, decimalPlaces: number): string {
	let str: string = "";
	for (const value of Object.values(vector)) {
		str += " ";
		if (typeof value === "string") {
			str += value;
		} else if (typeof value === "number") {
			str += `${truncTo(value, decimalPlaces)}`;
		}
	}
	return str.trimStart();
}

export function camelToTitleCase(str: string): string {
	const splitStr: string[] = str.split("");
	const firstChar: string | undefined = splitStr[0];
	if (firstChar !== undefined) {
		splitStr[0] = firstChar.toUpperCase();
	}
	for (let i: number = 1; i < splitStr.length; i++) {
		const currentChar: string | undefined = splitStr[i];
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

export function stringToNumber(str: string): number | undefined {
	const trimmed: string = str.trim();
	// Number() would return zero for an empty string, or a string with only white space
	if (trimmed === "") {
		return undefined;
	}
	const num: number = Number(trimmed);
	// NaN === NaN -> false for whatever reason
	if (Number.isNaN(num)) {
		return undefined;
	}
	return num;
}
