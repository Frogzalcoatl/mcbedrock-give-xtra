import { stringToNumber, truncTo } from "../../prettyTypeId";

interface CommandVector3Value {
	num?: number;
	includeSquiggly: boolean;
}
const MaxCommandVector3Value: number = 2 ** 30 - 1;

export interface CommandVector3 {
	x: CommandVector3Value;
	y: CommandVector3Value;
	z: CommandVector3Value;
}

function valueToString(value: CommandVector3Value, decimalPlaces: number): string {
	let str = `${value.includeSquiggly ? "~" : ""}`;
	if (value.num !== undefined) {
		str += `${truncTo(value.num, decimalPlaces)}`;
	}
	return str;
}

export function commandVector3ToString(vector: CommandVector3, decimalPlaces: number = 3): string {
	let str = `${valueToString(vector.x, decimalPlaces)}`;
	str += ` ${valueToString(vector.y, decimalPlaces)}`;
	str += ` ${valueToString(vector.z, decimalPlaces)}`;
	return str;
}

interface CommandVector3ParseResult {
	vector: CommandVector3 | undefined;
	message: string;
}
export function parseCommandVector3(str: string): CommandVector3ParseResult {
	const vectorValues: CommandVector3Value[] = [];
	const arr: string[] = str.split(" ");
	for (let i = 0; i < arr.length; i++) {
		let value = arr[i];
		if (!value) {
			// Skip extra spaces
			continue;
		}
		if (!value.startsWith("~")) {
			const numResult: number | undefined = stringToNumber(value);
			if (numResult === undefined) {
				return {
					message: `Invalid entry "${value}"`,
					vector: undefined,
				};
			}
			vectorValues.push({ includeSquiggly: false, num: numResult });
		}
		// Minecraft allows for no spaces between values with squigglys. e.g. "~2~10~2" is valid
		while (value.startsWith("~")) {
			if (value.length === 1) {
				vectorValues.push({ includeSquiggly: true });
				break;
			}
			if (value[1] === "~") {
				vectorValues.push({ includeSquiggly: true });
				value = value.slice(1);
				continue;
			}
			let nextSquigglyIndex: number | undefined = value.slice(1).indexOf("~") + 1;
			if (nextSquigglyIndex === 0) {
				nextSquigglyIndex = undefined;
			}
			const numResult: number | undefined = stringToNumber(value.slice(1, nextSquigglyIndex));
			if (numResult === undefined || numResult > MaxCommandVector3Value) {
				return {
					message: `Invalid entry "${value}"`,
					vector: undefined,
				};
			}
			vectorValues.push({ includeSquiggly: true, num: numResult });
			if (nextSquigglyIndex === undefined) {
				break;
			}
			value = value.slice(nextSquigglyIndex);
		}
	}
	if (
		vectorValues[0] === undefined ||
		vectorValues[1] === undefined ||
		vectorValues[2] === undefined ||
		vectorValues.length > 3
	) {
		return {
			message: `Must have exactly three values`,
			vector: undefined,
		};
	}
	return {
		message: "Parsed coordinates",
		vector: {
			x: vectorValues[0],
			y: vectorValues[1],
			z: vectorValues[2],
		},
	};
}
