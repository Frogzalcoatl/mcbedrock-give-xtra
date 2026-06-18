import {
	ItemComponentTypes,
	type ItemDurabilityComponent,
	type ItemEnchantableComponent,
	ItemStack,
	ItemTypes,
	type Player,
	system,
	world,
} from "@minecraft/server";
import { ItemDataValidation, itemTypeToPotionDeliveryType } from "../itemData";
import { camelToTitleCase, prettyTypeId, vector3ToString } from "../prettyTypeId";
import { CommandNamespace, type CommandType, type ItemData, ItemDataKeys } from "../types";
import { FormHelp } from "./help";
import {
	type ActionForm,
	type ActionFormButton,
	type CommandVector3,
	type MessageForm,
	type ModalForm,
	type ModalFormReturnType,
	type ModalFormTextFieldComponent,
	type ModalFormToggleComponent,
	showActionForm,
	showMessageForm,
	showModalForm,
} from "./types";

enum PromptResult {
	Completed,
	InProgress,
	Closed,
}

export class ItemDataCreator {
	private player: Player;
	private data: ItemData;
	private commandType: CommandType;
	private location: CommandVector3;
	private editableProperties: { text: string; iconPath: string }[];
	private fromFormHelp: boolean;
	constructor(creator: Player, fromFormHelp: boolean, itemTypeId?: string) {
		this.player = creator;
		// Just default values, can be changed by user later
		this.data = {
			amount: 1,
			typeId: itemTypeId ?? "",
		};
		this.commandType = "givex";
		this.location = {
			x: "~",
			y: "~",
			z: "~",
		};
		this.editableProperties = [];
		this.fromFormHelp = fromFormHelp;
	}

	private static readonly FORM_TITLE: string = "Get Started";

