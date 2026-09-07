import { system } from "@minecraft/server";
import {
	ActionFormData,
	type ActionFormResponse,
	ModalFormData,
	type ModalFormResponse,
} from "@minecraft/server-ui";
import { prettyTypeId } from "../../commands/utils/beautification";
import { validBlockTypes } from "../../commands/utils/json";
import { safeActionFormShow, safeModalFormShow } from "../safeShow";
import { formatLabel, type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

// List should be either context.json.canPlaceOn or context.json.canDestroy
async function displayBlockList(
	context: GetStartedContext,
	list: string[],
	message: string = "",
): Promise<void> {
	const form = new ActionFormData();
	form.title(getStartedTitle);
	form.body(message);
	form.button("Back");
	form.button("Add Blocks", "textures/ui/anvil-plus");
	for (const block of list) {
		form.button(`${prettyTypeId(block)}\n§cClick to Remove!`);
	}
	const resp: ActionFormResponse = await safeActionFormShow(form, context.player);
	if (!context.player.isValid) {
		return;
	}
	if (resp.selection === undefined || resp.selection === 0) {
		system.run(() => getStartedProperties(context));
	} else if (resp.selection === 1) {
		system.run(() => displayInput(context, list));
	} else {
		const indexToRemove: number = resp.selection - 2;
		const removedValue: string | undefined = list.splice(indexToRemove, 1)[0];
		system.run(() =>
			displayBlockList(context, list, `Removed ${prettyTypeId(removedValue ?? "")}`),
		);
	}
}

async function displayInput(
	context: GetStartedContext,
	list: string[],
	previousInput: string = "",
	error?: string,
): Promise<void> {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	form.textField(
		formatLabel(
			"What blocks would you like to add?",
			"Enter a comma separated list of block types:",
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
		system.run(() => displayBlockList(context, list, `§cBlocks unchanged`));
		return;
	}
	const newList: string[] = resp.formValues[0].split(/\s*,\s*/);
	const invalidIndex: number | null = validBlockTypes(newList);
	if (invalidIndex === null) {
		list.push(...newList);
		system.run(() => displayBlockList(context, list, "Added blocks"));
	} else {
		const input: string = resp.formValues[0];
		system.run(() =>
			displayInput(context, list, input, `Invalid block at "${newList[invalidIndex]}"`),
		);
	}
}

export async function getStartedCanPlaceOn(context: GetStartedContext): Promise<void> {
	system.run(() => {
		if (context.json.canPlaceOn === null) {
			context.json.canPlaceOn = [];
		}
		displayBlockList(context, context.json.canPlaceOn);
	});
}

export async function getStartedCanDestroy(context: GetStartedContext): Promise<void> {
	system.run(() => {
		if (context.json.canDestroy === null) {
			context.json.canDestroy = [];
		}
		displayBlockList(context, context.json.canDestroy);
	});
}
