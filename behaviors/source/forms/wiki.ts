import { type Player, system } from "@minecraft/server";
import { ActionFormData, type ActionFormResponse } from "@minecraft/server-ui";
import { formInfo } from "./info";

export async function formWiki(viewer: Player): Promise<void> {
	const form = new ActionFormData();
	form.title("§0Wiki");
	form.button("Back");
	const resp: ActionFormResponse = await form.show(viewer);
	if (resp.selection === undefined || resp.selection === 0) {
		system.run(() => formInfo(viewer));
	}
}
