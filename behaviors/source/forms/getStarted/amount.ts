import { ItemStack, system } from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { MAX_AMOUNT } from "../../constants";
import { SlotName } from "../../items/slot";
import { stringToFiniteNumber } from "./commandVector3";
import { formatLabel, type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

function getMaxAmount(context: GetStartedContext): number {
	const multiStackSlots: string[] = [
		SlotName.Hotbar,
		SlotName.Inventory,
		SlotName.MobChest,
		SlotName.EndChest,
	];
	if (
		context.json.slotId !== null ||
		(context.json.slot !== null && !multiStackSlots.includes(context.json.slot))
	) {
		const itemStack = new ItemStack(context.json.typeId);
		return itemStack.maxAmount;
	} else {
		return MAX_AMOUNT;
	}
}

function getForm(
	context: GetStartedContext,
	input: number,
	maxAmount: number,
	error?: string,
): ModalFormData {
	const top: string = `How much of your item would you like to ${context.commandType === "spawnx" ? "spawn" : "give"}?`;
	const bottom: string = `Enter integer within range 1-${maxAmount}`;
	const form = new ModalFormData();
	form.title(getStartedTitle);
	form.textField(formatLabel(top, bottom, error), "", { defaultValue: `${input}` });
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	return form;
}

export async function getStartedAmount(context: GetStartedContext): Promise<void> {
	const maxAmount: number = getMaxAmount(context);
	let form: ModalFormData = getForm(context, context.json.amount, maxAmount);
	let input: number | null = null;
	while (input === null || input < 1 || input > maxAmount || !Number.isInteger(input)) {
		if (input !== null) {
			form = getForm(context, input, maxAmount, `Invalid amount "${input}"`);
		}
		const resp: ModalFormResponse = await form.show(context.player);
		if (resp.formValues === undefined || typeof resp.formValues[0] !== "string") {
			system.run(() => getStartedProperties(context, "§cAmount unchanged"));
			return;
		}
		input = stringToFiniteNumber(resp.formValues[0]);
	}
	context.json.amount = input;
	system.run(() => getStartedProperties(context, `Amount set to: §e${input}`));
}
