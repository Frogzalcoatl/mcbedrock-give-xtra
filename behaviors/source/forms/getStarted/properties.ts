import { type Enchantment, system } from "@minecraft/server";
import {
	ActionFormData,
	type ActionFormResponse,
	MessageFormData,
	type MessageFormResponse,
} from "@minecraft/server-ui";
import { type GivexJson, validJsonKeys } from "../../commands/utils/json";
import { getIconPath } from "../iconPaths";
import { getStartedAmount } from "./amount";
import { commandVector3ToString } from "./commandVector3";
import { formGetStarted, type GetStartedContext, getStartedTitle } from "./getStarted";

function blockListToString(list: string[], maxLength: number): string {
	let str: string = "";
	let exceedsMaxLength: boolean = false;
	let length: number = list.length;
	if (list.length > maxLength) {
		exceedsMaxLength = true;
		length = maxLength;
	}
	for (let i = 0; i < length; i++) {
		str += `\n${list[i]}`;
	}
	if (exceedsMaxLength) {
		str += "\n...";
	}
	return str;
}

function enchantsToString(enchants: Enchantment[], maxLength: number): string {
	let str: string = "";
	let exceedsMaxLength: boolean = false;
	let length: number = enchants.length;
	if (enchants.length > maxLength) {
		exceedsMaxLength = true;
		length = maxLength;
	}
	for (let i = 0; i < length; i++) {
		str += `\n-${enchants[i]?.type.id} ${enchants[i]?.level}`;
	}
	if (exceedsMaxLength) {
		str += "\n...";
	}
	return str;
}

function contextToString(context: GetStartedContext): string {
	const j: GivexJson = context.json;
	let str: string = `
§rItem Type: §e${j.typeId}
§rAmount: §e${j.amount}
§rCommand Type: §e/${context.commandType}`;
	if (context.commandType !== "givex") {
		str += `\n§rLocation: §e${commandVector3ToString(context.location)}`;
	}
	if (j.nameTag !== undefined) {
		str += `\n§rName Tag: §e${j.nameTag}`;
	}
	if (j.data !== undefined) {
		str += `\n§rData: §e${j.data}`;
	}
	if (j.lockMode !== undefined) {
		str += `\n§rLock Mode: §e${j.lockMode}`;
	}
	if (j.keepOnDeath !== undefined) {
		str += `\n§rKeep on Death: §e${j.keepOnDeath}`;
	}
	if (j.canPlaceOn !== undefined) {
		str += `\n§rCan Place On:\n§e${blockListToString(j.canPlaceOn, 16)}`;
	}
	if (j.canDestroy !== undefined) {
		str += `\n§rCan Destroy:\n§e${blockListToString(j.canDestroy, 16)}`;
	}
	if (j.durability !== undefined) {
		str += `\n§rKeep on Death: §e${j.durability}`;
	}
	if (context.enchants.length > 0) {
		str += `\n§rEnchants:§e\n${enchantsToString(context.enchants, 16)}`;
		for (let i: number = 0; i < context.enchants.length; i++) {}
	}
	if (j.slot !== undefined) {
		str += `\n§rSlot: §e${j.slot}`;
	}
	if (j.slotId !== undefined) {
		str += `\n§rSlot ID: §e${j.slotId}`;
	}
	if (j.replaceMode !== undefined) {
		str += `\n§rReplace Mode: §e${j.replaceMode}`;
	}
	return str;
}

async function backConfirmation(context: GetStartedContext): Promise<void> {
	const form = new MessageFormData();
	form.title("Go Back?");
	form.body(
		"Are you sure you would like to go back? Any selected item properties will be reset.",
	);
	form.button1("I'm Sure!");
	form.button2("Cancel");
	const resp: MessageFormResponse = await form.show(context.player);
	if (resp.selection === undefined || resp.selection === 1) {
		system.run(() => getStartedProperties(context));
	} else {
		system.run(() => formGetStarted(context.player, context.json.typeId));
	}
}

export async function getStartedProperties(
	context: GetStartedContext,
	optionalMessage?: string,
): Promise<void> {
	const jsonKeys: string[] = [];
	if (context.commandType !== "givex") {
		jsonKeys.push("location");
	}
	const excludedForSpawnx: string[] = ["slot", "slotId", "replaceMode"];
	for (const key of validJsonKeys) {
		if (
			key === "typeId" ||
			(context.commandType === "spawnx" && excludedForSpawnx.includes(key))
		) {
			continue;
		}
		jsonKeys.push(key);
	}
	const submitButtonIndex: number = jsonKeys.length + 1;
	const form = new ActionFormData();
	form.title(getStartedTitle);
	let body: string = `Select property to edit for:\n§e${context.json.typeId}`;
	if (optionalMessage) {
		body = `${optionalMessage}§r\n\n${body}`;
	}
	form.body(body);
	form.divider();
	form.button("Back");
	for (const key of jsonKeys) {
		form.button(key, getIconPath(key));
	}
	form.button("Submit");
	form.label(`Selected Properties:${contextToString(context)}`);
	const resp: ActionFormResponse = await form.show(context.player);
	if (resp.selection === undefined || resp.selection === 0) {
		system.run(() => backConfirmation(context));
		return;
	} else if (resp.selection === submitButtonIndex) {
		return;
	}
	const keyIndex: number = resp.selection - 1;
	switch (jsonKeys[keyIndex]) {
		case "amount":
			system.run(() => getStartedAmount(context));
			break;
		default:
			system.run(() => getStartedProperties(context, "§cNot Finished"));
	}
}
