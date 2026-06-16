import { type Player, type RawMessage, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { styleButtonText } from "./actionForms";
import { ItemDataValidation } from "./itemData";
import type { ModalFormButton, ModalFormComponent } from "./types";

export interface ModalFormArgs {
	readonly title: RawMessage | string;
	readonly submitButton: ModalFormButton;
	readonly components: ModalFormComponent[];
}

export class ModalForm {
	public title: RawMessage | string;
	public submitButton: ModalFormButton;
	public components: ModalFormComponent[];
	constructor(args: ModalFormArgs) {
		this.title = args.title;
		this.components = args.components;
		this.submitButton = args.submitButton;
	}

	private addComponentToFormData(component: ModalFormComponent, form: ModalFormData): void {
		switch (component.type) {
			case "divider":
				{
					form.divider();
				}
				break;
			case "dropdown":
				{
					form.dropdown(component.label, component.items, component.options);
				}
				break;
			case "header":
				{
					form.header(component.text);
				}
				break;
			case "label":
				{
					form.label(component.text);
				}
				break;
			case "slider":
				{
					form.slider(
						component.label,
						component.minimumValue,
						component.maximumValue,
						component.options,
					);
				}
				break;
			case "textField":
				{
					form.textField(
						component.label,
						component.placeHolderText ?? "",
						component.options,
					);
				}
				break;
			case "toggle": {
				form.toggle(component.label, component.options);
			}
		}
	}

	public async show(viewer: Player): Promise<void> {
		const formData = new ModalFormData();
		formData.title(`§0${this.title}`);
		let text = this.submitButton.text;
		if (this.submitButton.addStyling && typeof text === "string") {
			text = styleButtonText(text);
		}
		formData.submitButton(text);
		for (const component of this.components) {
			this.addComponentToFormData(component, formData);
		}
		const result = await formData.show(viewer);
		if (result.canceled || result.formValues === undefined) {
			return;
		}
		// All components are included in returned formValues array, even those like "divider". Value is just undefined for them.
		const formValues = result.formValues;
		system.run(async () => {
			this.submitButton.callback(viewer, formValues);
		});
	}
}

export const GetStartedArgs: ModalFormArgs = {
	components: [
		{
			label: "§lWhat item would you like to give?§r\n\nEnter type ID:",
			type: "textField",
		},
		{
			type: "divider",
		},
		{
			text: "§r",
			type: "label",
		},
	],
	submitButton: {
		addStyling: true,
		callback: async (viewer, formValues) => {
			const typeId = formValues[0];
			if (typeof typeId === "string" && ItemDataValidation.typeId(typeId)) {
				viewer.sendMessage("Valid");
			} else if (!typeId) {
				const GetStarted = new ModalForm(GetStartedArgs);
				GetStarted.show(viewer);
			} else {
				const newComponents: ModalFormComponent[] = JSON.parse(
					JSON.stringify(GetStartedArgs.components),
				);
				const textFieldComponent = newComponents[0];
				if (textFieldComponent === undefined || textFieldComponent.type !== "textField") {
					viewer.sendMessage("§cFailed to get text field component in next form.");
					return;
				}
				textFieldComponent.label = `§lWhat item would you like to give?§r\n\n§cInvalid type ID: "${typeId}"§r\nEnter type ID:`;
				textFieldComponent.options = {
					defaultValue: `${typeId}`,
				};
				const NewGetStarted = new ModalForm({
					components: newComponents,
					submitButton: GetStartedArgs.submitButton,
					title: GetStartedArgs.title,
				});
				system.run(async () => {
					NewGetStarted.show(viewer);
				});
			}
		},
		text: "Submit",
		type: "button",
	},
	title: "Get Started",
};
