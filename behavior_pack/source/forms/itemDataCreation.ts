import {
	ItemComponentTypes,
	type ItemDurabilityComponent,
	type ItemEnchantableComponent,
	ItemStack,
	type ItemType,
	ItemTypes,
	type Player,
	system,
	world,
} from "@minecraft/server";
import { ItemDataValidation, itemTypeToPotionDeliveryType } from "../itemData";
import { camelToTitleCase, prettyTypeId } from "../prettyTypeId";
import {
	type ActionFormButton,
	type CommandName,
	CommandNamespace,
	type CommandVector3,
	type ItemData,
	ItemDataKeys,
	type ModalFormReturnType,
	type ModalFormTextFieldComponent,
	type ModalFormToggleComponent,
} from "../types";
import { ActionForm, type ActionFormArgs } from "./actionForms";
import { ModalForm, type ModalFormArgs } from "./modalForms";

const FormTitle: string = "Get Started";

export class ItemDataCreation {
	public player: Player;
	public data: ItemData;
	public commandName: CommandName;
	public location: CommandVector3;
	public editableProperties: string[];
	private constructor(creator: Player, itemTypeId?: string) {
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
		if (itemTypeId === undefined) {
		}
	}

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

	public async promptItemType(): Promise<string | undefined> {
		const textFieldLabelPt1: string = "What item would you like to use?§r\n";
		const textFieldLabelPt2: string = "\nEnter item type ID:";
		const textField: ModalFormTextFieldComponent = {
			label: textFieldLabelPt1 + textFieldLabelPt2,
			type: "textField",
		};
		const formArgs: ModalFormArgs = {
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
			title: FormTitle,
		};
		const form = new ModalForm(formArgs);
		let result: ModalFormReturnType[] | undefined;
		let itemTypeId: ModalFormReturnType;
		while (typeof itemTypeId !== "string" || !ItemDataValidation.typeId(itemTypeId)) {
			if (itemTypeId) {
				textField.label = `${textFieldLabelPt1}\n§cInvalid item type ID "${itemTypeId}"§r${textFieldLabelPt2}`;
				textField.options = {
					defaultValue: `${itemTypeId}`,
				};
			} else {
				textField.label = textFieldLabelPt1 + textFieldLabelPt2;
			}
			result = await form.show(this.player);
			if (result === undefined) {
				return;
			}
			itemTypeId = result[0];
		}
		return Promise.resolve(itemTypeId);
	}

	public async promptCommandName(): Promise<CommandName | undefined> {
		const formArgs: ModalFormArgs = {
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
			title: FormTitle,
		};
		const form = new ModalForm(formArgs);
		const result: ModalFormReturnType[] | undefined = await form.show(this.player);
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

	// Create a class for the other form data type real quick and make a confirmation for this
	public async propertiesBackConfirmation(): Promise<boolean> {}

	public async promptItemProperties(): Promise<ItemData | undefined> {
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
		const formArgs: ActionFormArgs = {
			body: `Select component to edit for item: §e${prettyTypeId(this.data.typeId)}`,
			components: [{ type: "divider" }, ...buttons],
			title: FormTitle,
		};
		const form = new ActionForm(formArgs);
		const selection = await form.show(this.player);
		if (selection === undefined) {
			const player = this.player;
			const itemTypeId = this.data.typeId;
			system.run(async () => {
				// replace this with confirmation when thats done
				ItemDataCreation.run(this.player, this.data.typeId);
			});
			return;
		}
		// Back button
		if (selection === 0) {
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

	public async showGeneratedCommand(): Promise<void> {
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
		const formArgs: ModalFormArgs = {
			components: [textField, { type: "divider" }, sendInChatToggle],
			submitButton: {
				addStyling: true,
				text: "Done",
			},
			title: FormTitle,
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
				formArgs.components.pop();
			}
		}
		const form = new ModalForm(formArgs);
		const result: ModalFormReturnType[] | undefined = await form.show(this.player);
		if (result === undefined) {
			return;
		}
		const sendInChatSelection: ModalFormReturnType = result[2];
		if (sendInChatSelection) {
			world.sendMessage(command);
		}
	}

	public static async run(player: Player, itemTypeId?: string): Promise<void> {
		const creator = new ItemDataCreation(player);
		if (itemTypeId === undefined || !ItemDataValidation.typeId(itemTypeId)) {
			itemTypeId = await creator.promptItemType();
			if (itemTypeId === undefined) {
				return;
			}
		}
		const itemType: ItemType | undefined = ItemTypes.get(itemTypeId);
		if (itemType === undefined) {
			return;
		}
		creator.data.typeId = itemType.id;
		const commandNameResult: CommandName | undefined = await creator.promptCommandName();
		if (commandNameResult === undefined) {
			return;
		}
		creator.commandName = commandNameResult;
		const itemPropertiesResult = await creator.promptItemProperties();
		if (itemPropertiesResult === undefined) {
			return;
		}
		system.run(async () => {
			creator.showGeneratedCommand();
		});
	}
}

/*
export const FormSelectSlotGivex: ModalFormArgs = {
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
	title: FormTitle,
};
*/
