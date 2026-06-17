import { type Player, system } from "@minecraft/server";
import { FormCredits } from "./credits";
import { ItemDataCreator } from "./itemDataCreation";
import { FormWiki } from "./wiki";
import { ActionForm, showActionForm } from "./types";

export const FormHelp: ActionForm = {
	body: "Expansion of Minecraft Bedrock's /give command including item names, enchantments, and more.",
	components: [
		{
			addStyling: true,
			async callback(player: Player): Promise<void> {
				system.run(async () => {
					const creator = new ItemDataCreator(player);
					creator.run();
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
	title: "Givex Help",
};
