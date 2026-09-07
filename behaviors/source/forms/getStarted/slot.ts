import { system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { SlotName } from "../../items/slot";
import { safeModalFormShow } from "../safeShow";
import { type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

export async function getStartedSlot(context: GetStartedContext): Promise<void> {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	const slotNames: SlotName[] = Object.values(SlotName);
	let index: number = 0;
	if (context.json.slot !== null) {
		index = slotNames.indexOf(context.json.slot);
		if (index === -1) {
			index = 0;
		} else {
			index++; // account for "defualt"
		}
	}
	form.dropdown("Select a Slot:", ["default"].concat(slotNames), { defaultValueIndex: index });
	form.divider();
	form.label("");
	form.submitButton("Submit");
	const resp: ModalFormResponse = await safeModalFormShow(form, context.player);
	if (!context.player.isValid) {
		return;
	}
	if (resp.formValues === undefined || typeof resp.formValues[0] !== "number") {
		system.run(() => getStartedProperties(context, "§cSlot unchanged"));
		return;
	}
	if (resp.formValues[0] === 0) {
		context.json.slot = null;
		system.run(() => getStartedProperties(context, `Slot set to: §edefault`));
		return;
	}
	const slot: SlotName | undefined = slotNames[resp.formValues[0] - 1];
	if (slot === undefined) {
		system.run(() => getStartedProperties(context, "§cSlot undefined so it was unchanged"));
	} else {
		context.json.slot = slot;
		system.run(() => getStartedProperties(context, `Slot set to: §e${slot}§r`));
	}
}
