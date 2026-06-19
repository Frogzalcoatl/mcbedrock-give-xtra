import { type Player, system } from "@minecraft/server";
import { FormCredits } from "./credits";
import { ItemPropertiesForm } from "./itemPropertiesForm";
import { type ActionForm, showActionForm } from "./types";
import { FormWiki } from "./wiki";

export const FormInfo: ActionForm = {
	body: "Expansion of Minecraft Bedrock's /give command including item names, enchantments, and more.",
	components: [
		{
			addStyling: true,
			async callback(player: Player): Promise<void> {
				system.run(async () => {
					const propertiesForm = new ItemPropertiesForm(player, true);
					propertiesForm.run();
				});
			},
			text: "Get Started",
			type: "button",
		},
		{
			type: "divider",
		},
		{
			addStyling: true,
			async callback(player: Player): Promise<void> {
				system.run(async () => {
					showActionForm(FormWiki, player);
				});
			},
			text: "Wiki",
			type: "button",
		},
		{
			addStyling: true,
			async callback(player: Player): Promise<void> {
				system.run(async () => {
					showActionForm(FormCredits, player);
				});
			},
			text: "Credits",
			type: "button",
		},
	],
	title: "Givex Info",
};
