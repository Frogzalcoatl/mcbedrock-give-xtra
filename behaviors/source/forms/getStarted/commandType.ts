import { system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";
import { getStartedTypeId } from "./typeId";

export async function getStartedCommandType(context: GetStartedContext): Promise<void> {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	let defaultValueIndex: number = 0;
	if (context.commandType === "blockx") {
		defaultValueIndex = 1;
	} else if (context.commandType === "spawnx") {
		defaultValueIndex = 2;
	}
	form.dropdown(
		"What would you like to do with this item?\n\nSelect Option:",
		["Give to Player/Mob", "Give to Block (e.g: Chest)", "Spawn as Dropped Item"],
		{ defaultValueIndex: defaultValueIndex },
	);
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	const resp: ModalFormResponse = await form.show(context.player);
	if (resp.formValues === undefined || typeof resp.formValues[0] !== "number") {
		system.run(() => getStartedTypeId(context));
		return;
	}
	switch (resp.formValues[0]) {
		case 0:
			context.commandType = "givex";
			break;
		case 1:
			context.commandType = "blockx";
			break;
		case 2:
			context.commandType = "spawnx";
			break;
	}
	system.run(() => getStartedProperties(context));
}
