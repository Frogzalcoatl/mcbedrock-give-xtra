import { system } from "@minecraft/server";
import {
	ActionFormData,
	type ActionFormResponse,
	ModalFormData,
	type ModalFormResponse,
} from "@minecraft/server-ui";
import { MAX_LORE_CHAR_COUNT, MAX_LORE_LINE_COUNT } from "../../constants";
import { safeActionFormShow, safeModalFormShow } from "../safeShow";
import { formatLabel, type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

async function promptNewLore(
	context: GetStartedContext,
	previousInput: string = "",
	error?: string,
): Promise<void> {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	form.textField(
		formatLabel(
			"What would you like this line of lore to say?",
			`Max Char Count is ${MAX_LORE_CHAR_COUNT}:`,
			error,
		),
		"",
		{ defaultValue: previousInput },
	);
	form.divider();
	form.label("");
	form.submitButton("Submit");
	const resp: ModalFormResponse = await safeModalFormShow(form, context.player);
	if (!context.player.isValid) {
		return;
	}
	if (resp.formValues === undefined || typeof resp.formValues[0] !== "string") {
		system.run(() => getStartedLore(context, "§cLore unchanged"));
		return;
	}
	if (resp.formValues[0].length > MAX_LORE_CHAR_COUNT) {
		const input: string = resp.formValues[0];
		system.run(() =>
			promptNewLore(
				context,
				input,
				`Lore length cannot exceed ${MAX_LORE_CHAR_COUNT} characters (currently ${input.length} characters long`,
			),
		);
		return;
	}
	if (context.json.lore === null) {
		context.json.lore = [];
	}
	context.json.lore.push(resp.formValues[0]);
	system.run(() => getStartedLore(context, "Updated lore"));
}

export async function getStartedLore(
	context: GetStartedContext,
	message: string = "",
): Promise<void> {
	const form = new ActionFormData();
	form.title(getStartedTitle);
	form.body(message);
	form.button("Back");
	form.button("New Line", "textures/ui/anvil-plus");
	if (context.json.lore === null) {
		context.json.lore = [];
	}
	for (const lore of context.json.lore) {
		form.button(`${lore.slice(0, 10)}${lore.length > 10 ? "..." : ""}\n§cClick to Remove!`);
	}
	const resp: ActionFormResponse = await safeActionFormShow(form, context.player);
	if (!context.player.isValid) {
		return;
	}
	if (resp.selection === undefined || resp.selection === 0) {
		system.run(() => getStartedProperties(context));
	} else if (resp.selection === 1) {
		if (context.json.lore.length >= MAX_LORE_LINE_COUNT) {
			system.run(() =>
				getStartedLore(
					context,
					`§cMaximum lore line count reached (${MAX_LORE_LINE_COUNT})`,
				),
			);
		} else {
			system.run(() => promptNewLore(context));
		}
	} else {
		const indexToRemove: number = resp.selection - 2;
		const removedValue: string | undefined = context.json.lore.splice(indexToRemove, 1)[0];
		system.run(() => getStartedLore(context, `Removed: "${removedValue}§r"`));
	}
}
