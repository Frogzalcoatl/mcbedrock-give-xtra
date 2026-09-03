import { system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import {
	type CommandVector3,
	type CommandVector3ParseResult,
	commandVector3ToString,
	parseCommandVector3,
} from "./commandVector3";
import { formatLabel, type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

function getForm(context: GetStartedContext, input: string, error?: string): ModalFormData {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	const top: string =
		context.commandType === "spawnx"
			? "Where would you like to spawn your item?"
			: "What block location would you like to target?";
	const bottom: string = "Enter Coordinates:";
	form.textField(formatLabel(top, bottom, error), "", { defaultValue: input });
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	return form;
}

export async function getStartedLocation(context: GetStartedContext): Promise<void> {
	let form: ModalFormData = getForm(context, commandVector3ToString(context.location));
	let input: string = "";
	let location: CommandVector3 | undefined;
	while (location === undefined) {
		const resp: ModalFormResponse = await form.show(context.player);
		if (resp.formValues === undefined || typeof resp.formValues[0] !== "string") {
			system.run(() => getStartedProperties(context, "§cLocation unchanged"));
			return;
		}
		input = resp.formValues[0];
		const result: CommandVector3ParseResult = parseCommandVector3(input);
		location = result.vector;
		if (location === undefined) {
			form = getForm(context, input, result.message);
		}
	}
	context.location = location;
	system.run(() =>
		getStartedProperties(context, `Location set to: §e${commandVector3ToString(location)}`),
	);
}
