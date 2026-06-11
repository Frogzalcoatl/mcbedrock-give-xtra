import { type Player, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import type { Form, FormButton, FormComponent } from "./types";

function addComponentToActionForm(component: FormComponent, actionForm: ActionFormData): void {
	switch (component.type) {
		case "button":
			{
				let text = component.text;
				if (component.addStyling) {
					text = `--[${text}]--`;
				}
				actionForm.button(text, component.iconPath);
			}
			break;
		case "divider":
			{
				actionForm.divider();
			}
			break;
		case "body":
			{
				actionForm.body(component.text);
			}
			break;
		case "header":
			{
				actionForm.header(component.text);
			}
			break;
		case "label":
			{
				actionForm.label(component.text);
			}
			break;
		case "title":
			{
				actionForm.title(component.text);
			}
			break;
	}
}

export async function showForm(form: Form, viewer: Player): Promise<void> {
	const actionForm = new ActionFormData();
	actionForm.title(`§0${form.title}`);
	const formButtons: FormButton[] = [];
	for (const component of form.components) {
		if (component.type === "button") {
			formButtons.push(component);
		}
		addComponentToActionForm(component, actionForm);
	}
	const result = await actionForm.show(viewer);
	if (result.canceled || result.selection === undefined) {
		return;
	}
	const selectedButton = formButtons[result.selection];
	if (selectedButton === undefined) {
		return;
	}
	system.run(async () => {
		selectedButton.callback(viewer, selectedButton.itemData);
	});
}

export const HelpForm: Form = {
	components: [
		{
			text: "Expansion of Minecraft Bedrock's /give command including item names, enchantments, and more.",
			type: "body",
		},
		{
			addStyling: true,
			callback: async (viewer: Player) => {},
			text: "Get Started",
			type: "button",
		},
		{
			type: "divider",
		},
		{
			addStyling: true,
			callback: async (viewer: Player) => {
				showForm(WikiForm, viewer);
			},
			text: "Wiki",
			type: "button",
		},
		{
			addStyling: true,
			callback: async (viewer: Player) => {
				showForm(CreditsForm, viewer);
			},
			text: "Credits",
			type: "button",
		},
	],
	title: "Givex Help",
};

const CreditsForm: Form = {
	components: [
		{
			// \n for spacing
			text: "Programming: §eFrogzalcoatl\n§rProject Setup: §eSunnyTheFennec\n\n\n\n\n\n\n\n\n\n§r",
			type: "body",
		},
		{
			addStyling: true,
			callback: async (viewer: Player) => {
				showForm(HelpForm, viewer);
			},
			text: "Back",
			type: "button",
		},
	],
	title: "Credits",
};

const WikiForm: Form = {
	components: [
		{
			addStyling: true,
			callback: async (viewer: Player) => {
				showForm(HelpForm, viewer);
			},
			text: "Back",
			type: "button",
		},
	],
	title: "Wiki",
};
