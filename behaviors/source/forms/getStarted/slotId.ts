import { system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { safeModalFormShow } from "../safeShow";
import { stringToFiniteNumber } from "./commandVector3";
import { formatLabel, type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

export async function getStartedSlotId(
	context: GetStartedContext,
	lastInput?: string,
	error?: string,
): Promise<void> {
	const label: string = formatLabel(
		"Would you like to select a Slot Id for your item?",
		"Enter a positive integer:",
		error,
	);
	const defaultValue: string = `${lastInput !== undefined ? lastInput : context.json.slotId === null ? "" : context.json.slotId}`;
	const form = new ModalFormData();
	form.title(getStartedTitle);
	form.textField(label, "", {
		defaultValue: defaultValue,
		tooltip: "Leave blank to reset Slot Id",
	});
	form.divider();
	form.label("");
	form.submitButton("Submit");
	const resp: ModalFormResponse = await safeModalFormShow(form, context.player);
	if (!context.player.isValid) {
		return;
	}
	if (resp.formValues === undefined || typeof resp.formValues[0] !== "string") {
		system.run(() => getStartedProperties(context, "§cSlot Id unchanged"));
		return;
	}
	if (resp.formValues[0] === "") {
		context.json.slotId = null;
		system.run(() => getStartedProperties(context, "Slot Id set to: §eNone"));
		return;
	}
	const num: number | null = stringToFiniteNumber(resp.formValues[0]);
	if (num === null || num < 0 || !Number.isInteger(num)) {
		const formValues = resp.formValues;
		system.run(() =>
			getStartedSlotId(context, `${formValues[0]}`, `Invalid Slot Id "${formValues[0]}"`),
		);
		return;
	}
	context.json.slotId = num;
	system.run(() => getStartedProperties(context, `Slot Id set to: §e${num}`));
}
