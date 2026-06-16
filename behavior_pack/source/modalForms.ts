import { type Player, type RawMessage, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { styleButtonText } from "./actionForms";
import { ItemDataValidation } from "./itemData";
import { type ItemDataCreationContext, type ModalFormButton, type ModalFormComponent } from "./types";

export function getTemplateItemDataContext(): ItemDataCreationContext {
	return {
		data: {
			typeId: "",
			amount: 1
		},
		commandName: "givex",
		location: { x: "~", y: "~", z: "~" }
	}
}

export interface ModalFormArgs {
	readonly components: ModalFormComponent[];
	readonly submitButton: ModalFormButton;
	readonly title: RawMessage | string;
}

export class ModalForm {
	public components: ModalFormComponent[];
	public submitButton: ModalFormButton;
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
		// Will be edited in following forms.
		const context: ItemDataCreationContext = getTemplateItemDataContext();
		system.run(async () => {
			this.submitButton.callback(viewer, formValues, context);
		});
	}
}

export const FormGetStartedArgs: ModalFormArgs = {
	components: [
		{
			label: "§lWhat item would you like to use?§r\n\nEnter type ID:",
			type: "textField",
			options: {
				tooltip: "Run /givex:help <itemType> for autocompletion"
			}
		},
		{
			type: "divider",
		},
		{
			text: "Note: You can also run the command /givex:help <itemType> for autocompletion.",
			type: "label",
		},
	],
	submitButton: {
		addStyling: true,
		callback: async (viewer, formValues) => {
			const typeId = formValues[0];
			if (typeof typeId === "string" && ItemDataValidation.typeId(typeId)) {
				system.run(async () => {
					FormSelectCommandType.show(viewer);
				});
				return;
			}
			if (!typeId) {
				const GetStarted = new ModalForm(FormGetStartedArgs);
				system.run(async () => {
					GetStarted.show(viewer);
				});
				return;
			}
			const newComponents: ModalFormComponent[] = JSON.parse(
			JSON.stringify(FormGetStartedArgs.components),
			);
			const textFieldComponent = newComponents[0];
			if (textFieldComponent === undefined || textFieldComponent.type !== "textField") {
				viewer.sendMessage("§cFailed to get text field component in next form.");
				return;
			}
			textFieldComponent.label = `§lWhat item would you like to use?§r\n\n§cInvalid type ID: "${typeId}"§r\nEnter type ID:`;
			textFieldComponent.options = {
			defaultValue: `${typeId}`,
			};
			const NewGetStarted = new ModalForm({
				components: newComponents,
				submitButton: FormGetStartedArgs.submitButton,
				title: FormGetStartedArgs.title,
			});
			system.run(async () => {
				NewGetStarted.show(viewer);
			});
		},
		text: "Submit",
	},
	title: "Get Started",
};

export const FormSelectCommandType = new ModalForm({
	components: [
		{
			label: "What would you like to do with the item?",
			type: "dropdown",
			items: ["Give to Player", "Give to Block (e.g: Chest), Spawn as Item Entity"]
		}
	],
	submitButton: {
		addStyling: true,
		callback: async (viewer, formValues, context) => {
			const selection = formValues[0];
			if (selection === undefined || typeof selection !== "number") {
				viewer.sendMessage("§cUnable to open next form. Selection is undefined or incorrect type");
				return;
			}
			switch (selection) {
				case 0: context.commandName = "givex"; break;
				case 1: context.commandName = "blockx"; break;
				case 2: context.commandName = "spawnx"; break;
			}
			// Generate a list of editable components based on itemType then make an ActionForm
		},
		text: "Submit"
	},
	title: "Get Started",
});

const FormSelectSlotGivex: ModalFormArgs = {
	components: [
		{
			items: ["Default"], // Add the rest based on itemType
			label: "Default functions the same as the /give command.\nSlot Name:",
			type: "dropdown"
		},
		{
			label: "Slot Id:",
			type: "textField",
			placeHolderText: "0 or higher"
		},
		{
			label: "Keep Old Item in Slot:",
			type: "toggle",
			options: {
				tooltip: "Gives previous item in slot back to entity",
				defaultValue: false
			}
		}
	],
	submitButton: {
		addStyling: true,
		callback: async (viewer, formValues, context) => {

		},
		text: "Submit"
	},
	title: "Get Started"
}
