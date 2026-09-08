import { type Player, system } from "@minecraft/server";
import { ActionFormData, type ActionFormResponse } from "@minecraft/server-ui";
import { safeActionFormShow } from "../safeShow";
import { formWikiCommandList, wikiTitle } from "./wiki";

export interface WikiParam {
	name: string;
	description: string;
}
export interface WikiCommand {
	name: string;
	description: string;
	params: WikiParam[];
}
export async function formWikiCommand(viewer: Player, command: WikiCommand): Promise<void> {
	const form = new ActionFormData();
	form.title(wikiTitle);
	const p: WikiParam[] = command.params;
	form.body(
		`Usage:\n/${command.name} ${p.reduce((pv, cv) => `${pv}> <${cv.name}`, "").slice(2)}>`,
	);
	form.label(`§e${command.description}`);
	form.divider();
	for (const param of p) {
		form.label(`${param.name}: §7${param.description}`);
	}
	form.divider();
	form.button("Back");
	const resp: ActionFormResponse = await safeActionFormShow(form, viewer);
	if (!viewer.isValid) {
		return;
	}
	if (resp.selection === undefined || resp.selection === 0) {
		system.run(() => formWikiCommandList(viewer));
	}
}
