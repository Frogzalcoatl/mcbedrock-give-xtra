import { type Player, system } from "@minecraft/server";
import { ActionFormData, type ActionFormResponse } from "@minecraft/server-ui";
import { formInfo } from "./info";
import { safeActionFormShow } from "./safeShow";

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
§7Release v1.0.0 September 2026
§r
`);
	form.divider();
	form.button("Back");
	const resp: ActionFormResponse = await safeActionFormShow(form, viewer);
	if (!viewer.isValid) {
		return;
	}
	if (resp.selection === undefined || resp.selection === 0) {
		system.run(() => formInfo(viewer));
	}
}
