import type { Player } from "@minecraft/server";
import { ActionFormData, type ActionFormResponse } from "@minecraft/server-ui";

const form = new ActionFormData();
form.title("§0Wiki");
form.button("Back");

export async function formWiki(viewer: Player): Promise<void> {
	const resp: ActionFormResponse = await form.show(viewer);
	if (resp.selection === undefined || resp.selection === 0) {
		// system.run(() => formInfo(viewer));
	}
}
