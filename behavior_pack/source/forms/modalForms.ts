import { type Player, type RawMessage, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import type { FormButton, ModalFormComponent, ModalFormReturnType } from "../types";
import { styleButtonText } from "./actionForms";

export interface ModalFormArgs {
	readonly components: ModalFormComponent[];
	readonly submitButton: FormButton;
	readonly title: RawMessage | string;
}

export class ModalForm {
	public components: ModalFormComponent[];
	public submitButton: FormButton;
	public title: RawMessage | string;
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

	public async show(viewer: Player): Promise<ModalFormReturnType[] | undefined> {
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
		if (this.submitButton.callback) {
			const callback = this.submitButton.callback;
			system.run(async () => {
				callback(viewer);
			});
		}
		return Promise.resolve(result.formValues);
	}
}
