import { system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { safeModalFormShow } from "../safeShow";
import { type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

export async function getStartedReplaceMode(context: GetStartedContext): Promise<void> {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	const replaceModes: string[] = ["keep", "destroy", "move"];
	let index: number = 0;
	if (context.json.replaceMode !== null) {
		index = replaceModes.indexOf(context.json.replaceMode);
		if (index === -1) {
			index = 0;
		}
	}
	form.dropdown("Select a Replace Mode:", replaceModes, { defaultValueIndex: index });
	form.divider();
	form.label("");
	form.submitButton("Submit");
	const resp: ModalFormResponse = await safeModalFormShow(form, context.player);
	if (!context.player.isValid) {
		return;
	}
	if (resp.formValues === undefined || typeof resp.formValues[0] !== "number") {
		system.run(() => getStartedProperties(context, "§cReplace Mode unchanged"));
		return;
	}
	const replaceMode: string | undefined = replaceModes[resp.formValues[0]];
	if (replaceMode === undefined) {
		system.run(() =>
			getStartedProperties(context, "§cReplace Mode undefined so it was unchanged"),
		);
	} else {
		context.json.replaceMode = replaceMode;
		system.run(() => getStartedProperties(context, `Replace Mode set to: §e${replaceMode}§r`));
	}
}
