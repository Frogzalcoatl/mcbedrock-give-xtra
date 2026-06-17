import { type Player, system } from "@minecraft/server";
import { ActionForm } from "./actionForms";
import { FormHelp } from "./help";

export const FormCredits = new ActionForm({
	// \n for spacing
	body: "Programming: §eFrogzalcoatl\n§rProject Setup: §eSunnyTheFennec\n\n\n\n\n\n\n\n\n\n§r",
	components: [
		{
			addStyling: true,
			async callback(player: Player): Promise<void> {
				system.run(async () => {
					FormHelp.show(player);
				});
			},
			text: "Back",
			type: "button",
		},
	],
	title: "Credits",
});
