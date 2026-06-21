import { type Player, system } from "@minecraft/server";
import { FormInfo } from "./info";
import { type ActionForm, showActionForm } from "./types";

const text: string = `
§rProgramming: §eFrogzalcoatl
§rProject Setup: §eSunnyTheFennec

§rProject Source Code:
§bhttps://github.com/Frogzalcoatl/
mcbedrock-give-xtra

§rVersion:
§7Pre-Release v1.0.0 June 2026
§r
`; // Not trimmed for extra newline(s) at top and bottom

export const FormCredits: ActionForm = {
	body: text,
	components: [
		{
			type: "divider",
		},
		{
			addStyling: true,
			async callback(player: Player): Promise<void> {
				system.run(async () => {
					showActionForm(FormInfo, player);
				});
			},
			text: "Back",
			type: "button",
		},
	],
	async onClose(player): Promise<void> {
		system.run(async () => {
			showActionForm(FormInfo, player);
		});
	},
	title: "Givex Info",
};
