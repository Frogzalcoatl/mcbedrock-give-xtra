import { type Player, system } from "@minecraft/server";
import { FormInfo } from "./info";
import { type ActionForm, showActionForm } from "./types";

export const FormCredits: ActionForm = {
	// \n for spacing
	body: "Programming: §eFrogzalcoatl\n§rProject Setup: §eSunnyTheFennec\n\n\n\n\n\n\n\n\n\n§r",
	components: [
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
	title: "Credits",
};