	private async promptTypeId(): Promise<PromptResult> {
		const textFieldLabelPt1: string = "What item would you like to use?§r\n";
		const textFieldLabelPt2: string = "\nEnter item type ID:";
		const textField: ModalFormTextFieldComponent = {
			label: textFieldLabelPt1 + textFieldLabelPt2,
			options: {
				defaultValue: this.data.typeId,
			},
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
			title: ItemDataCreator.FORM_TITLE,
		};
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
			result = await showModalForm(form, this.player);
			if (result === undefined) {
				return Promise.resolve(PromptResult.Closed);
			}
			itemTypeId = result[0];
		}
		// Ensure values like "grass" are converted to "minecraft:grass_block"
		const itemType = ItemTypes.get(itemTypeId);
		if (itemType !== undefined) {
			this.data.typeId = itemType.id;
			return Promise.resolve(PromptResult.Completed);
		} else {
			return Promise.resolve(PromptResult.Completed);
		}
	}

	private static readonly commandTypeForm: ModalForm = {
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
		title: ItemDataCreator.FORM_TITLE,
	};

	private async promptCommandType(): Promise<PromptResult> {
		const result: ModalFormReturnType[] | undefined = await showModalForm(
			ItemDataCreator.commandTypeForm,
			this.player,
		);
		if (result === undefined) {
			return Promise.resolve(PromptResult.Closed);
		}
		// Index of dropdown is 1 because of label in index 0
		const selection: ModalFormReturnType = result[1];
		if (typeof selection !== "number") {
			return Promise.resolve(PromptResult.Closed);
		}
		switch (selection) {
			case 0:
				this.commandType = "givex";
				break;
			case 1:
				this.commandType = "blockx";
				break;
			case 2:
				this.commandType = "spawnx";
				break;
			default:
				return Promise.resolve(PromptResult.Closed);
		}
		return Promise.resolve(PromptResult.Completed);
	}

	private static readonly BACK_CONFIRMATION: MessageForm = {
		body: "Are you sure you would like to go back? Any selected properties will be reset.",
		button1: {
			addStyling: false,
			text: "Im Sure!",
		},
		button2: {
			addStyling: false,
			text: "Cancel",
		},
		title: "Go Back?",
	};

	private async propertiesBackConfirmation(): Promise<boolean> {
		let result = await showMessageForm(ItemDataCreator.BACK_CONFIRMATION, this.player);
		// Treat closing this form as "Im Sure!"
		if (result === undefined) {
			result = 0;
		}
		if (result === 1) {
			return Promise.resolve(false);
		} else {
			return Promise.resolve(true);
		}
	}

	private getEditableProperties(): { text: string; iconPath: string }[] {
		// I want these two to always be at the top
		const startingEditableComponents: { text: string; iconPath: string }[] = [
			{
				iconPath: "textures/items/hopper.png",
				text: ItemDataKeys.Amount,
			},
			{
				iconPath: "textures/items/name_tag.png",
				text: ItemDataKeys.NameTag,
			},
		];
		const endingEditableComponents: { text: string; iconPath: string }[] = [
			{
				iconPath: "textures/ui/accessibility_glyph_color.png",
				text: ItemDataKeys.LockMode,
			},
			{
				iconPath: "textures/items/totem.png",
				text: ItemDataKeys.KeepOnDeath,
			},
			{
				iconPath: "textures/blocks/target_side.png",
				text: ItemDataKeys.CanPlaceOn,
			},
			{
				iconPath: "textures/items/iron_pickaxe.png",
				text: ItemDataKeys.CanDestroy,
			},
		]; // These are always editable
		const testItem = new ItemStack(this.data.typeId);
		const durability: ItemDurabilityComponent | undefined = testItem.getComponent(
			ItemComponentTypes.Durability,
		);
		if (this.commandType !== "givex") {
			startingEditableComponents.push({
				iconPath: "textures/items/map_filled.png",
				text: "location",
			});
		}
		if (this.commandType !== "spawnx") {
			startingEditableComponents.push({
				iconPath: "textures/blocks/chest_front.png",
				text: ItemDataKeys.Slot,
			});
		}
		if (durability !== undefined) {
			startingEditableComponents.push({
				iconPath: "textures/ui/anvil_icon.png",
				text: ItemDataKeys.Durability,
			});
		}
		const enchantable: ItemEnchantableComponent | undefined = testItem.getComponent(
			ItemComponentTypes.Enchantable,
		);
		if (enchantable !== undefined) {
			startingEditableComponents.push({
				iconPath: "textures/items/book_enchanted.png",
				text: ItemDataKeys.Enchants,
			});
		}
		if (itemTypeToPotionDeliveryType(this.data.typeId) !== undefined) {
			startingEditableComponents.push({
				iconPath: "textures/items/potion_bottle_fireResistance.png",
				text: ItemDataKeys.PotionType,
			});
		}
		if (this.data.typeId === "minecraft:arrow") {
			startingEditableComponents.push({
				iconPath: "textures/items/tipped_arrow_poison.png",
				text: ItemDataKeys.ArrowType,
			});
		}
		if (this.data.typeId === "minecraft:bed") {
			startingEditableComponents.push({
				iconPath: "textures/items/bed_red.png",
				text: ItemDataKeys.BedColor,
			});
		}
		return startingEditableComponents.concat(endingEditableComponents);
	}

	private formatComponent(component: string, value: string | number | boolean): string {
		return `§r\n${component}: §e${value}`;
	}

	private getComponentDisplay(): string {
		const data = this.data;
		const formatComponent = this.formatComponent;
		// ^ Just to make things a little easier to look at
		let str: string = formatComponent("Item Type", prettyTypeId(data.typeId));
		str += formatComponent("Amount", data.amount);
		str += formatComponent("Command Type", `/${this.commandType}`);
		if (data.nameTag) {
			str += formatComponent("Name Tag", data.nameTag);
		}
		if (this.commandType !== "givex") {
			str += formatComponent("Location", vector3ToString(this.location, 0));
		}
		if (this.commandType !== "spawnx") {
			if (data.slot === undefined) {
				formatComponent("Slot", "Default");
			} else {
				formatComponent("Slot", data.slot.name);
				if (data.slot.id !== undefined) {
					formatComponent("Slot Id", data.slot.id);
				}
				formatComponent("Keep Old Item in Slot", data.slot.keepOldItem);
			}
		}
		if (data.durability !== undefined) {
			formatComponent("Durability", data.durability);
		}
		if (data.enchants !== undefined) {
			let enchants: string = "";
			for (const e of data.enchants) {
				enchants += `\n-${prettyTypeId(e.id)} ${e.level}`;
			}
			str += formatComponent("Enchants", enchants);
		}
		if (data.potionType !== undefined) {
			str += formatComponent("Potion Type", prettyTypeId(data.potionType));
		}
		if (data.arrowType !== undefined) {
			str += formatComponent("Arrow Type", prettyTypeId(data.arrowType));
		}
		if (data.bedColor !== undefined) {
			str += formatComponent("Bed Color", prettyTypeId(data.bedColor));
		}
		if (data.lockMode !== undefined) {
			str += formatComponent("Item Lock Mode", prettyTypeId(data.lockMode));
		}
		if (data.keepOnDeath !== undefined) {
			str += formatComponent("Keep On Death", data.keepOnDeath);
		}
		if (data.canPlaceOn !== undefined) {
			let canPlaceOn: string = "";
			for (const value of data.canPlaceOn) {
				canPlaceOn += `\n${prettyTypeId(value)}`;
			}
			formatComponent("Can Place On", canPlaceOn);
		}
		if (data.canDestroy !== undefined) {
			let canDestroy: string = "";
			for (const value of data.canDestroy) {
				canDestroy += `\n${prettyTypeId(value)}`;
			}
			formatComponent("Can Destroy", canDestroy);
		}
		return str;
	}

	private async promptItemProperties(): Promise<PromptResult> {
		this.editableProperties = this.getEditableProperties();
		const ItemPropertyButtons: ActionFormButton[] = [];
		for (const prop of this.editableProperties) {
			ItemPropertyButtons.push({
				addStyling: true,
				iconPath: prop.iconPath,
				text: camelToTitleCase(prop.text),
				type: "button",
			});
		}
		ItemPropertyButtons.push();
		const form: ActionForm = {
			body: `Select component to edit for item!`,
			components: [
				{ type: "divider" },
				{ addStyling: true, text: "Back", type: "button" },
				...ItemPropertyButtons,
				{
					addStyling: true,
					text: "Submit",
					type: "button",
				},
				{ text: `Selected Components:\n${this.getComponentDisplay()}`, type: "label" },
			],
			title: ItemDataCreator.FORM_TITLE,
		};
		const BackButtonIndex: number = 0;
		const SubmitButtonIndex: number = ItemPropertyButtons.length + 1;
		const ItemPropertyButtonsOffset: number = -1;
		let selection = await showActionForm(form, this.player);
		// Treat exiting the form and the back button the same.
		if (selection === undefined || selection === BackButtonIndex) {
			const BackConfirmationResult: boolean | undefined =
				await this.propertiesBackConfirmation();
			if (BackConfirmationResult) {
				system.run(async () => {
					const creator = new ItemDataCreator(
						this.player,
						this.fromFormHelp,
						this.data.typeId,
					);
					creator.run();
				});
				return Promise.resolve(PromptResult.Closed);
			} else {
				return Promise.resolve(PromptResult.InProgress);
			}
		} else if (selection === SubmitButtonIndex) {
			return Promise.resolve(PromptResult.Completed);
		} else {
			selection += ItemPropertyButtonsOffset;
			const selectedButton: ActionFormButton | undefined = ItemPropertyButtons[selection];
			if (selectedButton === undefined) {
				return Promise.resolve(PromptResult.InProgress);
			}
			// const propertyResult: PromptResult = await this.promptProperty();
			return Promise.resolve(PromptResult.InProgress);
		}
	}

	private getCommand(): string {
		let command = `/${CommandNamespace}:${this.commandType}`;
		if (this.commandType === "givex") {
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
			label: `\nCopy generated command below:`,
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
			title: ItemDataCreator.FORM_TITLE,
		};
		// text field default value characters start to distort at a certain length
		if (textField.options !== undefined) {
			if (command.length > 600) {
				textField.options.tooltip =
					"Characters may appear distorted but are still copyable via Ctrl+A Ctrl+C.";
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
		const typeIdResult: PromptResult = await this.promptTypeId();
		if (typeIdResult !== PromptResult.Completed) {
			if (this.fromFormHelp) {
				system.run(async () => {
					showActionForm(FormHelp, this.player);
				});
			}
			return;
		}
		if (this.data.typeId === "minecraft:bed") {
			this.data.bedColor = "white";
		}
		const commandTypeResult: PromptResult = await this.promptCommandType();
		if (commandTypeResult !== PromptResult.Completed) {
			// Go back to typeId selection form if command type form is closed.
			system.run(async () => {
				this.run();
			});
			return;
		}
		let propertiesResult = PromptResult.InProgress;
		while (propertiesResult === PromptResult.InProgress) {
			propertiesResult = await this.promptItemProperties();
		}
		if (propertiesResult === PromptResult.Completed) {
			system.run(async () => {
				this.showGeneratedCommand();
			});
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
