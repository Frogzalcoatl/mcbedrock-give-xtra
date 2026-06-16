import { type Player, type RawMessage, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { GetStartedArgs, ModalForm } from "./modalForms";
import type { ActionFormButton, ActionFormComponent } from "./types";

export function styleButtonText(text: string): string {
	return `--[${text}]--`;
}

export interface ActionFormArgs {
	readonly title: RawMessage | string;
	readonly components: ActionFormComponent[];
	readonly body?: RawMessage | string;
}

export class ActionForm {
	public title: RawMessage | string;
	public components: ActionFormComponent[];
	public body: RawMessage | string | undefined;
	constructor(args: ActionFormArgs) {
		this.title = args.title;
		this.components = args.components;
		this.body = args.body;
	}

	private addComponentToFormData(component: ActionFormComponent, formData: ActionFormData): void {
		switch (component.type) {
			case "button":
				{
					let text = component.text;
					if (component.addStyling && typeof text === "string") {
						text = styleButtonText(text);
					}
					formData.button(text, component.iconPath);
				}
				break;
			case "divider":
				{
					formData.divider();
				}
				break;
			case "header":
				{
					formData.header(component.text);
				}
				break;
			case "label":
				{
					formData.label(component.text);
				}
				break;
		}
	}

	public async show(viewer: Player): Promise<void> {
		const formData = new ActionFormData();
		formData.title(`§0${this.title}`);
		if (this.body) {
			formData.body(this.body);
		}
		const formButtons: ActionFormButton[] = [];
		for (const component of this.components) {
			if (component.type === "button") {
				formButtons.push(component);
			}
			this.addComponentToFormData(component, formData);
		}
		const result = await formData.show(viewer);
		if (result.canceled || result.selection === undefined) {
			return;
		}
		const selectedButton = formButtons[result.selection];
		if (selectedButton === undefined) {
			return;
		}
		system.run(async () => {
			selectedButton.callback(viewer);
		});
	}
}

export const HelpForm = new ActionForm({
	body: "Expansion of Minecraft Bedrock's /give command including item names, enchantments, and more.",
	components: [
		{
			addStyling: true,
			callback: async (viewer: Player) => {
				const GetStarted = new ModalForm(GetStartedArgs);
				GetStarted.show(viewer);
			},
			text: "Get Started",
			type: "button",
		},
		{
			type: "divider",
		},
		{
			addStyling: true,
			callback: async (viewer: Player) => {
				WikiForm.show(viewer);
			},
			text: "Wiki",
			type: "button",
		},
		{
			addStyling: true,
			callback: async (viewer: Player) => {
				CreditsForm.show(viewer);
			},
			text: "Credits",
			type: "button",
		},
	],
	title: "Givex Help",
});

const CreditsForm = new ActionForm({
	// \n for spacing
	body: "Programming: §eFrogzalcoatl\n§rProject Setup: §eSunnyTheFennec\n\n\n\n\n\n\n\n\n\n§r",
	components: [
		{
			addStyling: true,
			callback: async (viewer: Player) => {
				HelpForm.show(viewer);
			},
			text: "Back",
			type: "button",
		},
	],
	title: "Credits",
});

const WikiForm = new ActionForm({
	components: [
		{
			addStyling: true,
			callback: async (viewer: Player) => {
				HelpForm.show(viewer);
			},
			text: "Back",
			type: "button",
		},
	],
	title: "Wiki",
});
