import { type Player, system } from "@minecraft/server";
import { ActionFormData, type ActionFormResponse } from "@minecraft/server-ui";
import { formCredits } from "./credits";
import { formGetStarted } from "./getStarted/getStarted";
import { formWiki } from "./wiki";

export async function formInfo(viewer: Player): Promise<void> {
	const form = new ActionFormData();
	form.title("§0Givex Info");
	form.body(
		"Expansion of Minecraft Bedrock's /give command including item names, enchantments, and more.",
	);
	form.button("Get Started");
	form.divider();
	form.button("Wiki");
	form.button("Credits");
	const resp: ActionFormResponse = await form.show(viewer);
	if (resp.selection === 0) {
		system.run(() => formGetStarted(viewer));
	} else if (resp.selection === 1) {
		system.run(() => formWiki(viewer));
	} else if (resp.selection === 2) {
		system.run(() => formCredits(viewer));
	}
}
