import { type Player, system } from "@minecraft/server";
import { ActionFormData, type ActionFormResponse } from "@minecraft/server-ui";
import { formInfo } from "./info";

export async function formCredits(viewer: Player): Promise<void> {
	const form = new ActionFormData();
	form.title("§0Givex Info");
	form.body(`
§rProgramming: §eFrogzalcoatl
§rProject Setup: §eSunnyTheFennec

§rProject Source Code:
§bhttps://github.com/Frogzalcoatl/
mcbedrock-give-xtra

§rVersion:
§7Pre-Release v1.0.0 June 2026
§r
`);
	form.divider();
	form.button("Back");
	const resp: ActionFormResponse = await form.show(viewer);
	if (resp.selection === undefined || resp.selection === 0) {
		system.run(() => formInfo(viewer));
	}
}
