import { Player, ItemStack, ItemDurabilityComponent, ItemComponentTypes, ItemEnchantableComponent, system, world, ItemTypes } from "@minecraft/server";
import { itemTypeToPotionDeliveryType, ItemDataValidation } from "../itemData";
import { camelToTitleCase, prettyTypeId } from "../prettyTypeId";
import { ItemData, CommandName, ItemDataKeys, CommandNamespace } from "../types";
import { ModalFormTextFieldComponent, ModalFormReturnType, ActionFormButton, ModalFormToggleComponent, ModalForm, showModalForm, ActionForm, showActionForm, MessageForm, showMessageForm } from "./types";

interface CommandVector3 {
	x: number | "~";
	y: number | "~";
	z: number | "~";
}

enum PropertiesPromptResult {
	Completed,
	InProgress,
	Cancelled
}

export class ItemDataCreator {
	private player: Player;
	private data: ItemData;
	private commandName: CommandName;
	private location: CommandVector3;
	private editableProperties: string[];
	constructor(creator: Player, itemTypeId?: string) {
		this.player = creator;
		// Just default values, can be changed by user later
		this.data = {
			amount: 1,
			typeId: itemTypeId ?? "",
		};
		this.commandName = "givex";
		this.location = {
			x: "~",
			y: "~",
			z: "~",
		};
		this.editableProperties = [];
	}

	private static readonly FormTitle: string = "Get Started";

	private getEditableProperties(): string[] {
		const startingEditableComponents: string[] = [ItemDataKeys.Amount, ItemDataKeys.NameTag]; // I want these two to always be at the top
		const endingEditableComponents: string[] = [
			ItemDataKeys.LockMode,
			ItemDataKeys.KeepOnDeath,
			ItemDataKeys.CanPlaceOn,
			ItemDataKeys.CanDestroy,
		]; // These are always editable
		const testItem = new ItemStack(this.data.typeId);
		const durability: ItemDurabilityComponent | undefined = testItem.getComponent(
			ItemComponentTypes.Durability,
		);
		if (this.commandName !== "spawnx") {
			startingEditableComponents.push(ItemDataKeys.Slot);
		}
		if (this.commandName === "spawnx" || this.commandName === "blockx") {
			startingEditableComponents.push("location");
		}
		if (durability !== undefined) {
			startingEditableComponents.push(ItemDataKeys.Durability);
		}
		const enchantable: ItemEnchantableComponent | undefined = testItem.getComponent(
			ItemComponentTypes.Enchantable,
		);
		if (enchantable !== undefined) {
			startingEditableComponents.push(ItemDataKeys.Enchants);
		}
		if (itemTypeToPotionDeliveryType(this.data.typeId) !== undefined) {
			startingEditableComponents.push(ItemDataKeys.PotionType);
		}
		if (this.data.typeId === "minecraft:arrow") {
			startingEditableComponents.push(ItemDataKeys.ArrowType);
		}
		if (this.data.typeId === "minecraft:bed") {
			startingEditableComponents.push(ItemDataKeys.BedColor);
		}
		return startingEditableComponents.concat(endingEditableComponents);
	}

	private async promptTypeId(): Promise<string | undefined> {
		const textFieldLabelPt1: string = "What item would you like to use?§r\n";
		const textFieldLabelPt2: string = "\nEnter item type ID:";
		const textField: ModalFormTextFieldComponent = {
			label: textFieldLabelPt1 + textFieldLabelPt2,
			type: "textField",
		};
		const form: ModalForm = {
			components: [
				textField,
				{
					type: "divider",
				},
				{
					text: "Note: You can also run the command §e/givex:help <itemType>§r for auto completion.",
					type: "label",
				},
			],
			submitButton: {
				addStyling: true,
				text: "Submit",
			},
			title: ItemDataCreator.FormTitle,
		};
		let result: ModalFormReturnType[] | undefined;
		let itemTypeId: ModalFormReturnType = this.data.typeId;
		while (typeof itemTypeId !== "string" || !ItemDataValidation.typeId(itemTypeId)) {
			if (itemTypeId) {
				textField.label = `${textFieldLabelPt1}\n§cInvalid item type ID "${itemTypeId}"§r${textFieldLabelPt2}`;
				textField.options = {
					defaultValue: `${itemTypeId}`,
				};
			} else {
				textField.label = textFieldLabelPt1 + textFieldLabelPt2;
			}
			result = await showModalForm(form, this.player);
			if (result === undefined) {
				return;
			}
			itemTypeId = result[0];
		}
		return Promise.resolve(itemTypeId);
	}

