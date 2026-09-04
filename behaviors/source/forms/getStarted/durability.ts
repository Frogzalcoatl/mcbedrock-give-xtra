import {
	ItemComponentTypes,
	type ItemDurabilityComponent,
	ItemStack,
	system,
} from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { stringToFiniteNumber } from "./commandVector3";
import { formatLabel, type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

function getMaxDurability(context: GetStartedContext): number | null {
	const item = new ItemStack(context.json.typeId);
	const durability: ItemDurabilityComponent | undefined = item.getComponent(
		ItemComponentTypes.Durability,
	);
	return durability?.maxDurability ?? null;
}

function getForm(
	input: number,
	infiniteDurability: boolean,
	maxDurability: number,
	error?: string,
): ModalFormData {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	const top: string = "Would you like to set the durability of your item?";
	const bottom: string = `Enter value within range 0-${maxDurability}`;
	form.textField(formatLabel(top, bottom, error), "", { defaultValue: `${input}` });
	form.toggle("Infinite Durability?", {
		defaultValue: infiniteDurability,
		tooltip: "If true, durability number above is ignored",
	});
	form.label("§r");
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	return form;
}

export async function getStartedDurability(context: GetStartedContext): Promise<void> {
	const maxDurability: number | null = getMaxDurability(context);
	if (maxDurability === null) {
		system.run(() =>
			getStartedProperties(context, "§cUnable to determine max durability for item"),
		);
		return;
	}
	let input: number | null = maxDurability;
	let infiniteDurability: boolean = context.json.durability === "unbreakable";
	if (typeof context.json.durability === "number") {
		input = context.json.durability;
	}
	let form: ModalFormData = getForm(input, infiniteDurability, maxDurability);
	input = null;
	while (input === null || input < 0 || input > maxDurability) {
		if (input !== null) {
			form = getForm(
				input,
				infiniteDurability,
				maxDurability,
				`Invalid durability "${input}"`,
			);
		}
		const resp: ModalFormResponse = await form.show(context.player);
		if (
			resp.formValues === undefined ||
			typeof resp.formValues[0] !== "string" ||
			typeof resp.formValues[1] !== "boolean"
		) {
			system.run(() => getStartedProperties(context, "§cDurability unchanged"));
			return;
		}
		input = stringToFiniteNumber(resp.formValues[0]);
		infiniteDurability = resp.formValues[1];
		if (infiniteDurability) {
			context.json.durability = "unbreakable";
			system.run(() => getStartedProperties(context, `Durability set to: §eunbreakable§r`));
			return;
		}
	}
	if (input === maxDurability) {
		context.json.durability = null;
		system.run(() =>
			getStartedProperties(context, `Durability set to: §eDefault (${maxDurability})§r`),
		);
	} else {
		context.json.durability = input;
		system.run(() =>
			getStartedProperties(context, `Durability set to: §e${context.json.durability}§r`),
		);
	}
}
