import { system } from "@minecraft/server";
import { ActionForm } from "./actionForms";
import { FormHelp } from "./help";

export const FormWiki = new ActionForm({
	components: [
		{
			addStyling: true,
			async callback(player): Promise<void> {
				system.run(() => {
					FormHelp.show(player);
				});
			},
			text: "Back",
			type: "button",
		},
	],
	title: "Wiki",
});
