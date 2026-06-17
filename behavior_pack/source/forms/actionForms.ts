import { type Player, type RawMessage, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import type { ActionFormButton, ActionFormComponent } from "../types";

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

	// returns button selection index
	public async show(viewer: Player): Promise<number | undefined> {
		const formData = new ActionFormData();
		formData.title(`§0${this.title}`);
		if (this.body) {
			formData.body(this.body);
		}
		const buttons: ActionFormButton[] = [];
		for (const component of this.components) {
			if (component.type === "button") {
				buttons.push(component);
			}
			this.addComponentToFormData(component, formData);
		}
		const result = await formData.show(viewer);
		if (result.canceled || result.selection === undefined) {
			return;
		}
		const selectedButton = buttons[result.selection];
		if (selectedButton?.callback !== undefined) {
			const callback = selectedButton.callback;
			system.run(async () => {
				callback(viewer);
			});
		}
		return Promise.resolve(result.selection);
	}
}
