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
		words[i] = `${word.toUpperCase()}${word.slice(1)}`;
	}
	typeId = words.join(" ");
	return typeId;
}
