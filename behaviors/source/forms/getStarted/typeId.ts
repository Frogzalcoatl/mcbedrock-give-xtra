import { ItemTypes, system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { formInfo } from "../info";
import { formatLabel, type GetStartedContext, getStartedTitle } from "./getStarted";

function getForm(input: string, error?: string): ModalFormData {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	const top: string = "What item would you like to use?";
	const bottom: string = "Enter item type ID:";
	form.textField(formatLabel(top, bottom, error), "", { defaultValue: input });
	form.label("§r");
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	return form;
}

export async function getStartedTypeId(context: GetStartedContext): Promise<void> {
	let form: ModalFormData = getForm(context.json.typeId);
	let input: string = "";
	let formattedId: string | undefined;
	while (formattedId === undefined) {
		if (input) {
			form = getForm(input, `Invalid Type ID "${input}"`);
		}
		const resp: ModalFormResponse = await form.show(context.player);
		if (resp.formValues === undefined || typeof resp.formValues[0] !== "string") {
			if (context.openedFromInfo) {
				system.run(() => formInfo(context.player));
			}
			return;
		}
		input = resp.formValues[0];
		formattedId = ItemTypes.get(input)?.id;
	}
	context.json.typeId = formattedId;
	// system.run(() => promptCommandType());
}
