import { type Player, system } from "@minecraft/server";
import { ActionFormData, type ActionFormResponse } from "@minecraft/server-ui";
import { safeActionFormShow } from "../safeShow";
import { formWikiJsonList, wikiTitle } from "./wiki";

export async function formWikiJsonParam(
	viewer: Player,
	name: string,
	description: string,
	defaultValue: string,
	example: string,
): Promise<void> {
	const form = new ActionFormData();
	form.title(wikiTitle);
	form.body(`${name}:\n§e${description}`);
	form.divider();
	form.label(`Default = ${defaultValue}\n\nEx: §7"${example}"`);
	form.divider();
	form.button("Back");
	const resp: ActionFormResponse = await safeActionFormShow(form, viewer);
	if (!viewer.isValid) {
		return;
	}
	if (resp.selection === undefined || resp.selection === 0) {
		system.run(() => formWikiJsonList(viewer));
	}
}
