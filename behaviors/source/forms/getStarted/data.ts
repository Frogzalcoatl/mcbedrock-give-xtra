import { system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { stringToFiniteNumber } from "../../commands/utils/beautification";
import { MAX_DATA } from "../../constants";
import { formatLabel, type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

function getForm(input: number, error?: string): ModalFormData {
	const top: string = "Would you like to set a data value for your item?";
	const bottom: string = `Enter a positive integer less than ${MAX_DATA}:`;
	const form = new ModalFormData();
	form.title(getStartedTitle);
	form.textField(formatLabel(top, bottom, error), "", { defaultValue: `${input}` });
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	return form;
}

export async function getStartedData(context: GetStartedContext): Promise<void> {
	let form: ModalFormData = getForm(context.json.data ?? 0);
	let input: number | null = null;
	while (input === null || input < 0 || input > MAX_DATA || !Number.isInteger(input)) {
		if (input !== null) {
			form = getForm(input, `Invalid data value "${input}"`);
		}
		const resp: ModalFormResponse = await form.show(context.player);
		if (resp.formValues === undefined || typeof resp.formValues[0] !== "string") {
			system.run(() => getStartedProperties(context, "§cData unchanged"));
			return;
		}
		input = stringToFiniteNumber(resp.formValues[0]);
	}
	system.run(() => {
		if (input === 0) {
			context.json.data = null;
			getStartedProperties(context, `Data set to: §eDefault (${input})`);
		} else {
			context.json.data = input;
			getStartedProperties(context, `Data set to: §e${input}`);
		}
	});
}
