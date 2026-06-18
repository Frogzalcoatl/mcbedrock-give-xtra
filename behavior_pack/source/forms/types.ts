import { type Player, system } from "@minecraft/server";
import {
	ActionFormData,
	MessageFormData,
	ModalFormData,
	type ModalFormDataDropdownOptions,
	type ModalFormDataSliderOptions,
	type ModalFormDataTextFieldOptions,
	type ModalFormDataToggleOptions,
} from "@minecraft/server-ui";

export interface FormTextComponent {
	type: "header" | "label";
	text: string;
}

export interface FormDividerComponent {
	type: "divider";
}

export interface FormButton {
	addStyling: boolean;
	text: string;
	callback?: (player: Player) => Promise<void>;
}

export interface ActionFormButton extends FormButton {
	type: "button";
	iconPath?: string;
}

export type ActionFormComponent = ActionFormButton | FormTextComponent | FormDividerComponent;

export interface ModalFormDropdownComponent {
	type: "dropdown";
	label: string;
	items: string[];
	options?: ModalFormDataDropdownOptions;
}

export interface ModalFormSliderComponent {
	type: "slider";
	label: string;
	minimumValue: number;
	maximumValue: number;
	options?: ModalFormDataSliderOptions;
}

export interface ModalFormTextFieldComponent {
	type: "textField";
	label: string;
	placeHolderText?: string;
	options?: ModalFormDataTextFieldOptions;
}

export interface ModalFormToggleComponent {
	type: "toggle";
	label: string;
	options?: ModalFormDataToggleOptions;
}

export type ModalFormComponent =
	| FormDividerComponent
	| FormTextComponent
	| ModalFormDropdownComponent
	| ModalFormSliderComponent
	| ModalFormTextFieldComponent
	| ModalFormToggleComponent;

export type ModalFormReturnType = string | number | boolean | undefined;

export interface ActionForm {
	body?: string;
	components: ActionFormComponent[];
	title: string;
}

export interface ModalForm {
	components: ModalFormComponent[];
	submitButton: FormButton;
	title: string;
}

export function styleButtonText(text: string): string {
	return `--[${text}]--`;
}

function actionDataAddComponent(component: ActionFormComponent, formData: ActionFormData): void {
	switch (component.type) {
		case "button":
			{
				let text = component.text;
				if (component.addStyling) {
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

export async function showActionForm(
	form: ActionForm,
	viewer: Player,
): Promise<number | undefined> {
	if (!viewer.isValid) {
		return Promise.resolve(undefined);
	}
	const formData = new ActionFormData();
	formData.title(`§0${form.title}`);
	if (form.body) {
		formData.body(form.body);
	}
	const buttons: ActionFormButton[] = [];
	for (const component of form.components) {
		if (component.type === "button") {
			buttons.push(component);
		}
		actionDataAddComponent(component, formData);
	}
	const result = await formData.show(viewer);
	if (result.canceled || result.selection === undefined) {
		return;
	}
	const selectedButton = buttons[result.selection];
	if (selectedButton?.callback !== undefined) {
		const callback = selectedButton.callback;
		system.run(() => {
			callback(viewer);
		});
	}
	return Promise.resolve(result.selection);
}

function modalDataAddComponent(component: ModalFormComponent, formData: ModalFormData): void {
	switch (component.type) {
		case "divider":
			{
				formData.divider();
			}
			break;
		case "dropdown":
			{
				formData.dropdown(component.label, component.items, component.options);
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
		case "slider":
			{
				formData.slider(
					component.label,
					component.minimumValue,
					component.maximumValue,
					component.options,
				);
			}
			break;
		case "textField":
			{
				formData.textField(
					component.label,
					component.placeHolderText ?? "",
					component.options,
				);
			}
			break;
		case "toggle": {
			formData.toggle(component.label, component.options);
		}
	}
}

export async function showModalForm(
	form: ModalForm,
	viewer: Player,
): Promise<ModalFormReturnType[] | undefined> {
	if (!viewer.isValid) {
		return Promise.resolve(undefined);
	}
	const formData = new ModalFormData();
	formData.title(`§0${form.title}`);
	let text = form.submitButton.text;
	if (form.submitButton.addStyling) {
		text = styleButtonText(text);
	}
	formData.submitButton(text);
	for (const component of form.components) {
		modalDataAddComponent(component, formData);
	}
	const result = await formData.show(viewer);
	if (form.submitButton.callback) {
		const callback = form.submitButton.callback;
		system.run(() => {
			callback(viewer);
		});
	}
	return Promise.resolve(result.formValues);
}

export interface MessageForm {
	body: string;
	button1: FormButton;
	button2: FormButton;
	title: string;
}

export async function showMessageForm(
	form: MessageForm,
	viewer: Player,
): Promise<number | undefined> {
	if (!viewer.isValid) {
		return Promise.resolve(undefined);
	}
	const formData = new MessageFormData();
	formData.title(`§0${form.title}`);
	let text1 = form.button1.text;
	if (form.button1.addStyling) {
		text1 = styleButtonText(text1);
	}
	let text2 = form.button2.text;
	if (form.button2.addStyling) {
		text2 = styleButtonText(text2);
	}
	formData.button1(text1);
	formData.button2(text2);
	formData.body(form.body);
	const result = await formData.show(viewer);
	if (result.selection === 0) {
		if (form.button1.callback) {
			const callback = form.button1.callback;
			system.run(() => {
				callback(viewer);
			});
		}
	} else if (result.selection === 1) {
		if (form.button2.callback) {
			const callback = form.button2.callback;
			system.run(() => {
				callback(viewer);
			});
		}
	}
	return Promise.resolve(result.selection);
}
