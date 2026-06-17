import { system } from "@minecraft/server";
import { FormHelp } from "./help";
import { ActionForm, showActionForm } from "./types";

export const FormWiki: ActionForm = {
	components: [
		{
			addStyling: true,
			async callback(player): Promise<void> {
				system.run(() => {
					showActionForm(FormHelp, player);
				});
			},
			text: "Back",
			type: "button",
		},
	],
	title: "Wiki",
};
