import { ItemLockMode, system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

export async function getStartedLockMode(context: GetStartedContext): Promise<void> {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	const lockModes: ItemLockMode[] = Object.values(ItemLockMode);
	let index: number = 0;
	if (context.json.lockMode !== null) {
		index = lockModes.indexOf(context.json.lockMode);
		if (index === -1) {
			index = 0;
		}
	}
	form.dropdown(
		"Would you like to apply an inventory lock mode to your item?\n\nSelect Lock Mode:",
		lockModes,
		{ defaultValueIndex: index },
	);
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	const resp: ModalFormResponse = await form.show(context.player);
	if (resp.formValues === undefined || typeof resp.formValues[0] !== "number") {
		system.run(() => getStartedProperties(context, "§cLock Mode unchanged"));
		return;
	}
	const lockMode: ItemLockMode | undefined = lockModes[resp.formValues[0]];
	if (lockMode === undefined) {
		system.run(() => getStartedProperties(context, "§cLock Mode unchanged"));
		return;
	}
	if (lockMode === ItemLockMode.none) {
		context.json.lockMode = null;
	} else {
		context.json.lockMode = lockMode;
	}
	system.run(() =>
		getStartedProperties(context, `Lock Mode set to: §e${context.json.lockMode}§r`),
	);
}