	private static readonly commandNameForm: ModalForm = {
		components: [
			{
				text: "What would you like to do with this item?",
				type: "label",
			},
			{
				items: [
					"Give to Player/Mob",
					"Give to Block (e.g: Chest)",
					"Spawn as Dropped Item",
				],
				label: "Select Option:",
				type: "dropdown",
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
			text: "Submit",
		},
		title: ItemDataCreator.FormTitle,
	};

	private async promptCommandName(): Promise<CommandName | undefined> {
		const result: ModalFormReturnType[] | undefined = await showModalForm(ItemDataCreator.commandNameForm, this.player);
		if (result === undefined) {
			return;
		}
		// Index of dropdown is 1 because of label in index 0
		const selection: ModalFormReturnType = result[1];
		if (typeof selection !== "number") {
			return;
		}
		switch (selection) {
			case 0:
				return "givex";
			case 1:
				return "blockx";
			case 2:
				return "spawnx";
			default:
				return undefined;
		}
	}

	private static readonly PropertiesBackConfirmation: MessageForm = {
		body: "Are you sure you would like to go back? Any selected properties will be reset.",
		button1: {
			addStyling: false,
			text: "Im Sure!"
		},
		button2: {
			addStyling: false,
			text: "Cancel"
		},
		title: ItemDataCreator.FormTitle
	};

	// Returns undefined if player is no longer valid
	private async propertiesBackConfirmation(): Promise<boolean | undefined> {
		let result = await showMessageForm(ItemDataCreator.PropertiesBackConfirmation, this.player);
		// Treat closing this form as Cancel
		if (result === undefined && this.player.isValid) {
			result = 1;
		}
		if (result === 0) {
			return Promise.resolve(true);
		} else if (result === 1) {
			return Promise.resolve(false);
		} else {
			return Promise.resolve(undefined);
		}
	}

	private async promptItemProperties(): Promise<PropertiesPromptResult> {
		this.editableProperties = this.getEditableProperties();
		const buttons: ActionFormButton[] = [{ addStyling: true, text: "Back", type: "button" }];
		const buttonsIndexOffset: number = -1;
		for (const prop of this.editableProperties) {
			buttons.push({
				addStyling: true,
				text: camelToTitleCase(prop),
				type: "button",
			});
		}
		const form: ActionForm = {
			body: `Select component to edit for item: §e${prettyTypeId(this.data.typeId)}`,
			components: [{ type: "divider" }, ...buttons],
			title: ItemDataCreator.FormTitle,
		};
		let selection = await showActionForm(form, this.player)
		// Treat exiting the form and the back button the same.
		if (selection === undefined || selection === 0) {
			if (!this.player.isValid) {
				return Promise.resolve(PropertiesPromptResult.Cancelled);
			}
			const confirmationResult: boolean | undefined = await this.propertiesBackConfirmation();
			if (confirmationResult === true) {
				system.run(async () => {
					const creator = new ItemDataCreator(this.player, this.data.typeId);
					creator.run();
				})
				return Promise.resolve(PropertiesPromptResult.Cancelled);
			} else if (confirmationResult === false) {
				return Promise.resolve(PropertiesPromptResult.InProgress);
			} else {
				return Promise.resolve(PropertiesPromptResult.Completed);
			}
		} else {
			selection += buttonsIndexOffset;
			// Forms based on property here.
			return Promise.resolve(PropertiesPromptResult.InProgress);
		}
	}

	private getCommand(): string {
		let command = `/${CommandNamespace}:${this.commandName}`;
		if (this.commandName === "givex") {
			command += " @p";
		} else {
			command += ` ${this.location.x} ${this.location.y} ${this.location.z}`;
		}
		command += ` ${this.data.typeId} ${this.data.amount}`;
		// Remove typeId and amount from object since they are not part of the json
		const { typeId, amount, ...clonedData } = this.data;
		if (Object.keys(clonedData).length > 0) {
			let json: string = JSON.stringify(clonedData);
			json = json.replaceAll('"', '\\"');
			command += ` "${json}"`;
		}
		return command;
	}

	private async showGeneratedCommand(): Promise<void> {
		const command: string = this.getCommand();
		const textField: ModalFormTextFieldComponent = {
			label: `\n§lCopy generated command below:`,
			options: {
				defaultValue: command,
			},
			type: "textField",
		};
		const sendInChatToggle: ModalFormToggleComponent = {
			label: "Send command in chat?",
			options: {
				defaultValue: false,
			},
			type: "toggle",
		};
		const form: ModalForm = {
			components: [textField, { type: "divider" }, sendInChatToggle],
			submitButton: {
				addStyling: true,
				text: "Done",
			},
			title: ItemDataCreator.FormTitle,
		};
		// text field default value characters start to distort at a certain length
		if (textField.options !== undefined) {
			if (command.length > 600) {
				textField.options.tooltip =
					"Characters may appear distorted but are still copyable.";
			}
			if (command.length > 4096) {
				textField.options.tooltip +=
					"\nAlso command is too long to safely send in chat. Option removed.";
				// Remove send in chat toggle component
				form.components.pop();
			}
		}
		const result: ModalFormReturnType[] | undefined = await showModalForm(form, this.player);
		if (result === undefined) {
			return;
		}
		const sendInChatSelection: ModalFormReturnType = result[2];
		if (sendInChatSelection) {
			world.sendMessage(command);
		}
	}

	public async run(): Promise<void> {
		const typeIdResult: string | undefined = await this.promptTypeId();
		if (typeIdResult === undefined) {
			return;
		}
		// Ensure values like "grass" are converted to "minecraft:grass_block"
		const itemType = ItemTypes.get(this.data.typeId);
		if (itemType === undefined) {
			return;
		}
		this.data.typeId = itemType.id;
		const commandNameResult: CommandName | undefined = await this.promptCommandName();
		if (commandNameResult === undefined) {
			return;
		}
		this.commandName = commandNameResult;
		let propertiesResult = PropertiesPromptResult.InProgress;
		while (propertiesResult === PropertiesPromptResult.InProgress) {
			propertiesResult = await this.promptItemProperties();
		}
		if (propertiesResult === PropertiesPromptResult.Completed) {
			system.run(async () => {
				this.showGeneratedCommand();
			});
		} else {
			return;
		}
	}
}

/*
export const FormSelectSlotGivex: ModalForm = {
	components: [
		{
			items: ["Default"], // Add the rest based on itemType
			label: "Default functions the same as the /give command.\nSlot Name:",
			type: "dropdown",
		},
		{
			label: "Slot Id:",
			placeHolderText: "0 or higher",
			type: "textField",
		},
		{
			label: "Keep Old Item in Slot:",
			options: {
				defaultValue: false,
				tooltip: "Gives previous item in slot back to entity",
			},
			type: "toggle",
		},
	],
	submitButton: {
		addStyling: true,
		text: "Submit",
	},
	title: ItemDataCreator.FormTitle,
};
*/
