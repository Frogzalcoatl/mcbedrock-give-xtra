import { system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

export async function getStartedKeepOnDeath(context: GetStartedContext): Promise<void> {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	form.label("§r");
	form.toggle("Keep item on death?", { defaultValue: context.json.keepOnDeath ?? false });
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	const resp: ModalFormResponse = await form.show(context.player);
	if (resp.formValues === undefined || typeof resp.formValues[1] !== "boolean") {
		system.run(() => getStartedProperties(context, "§cKeep on Death unchanged"));
		return;
	}
	const input: boolean = resp.formValues[1];
	if (!input) {
		context.json.keepOnDeath = null;
	} else {
		context.json.keepOnDeath = true;
	}
	system.run(() => getStartedProperties(context, `Keep on Death set to: §e${input}§r`));
}
