import { system } from "@minecraft/server";
import { FormInfo } from "./info";
import { type ActionForm, showActionForm } from "./types";

export const FormWiki: ActionForm = {
	components: [
		{
			addStyling: true,
			async callback(player): Promise<void> {
				system.run(() => {
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
	title: "Wiki",
};
