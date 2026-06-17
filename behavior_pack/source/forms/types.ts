import { RawMessage, Player, system } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData, ModalFormDataDropdownOptions, ModalFormDataSliderOptions, ModalFormDataTextFieldOptions, ModalFormDataToggleOptions } from "@minecraft/server-ui";

export interface FormTextComponent {
	type: "header" | "label";
	text: RawMessage | string;
}

export interface FormDividerComponent {
	type: "divider";
}

export interface FormButton {
	addStyling: boolean;
	text: RawMessage | string;
	callback?: (player: Player) => Promise<void>;
}

export interface ActionFormButton extends FormButton {
	type: "button";
	iconPath?: string;
}

export type ActionFormComponent = ActionFormButton | FormTextComponent | FormDividerComponent;

export interface ModalFormDropdownComponent {
	type: "dropdown";
	label: RawMessage | string;
	items: (RawMessage | string)[];
	options?: ModalFormDataDropdownOptions;
}

export interface ModalFormSliderComponent {
	type: "slider";
	label: RawMessage | string;
	minimumValue: number;
	maximumValue: number;
	options?: ModalFormDataSliderOptions;
}

export interface ModalFormTextFieldComponent {
	type: "textField";
	label: RawMessage | string;
	placeHolderText?: RawMessage | string;
	options?: ModalFormDataTextFieldOptions;
}

export interface ModalFormToggleComponent {
	type: "toggle";
	label: RawMessage | string;
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
	body?: RawMessage | string;
	components: ActionFormComponent[];
	title: RawMessage | string;
}

export interface ModalForm {
	components: ModalFormComponent[];
	submitButton: FormButton;
	title: RawMessage | string;
}

export function styleButtonText(text: string): string {
	return `--[${text}]--`;
}

function actionDataAddComponent(component: ActionFormComponent, formData: ActionFormData): void {
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

export async function showActionForm(form: ActionForm, viewer: Player): Promise<number | undefined> {
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

export async function showModalForm(form: ModalForm, viewer: Player): Promise<ModalFormReturnType[] | undefined> {
	const formData = new ModalFormData();
	formData.title(`§0${form.title}`);
	let text = form.submitButton.text;
	if (form.submitButton.addStyling && typeof text === "string") {
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
	body: RawMessage | string;
	button1: FormButton;
	button2: FormButton;
	title: RawMessage | string;
}

export async function showMessageForm(form: MessageForm, viewer: Player): Promise<number | undefined> {
	const formData = new MessageFormData();
	formData.title(`§0${form.title}`);
	let text1 = form.button1.text;
	if (form.button1.addStyling && typeof text1 === "string") {
		text1 = styleButtonText(text1);
	}
	let text2 = form.button1.text;
	if (form.button2.addStyling && typeof text2 === "string") {
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
			})
		}
	}
	return Promise.resolve(result.selection);
}
