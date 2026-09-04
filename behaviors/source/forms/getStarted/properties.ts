import {
	type Enchantment,
	ItemComponentTypes,
	type ItemDurabilityComponent,
	type ItemEnchantableComponent,
	ItemStack,
	system,
} from "@minecraft/server";
import {
	ActionFormData,
	type ActionFormResponse,
	MessageFormData,
	type MessageFormResponse,
} from "@minecraft/server-ui";
import { type GivexJson, validJsonKeys } from "../../commands/utils/json";
import { getStartedAmount } from "./amount";
import { commandVector3ToString } from "./commandVector3";
import { getStartedData } from "./data";
import { getStartedDurability } from "./durability";
import { formGetStarted, type GetStartedContext, getStartedTitle } from "./getStarted";
import { getIconPath } from "./iconPaths";
import { getStartedKeepOnDeath } from "./keepOnDeath";
import { getStartedLocation } from "./location";
import { getStartedLockMode } from "./lockMode";
import { getStartedNameTag } from "./nameTag";

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
	if (j.nameTag !== null) {
		str += `\n§rName Tag: "§o${j.nameTag}§r"`;
	}
	if (j.data !== null) {
		str += `\n§rData: §e${j.data}`;
	}
	if (j.lockMode !== null) {
		str += `\n§rLock Mode: §e${j.lockMode}`;
	}
	if (j.keepOnDeath !== null) {
		str += `\n§rKeep on Death: §e${j.keepOnDeath}`;
	}
	if (j.canPlaceOn !== null) {
		str += `\n§rCan Place On:\n§e${blockListToString(j.canPlaceOn, 16)}`;
	}
	if (j.canDestroy !== null) {
		str += `\n§rCan Destroy:\n§e${blockListToString(j.canDestroy, 16)}`;
	}
	if (j.durability !== null) {
		str += `\n§rDurability: §e${j.durability}`;
	}
	if (context.enchants.length > 0) {
		str += `\n§rEnchants:§e\n${enchantsToString(context.enchants, 16)}`;
		for (let i: number = 0; i < context.enchants.length; i++) {}
	}
	if (j.slot !== null) {
		str += `\n§rSlot: §e${j.slot}`;
	}
	if (j.slotId !== null) {
		str += `\n§rSlot ID: §e${j.slotId}`;
	}
	if (j.replaceMode !== null) {
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
	if (resp.selection === 1) {
		system.run(() => getStartedProperties(context));
	} else {
		system.run(() => formGetStarted(context.player, context.json.typeId));
	}
}

function getExcludedProperties(context: GetStartedContext): string[] {
	const arr: string[] = ["typeId"];
	if (context.commandType === "spawnx") {
		arr.push("slot");
		arr.push("slotId");
		arr.push("replaceMode");
	}
	const item = new ItemStack(context.json.typeId);
	const durability: ItemDurabilityComponent | undefined = item.getComponent(
		ItemComponentTypes.Durability,
	);
	if (durability === undefined) {
		arr.push("durability");
	}
	const enchantable: ItemEnchantableComponent | undefined = item.getComponent(
		ItemComponentTypes.Enchantable,
	);
	if (enchantable === undefined) {
		arr.push("enchants");
	}
	return arr;
}

export async function getStartedProperties(
	context: GetStartedContext,
	optionalMessage?: string,
): Promise<void> {
	const jsonKeys: string[] = [];
	if (context.commandType !== "givex") {
		jsonKeys.push("location");
	}
	const exclude: string[] = getExcludedProperties(context);
	for (const key of validJsonKeys) {
		if (exclude.includes(key)) {
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
	system.run(() => {
		switch (jsonKeys[keyIndex]) {
			case "amount":
				getStartedAmount(context);
				break;
			case "location":
				getStartedLocation(context);
				break;
			case "nameTag":
				getStartedNameTag(context);
				break;
			case "lockMode":
				getStartedLockMode(context);
				break;
			case "data":
				getStartedData(context);
				break;
			case "keepOnDeath":
				getStartedKeepOnDeath(context);
				break;
			case "durability":
				getStartedDurability(context);
				break;
			default:
				getStartedProperties(context, "§cNot Finished");
		}
	});
}
