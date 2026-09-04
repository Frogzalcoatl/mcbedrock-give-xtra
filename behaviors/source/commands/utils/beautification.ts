import { Block, type Entity, Player, type Vector3 } from "@minecraft/server";

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

export function getSelectorName(selector: Entity | Block): string {
	if (selector instanceof Block) {
		return prettyTypeId(selector.typeId);
	} else {
		return selector.nameTag
			? selector.nameTag
			: selector instanceof Player
				? selector.name
				: prettyTypeId(selector.typeId);
	}
}

export function truncTo(num: number, decimalPlaces: number) {
	if (decimalPlaces < 0) {
		return num;
	}
	return Math.trunc(num * 10 ** decimalPlaces) / 10 ** decimalPlaces;
}

export function vector3ToString(vector: Vector3, decimalPlaces: number = 0): string {
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
