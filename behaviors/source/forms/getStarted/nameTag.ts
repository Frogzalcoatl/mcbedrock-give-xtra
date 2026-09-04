import { system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { MAX_NAMETAG_LENGTH } from "../../constants";
import { formatLabel, type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

function getForm(input: string, error?: string): ModalFormData {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	const top: string = "Would you like to give your item a custom name?";
	const bottom: string = "Enter Name Tag:";
	form.textField(formatLabel(top, bottom, error), "", { defaultValue: input ?? "" });
	form.toggle("Use Default Name Tag", { defaultValue: false });
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	return form;
}

export async function getStartedNameTag(context: GetStartedContext): Promise<void> {
	let input: string | null = null;
	let form: ModalFormData = getForm(context.json.nameTag ?? "");
	while (input === null || input.length >= MAX_NAMETAG_LENGTH) {
		if (input !== null) {
			form = getForm(input, `Invalid Name Tag "${input}"`);
		}
		const resp: ModalFormResponse = await form.show(context.player);
		if (
			resp.formValues === undefined ||
			typeof resp.formValues[0] !== "string" ||
			typeof resp.formValues[1] !== "boolean"
		) {
			system.run(() => getStartedProperties(context, "§cName Tag unchanged"));
			return;
		}
		input = resp.formValues[0];
		const useDefaultNameTag: boolean = resp.formValues[1];
		if (useDefaultNameTag) {
			context.json.nameTag = null;
			system.run(() => getStartedProperties(context, "Name Tag set to: §eDefault"));
			return;
		}
	}
	context.json.nameTag = input;
	system.run(() =>
		getStartedProperties(context, `Name Tag set to: "§o${context.json.nameTag}§r"`),
	);
}
