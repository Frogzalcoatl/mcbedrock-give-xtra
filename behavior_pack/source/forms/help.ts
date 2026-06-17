import { type Player, system } from "@minecraft/server";
import { ActionForm } from "./actionForms";
import { FormCredits } from "./credits";
import { ItemDataCreation } from "./itemDataCreation";
import { FormWiki } from "./wiki";

export const FormHelp = new ActionForm({
	body: "Expansion of Minecraft Bedrock's /give command including item names, enchantments, and more.",
	components: [
		{
			addStyling: true,
			async callback(player: Player): Promise<void> {
				system.run(async () => {
					ItemDataCreation.run(player);
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
					FormWiki.show(player);
				});
			},
			text: "Wiki",
			type: "button",
		},
		{
			addStyling: true,
			async callback(player: Player): Promise<void> {
				system.run(async () => {
					FormCredits.show(player);
				});
			},
			text: "Credits",
			type: "button",
		},
	],
	title: "Givex Help",
});
