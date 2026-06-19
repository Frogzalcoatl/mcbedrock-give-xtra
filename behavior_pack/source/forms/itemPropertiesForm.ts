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
import {
	getMaxItemPropertiesAmount,
	getMaxStackSize,
	ItemPropertiesValidation,
	itemTypeToPotionDeliveryType,
} from "../itemProperties";
import { camelToTitleCase, prettyTypeId, stringToNumber, truncTo } from "../prettyTypeId";
import {
	CommandNamespace,
	type CommandType,
	type ItemProperties,
	ItemPropertyKeys,
	SlotDataKeepOldItemDefault,
	SlotName,
} from "../types";
import { FormHelp } from "./help";
import {
	type ActionForm,
	type ActionFormButton,
	type MessageForm,
	type ModalForm,
	type ModalFormComponent,
	type ModalFormDropdownComponent,
	type ModalFormReturnType,
	type ModalFormTextFieldComponent,
	type ModalFormToggleComponent,
	showActionForm,
	showMessageForm,
	showModalForm,
} from "./types";

interface CommandVector3Value {
	num?: number;
	includeSquiggly: boolean;
}

export interface CommandVector3 {
	x: CommandVector3Value;
	y: CommandVector3Value;
	z: CommandVector3Value;
}

function cVector3ValueToString(value: CommandVector3Value, decimalPlaces: number): string {
	let str = `${value.includeSquiggly ? "~" : ""}`;
	if (value.num) {
		str += `${truncTo(value.num, decimalPlaces)}`;
	}
	return str;
}

export function commandVector3ToString(vector: CommandVector3, decimalPlaces: number = 2): string {
	let str = `${cVector3ValueToString(vector.x, decimalPlaces)}`;
	str += ` ${cVector3ValueToString(vector.y, decimalPlaces)}`;
	str += ` ${cVector3ValueToString(vector.z, decimalPlaces)}`;
	return str;
}

function getNextSquigglyIndex(str: string): number | undefined {
	let nextSquigglyIndex: number | undefined = str.slice(1).indexOf("~") + 1;
	if (nextSquigglyIndex === 0) {
		nextSquigglyIndex = undefined;
	}
	return nextSquigglyIndex;
}

interface CommandVector3ParseResult {
	result: CommandVector3 | undefined;
	message: string;
}

export function parseCommandVector3(str: string): CommandVector3ParseResult {
	const vectorValues: CommandVector3Value[] = [];
	const arr: string[] = str.split(" ");
	for (let i = 0; i < arr.length; i++) {
		let value = arr[i];
		if (!value) {
			// Skip extra spaces
			continue;
		}
		if (value.startsWith("~")) {
			while (value.startsWith("~")) {
				if (value.length === 1) {
					vectorValues.push({ includeSquiggly: true });
					break;
				}
				if (value[1] === "~") {
					vectorValues.push({ includeSquiggly: true });
					value = value.slice(1);
					continue;
				}
				const nextSquigglyIndex = getNextSquigglyIndex(value);
				const numResult: number | undefined = stringToNumber(
					value.slice(1, nextSquigglyIndex),
				);
				if (numResult === undefined) {
					return {
						message: `Invalid entry "${value}"`,
						result: undefined,
					};
				}
				vectorValues.push({ includeSquiggly: true, num: numResult });
				if (nextSquigglyIndex === undefined) {
					break;
				}
				value = value.slice(nextSquigglyIndex);
			}
			continue;
		}
		const numResult: number | undefined = stringToNumber(value);
		if (numResult === undefined) {
			return {
				message: `Invalid entry "${value}"`,
				result: undefined,
			};
		}
		vectorValues.push({ includeSquiggly: false, num: numResult });
	}
	if (
		vectorValues[0] === undefined ||
		vectorValues[1] === undefined ||
		vectorValues[2] === undefined ||
		vectorValues.length > 3
	) {
		return {
			message: `Must have exactly three values`,
			result: undefined,
		};
	}
	return {
		message: "Parsed coordinates",
		result: {
			x: vectorValues[0],
			y: vectorValues[1],
			z: vectorValues[2],
		},
	};
}

enum PromptResult {
	Completed,
	InProgress,
	Closed,
}

export class ItemPropertiesForm {
	public player: Player;
	public properties: ItemProperties;
	public commandType: CommandType;
	public location: CommandVector3;
	private editableProperties: { text: string; iconPath: string }[];
	private openedFromHelp: boolean;
	constructor(creator: Player, openedFromHelp: boolean, itemTypeId?: string) {
		this.player = creator;
		// Just default values, can be changed by user later
		this.properties = {
			amount: 1,
			typeId: itemTypeId ?? "",
		};
		this.commandType = "givex";
		this.location = {
			x: {
				includeSquiggly: true,
			},
			y: {
				includeSquiggly: true,
			},
			z: {
				includeSquiggly: true,
			},
		};
		this.editableProperties = [];
		this.openedFromHelp = openedFromHelp;
	}

	private static readonly FORM_TITLE: string = "Get Started";

	private updateEditableProperties(): void {
		const editableProperties: { text: string; iconPath: string }[] = [];
		const maxAmount: number = getMaxItemPropertiesAmount(this.properties);
		if (maxAmount > 1) {
			editableProperties.push({
				iconPath: "textures/items/hopper.png",
				text: ItemPropertyKeys.Amount,
			});
		}
		if (this.commandType !== "givex") {
			editableProperties.push({
				iconPath: "textures/items/map_filled.png",
				text: "location",
			});
		}
		if (this.commandType !== "spawnx") {
			editableProperties.push({
				iconPath: "textures/blocks/chest_front.png",
				text: ItemPropertyKeys.Slot,
			});
		}
		const testItem = new ItemStack(this.properties.typeId);
		const durability: ItemDurabilityComponent | undefined = testItem.getComponent(
			ItemComponentTypes.Durability,
		);
		if (durability !== undefined) {
			editableProperties.push({
				iconPath: "textures/ui/anvil_icon.png",
				text: ItemPropertyKeys.Durability,
			});
		}
		const enchantable: ItemEnchantableComponent | undefined = testItem.getComponent(
			ItemComponentTypes.Enchantable,
		);
		if (enchantable !== undefined) {
			editableProperties.push({
				iconPath: "textures/items/book_enchanted.png",
				text: ItemPropertyKeys.Enchants,
			});
		}
		if (itemTypeToPotionDeliveryType(this.properties.typeId) !== undefined) {
			editableProperties.push({
				iconPath: "textures/items/potion_bottle_fireResistance.png",
				text: ItemPropertyKeys.PotionType,
			});
		}
		if (this.properties.typeId === "minecraft:arrow") {
			editableProperties.push({
				iconPath: "textures/items/tipped_arrow_poison.png",
				text: ItemPropertyKeys.ArrowType,
			});
		}
		if (this.properties.typeId === "minecraft:bed") {
			editableProperties.push({
				iconPath: "textures/items/bed_red.png",
				text: ItemPropertyKeys.BedColor,
			});
		}
		// These properties are always editable
		editableProperties.push({
			iconPath: "textures/items/name_tag.png",
			text: ItemPropertyKeys.NameTag,
		});
		editableProperties.push({
			iconPath: "textures/ui/accessibility_glyph_color.png",
			text: ItemPropertyKeys.LockMode,
		});
		editableProperties.push({
			iconPath: "textures/items/totem.png",
			text: ItemPropertyKeys.KeepOnDeath,
		});
		editableProperties.push({
			iconPath: "textures/blocks/target_side.png",
			text: ItemPropertyKeys.CanPlaceOn,
		});
		editableProperties.push({
			iconPath: "textures/items/iron_pickaxe.png",
			text: ItemPropertyKeys.CanDestroy,
		});
		for (const value of editableProperties) {
			value.text = camelToTitleCase(value.text);
		}
		this.editableProperties = editableProperties;
	}

	private formatProperty(property: string, value: string | number | boolean): string {
		return `§r\n${property}: §e${value}`;
	}

	private getPropertiesDisplay(): string {
		const data = this.properties;
		const formatProperty = this.formatProperty;
		// ^ Just to make things a little easier to look at
		let str: string = formatProperty("Item Type", prettyTypeId(data.typeId));
		str += formatProperty("Amount", data.amount);
		str += formatProperty("Command Type", `/${this.commandType}`);
		if (data.nameTag) {
			str += formatProperty("Name Tag", data.nameTag);
		}
		if (this.commandType !== "givex") {
			str += formatProperty("Location", commandVector3ToString(this.location));
		}
		if (this.commandType !== "spawnx") {
			if (data.slot === undefined) {
				formatProperty("Slot", "Default");
			} else {
				formatProperty("Slot", data.slot.name);
				if (data.slot.id !== undefined) {
					formatProperty("Slot Id", data.slot.id);
				}
				formatProperty("Keep Old Item in Slot", data.slot.keepOldItem);
			}
		}
		if (data.durability !== undefined) {
			formatProperty("Durability", data.durability);
		}
		if (data.enchants !== undefined) {
			let enchants: string = "";
			for (const e of data.enchants) {
				enchants += `\n-${prettyTypeId(e.id)} ${e.level}`;
			}
			str += formatProperty("Enchants", enchants);
		}
		if (data.potionType !== undefined) {
			str += formatProperty("Potion Type", prettyTypeId(data.potionType));
		}
		if (data.arrowType !== undefined) {
			str += formatProperty("Arrow Type", prettyTypeId(data.arrowType));
		}
		if (data.bedColor !== undefined) {
			str += formatProperty("Bed Color", prettyTypeId(data.bedColor));
		}
		if (data.lockMode !== undefined) {
			str += formatProperty("Item Lock Mode", prettyTypeId(data.lockMode));
		}
		if (data.keepOnDeath !== undefined) {
			str += formatProperty("Keep On Death", data.keepOnDeath);
		}
		if (data.canPlaceOn !== undefined) {
			let canPlaceOn: string = "";
			for (const value of data.canPlaceOn) {
				canPlaceOn += `\n${prettyTypeId(value)}`;
			}
			formatProperty("Can Place On", canPlaceOn);
		}
		if (data.canDestroy !== undefined) {
			let canDestroy: string = "";
			for (const value of data.canDestroy) {
				canDestroy += `\n${prettyTypeId(value)}`;
			}
			formatProperty("Can Destroy", canDestroy);
		}
		return str;
	}

	private getTemplatePrompt(
		inputComponents: ModalFormComponent[],
		optionalNote?: string,
	): ModalForm {
		const components: ModalFormComponent[] = [];
		for (const component of inputComponents) {
			components.push(component);
			components.push({
				text: `§r`,
				type: "label",
			});
		}
		components.pop();
		components.push({
			type: "divider",
		});
		components.push({
			text: `${optionalNote ?? ""}§r`,
			type: "label",
		});
		return {
			components: components,
			submitButton: {
				addStyling: true,
				text: "Submit",
			},
			title: ItemPropertiesForm.FORM_TITLE,
		};
	}

	private formatInputLabel(question: string, statement: string, error: string): string {
		let str: string = `${question}\n\n`;
		if (error) {
			str += `§r§c${error}§r\n`;
		}
		str += statement;
		return str;
	}

	private async promptTypeId(): Promise<PromptResult> {
		const question: string = "What item would you like to use?§r";
		const statement: string = "Enter item type ID:";
		const textField: ModalFormTextFieldComponent = {
			label: this.formatInputLabel(question, statement, ""),
			options: {
				defaultValue: this.properties.typeId,
			},
			type: "textField",
		};
		const form: ModalForm = this.getTemplatePrompt(
			[textField],
			"Note: You can also run the command §e/givex:help <itemType>§r for auto completion.",
		);
		let result: ModalFormReturnType[] | undefined;
		let input: ModalFormReturnType;
		while (typeof input !== "string" || !ItemPropertiesValidation.typeId(input).bool) {
			let error: string = "";
			if (input) {
				error = `Invalid Type ID "${input}"`;
				textField.options = {
					defaultValue: `${input}`,
				};
			}
			textField.label = this.formatInputLabel(question, statement, error);
			result = await showModalForm(form, this.player);
			if (result === undefined) {
				return Promise.resolve(PromptResult.Closed);
			}
			input = result[0];
		}
		// Ensure values like "grass" are converted to "minecraft:grass_block"
		const itemType = ItemTypes.get(input);
		if (itemType !== undefined) {
			this.properties.typeId = itemType.id;
			return Promise.resolve(PromptResult.Completed);
		} else {
			return Promise.resolve(PromptResult.Completed);
		}
	}

	private async promptCommandType(): Promise<PromptResult> {
		let defaultValueIndex: number = 0;
		if (this.commandType === "givex") {
			defaultValueIndex = 0;
		} else if (this.commandType === "blockx") {
			defaultValueIndex = 1;
		} else if (this.commandType === "spawnx") {
			defaultValueIndex = 2;
		}
		const question = "What would you like to do with this item?";
		const statement = "Select Option:";
		const dropdown: ModalFormDropdownComponent = {
			items: ["Give to Player/Mob", "Give to Block (e.g: Chest)", "Spawn as Dropped Item"],
			label: this.formatInputLabel(question, statement, ""),
			options: {
				defaultValueIndex: defaultValueIndex,
			},
			type: "dropdown",
		};
		const form: ModalForm = this.getTemplatePrompt([dropdown]);
		const result: ModalFormReturnType[] | undefined = await showModalForm(form, this.player);
		if (result === undefined) {
			return Promise.resolve(PromptResult.Closed);
		}
		const selection: ModalFormReturnType = result[0];
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
		body: "Are you sure you would like to go back? Any selected item properties will be reset.",
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
		let result = await showMessageForm(ItemPropertiesForm.BACK_CONFIRMATION, this.player);
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

	private async promptAmount(): Promise<string> {
		let maxAmount: number = 0;
		if (this.commandType === "spawnx") {
			maxAmount = getMaxStackSize(this.properties.typeId) ?? 64;
		} else {
			maxAmount = getMaxItemPropertiesAmount(this.properties);
		}
		const question: string = `How much of your item would you like to ${this.commandType === "spawnx" ? "spawn" : "give"}?`;
		const statement: string = `Enter number within range 1-${maxAmount}:`;
		const textField: ModalFormTextFieldComponent = {
			label: this.formatInputLabel(question, statement, ""),
			options: {
				defaultValue: `${this.properties.amount}`,
			},
			type: "textField",
		};
		const form = this.getTemplatePrompt([textField]);
		let input: string = "";
		let amountResult: number | undefined;
		while (
			amountResult === undefined ||
			amountResult < 1 ||
			amountResult > maxAmount ||
			!Number.isInteger(amountResult)
		) {
			if (input) {
				textField.label = this.formatInputLabel(
					question,
					statement,
					`Invalid amount "${input}"`,
				);
				textField.options = {
					defaultValue: input,
				};
			}
			const formResult = await showModalForm(form, this.player);
			if (formResult === undefined || typeof formResult[0] !== "string") {
				return Promise.resolve("§cAmount unchanged");
			}
			input = formResult[0];
			amountResult = stringToNumber(input);
		}
		this.properties.amount = amountResult;
		return Promise.resolve(`Amount set to: §e${amountResult}`);
	}

	private async promptLocation(): Promise<string> {
		const question: string =
			this.commandType === "spawnx"
				? "Where would you like to spawn your item?"
				: "What block location would you like to target?";
		const statement = "Enter Coordinates:";
		const textField: ModalFormTextFieldComponent = {
			label: this.formatInputLabel(question, statement, ""),
			options: {
				defaultValue: `${commandVector3ToString(this.location)}`,
			},
			type: "textField",
		};
		const form = this.getTemplatePrompt([textField]);
		let input: string = "";
		let parseResult: CommandVector3ParseResult | undefined;
		while (parseResult === undefined || parseResult.result === undefined) {
			if (input) {
				textField.label = this.formatInputLabel(
					question,
					statement,
					parseResult?.message ?? "",
				);
				textField.options = {
					defaultValue: input,
				};
			}
			const formResult = await showModalForm(form, this.player);
			if (formResult === undefined || typeof formResult[0] !== "string") {
				return Promise.resolve("§cLocation Unchanged");
			}
			input = formResult[0];
			parseResult = parseCommandVector3(input);
		}
		this.location = parseResult.result;
		return Promise.resolve(`Location set to: §e${commandVector3ToString(this.location)}`);
	}

	private async promptSlot(): Promise<string> {
		const slotNameQuestion: string = "Which slot name would you like to use?";
		const slotNameStatement: string = "Select Slot:";
		const slotNameItems: string[] = ["default"].concat(Object.values(SlotName));
		let selectedSlotNameIndex: number = slotNameItems.indexOf(
			this.properties.slot?.name ?? "default",
		);
		if (selectedSlotNameIndex === -1) {
			selectedSlotNameIndex = 0;
		}
		const textFieldSlotName: ModalFormDropdownComponent = {
			items: slotNameItems,
			label: this.formatInputLabel(slotNameQuestion, slotNameStatement, ""),
			options: {
				defaultValueIndex: selectedSlotNameIndex,
				tooltip: "default functions like the /give command",
			},
			type: "dropdown",
		};
		const idQuestion: string = "What slot id would you like to place the item in? (Optional)";
		const idStatement: string = "Enter number greater than 0:";
		const textFieldId: ModalFormTextFieldComponent = {
			label: this.formatInputLabel(idQuestion, idStatement, ""),
			options: {
				defaultValue: `${this.properties.slot?.id ?? ""}`,
			},
			type: "textField",
		};
		const keepOldItemLabel: string = "Keep old item?";
		const toggleKeepOldItem: ModalFormToggleComponent = {
			label: keepOldItemLabel,
			options: {
				defaultValue: this.properties.slot?.keepOldItem ?? SlotDataKeepOldItemDefault,
				tooltip:
					"If true, the old item in your selected slot is given back to the reciever.",
			},
			type: "toggle",
		};
		const form = this.getTemplatePrompt([textFieldSlotName, textFieldId, toggleKeepOldItem]);
		await showModalForm(form, this.player);
		return Promise.resolve("This property is in progress");
	}

	// Returns prompt result message to be displayed
	private async promptItemProperty(property: string): Promise<string> {
		let result: string = "";
		switch (property) {
			case "Amount":
				result = await this.promptAmount();
				break;
			case "Location":
				result = await this.promptLocation();
				break;
			case "Slot":
				result = await this.promptSlot();
		}
		return Promise.resolve(result);
	}

	// Returns message to display on next promptComponent form (if applicable)
	private async promptItemProperties(
		previousMessage: string,
	): Promise<{ message: string; promptResult: PromptResult }> {
		this.updateEditableProperties();
		const itemPropertyButtons: ActionFormButton[] = [];
		for (const property of this.editableProperties) {
			itemPropertyButtons.push({
				addStyling: true,
				iconPath: property.iconPath,
				text: property.text,
				type: "button",
			});
		}
		let body: string = `Select property to edit for:\n§e${prettyTypeId(this.properties.typeId)}`;
		if (previousMessage) {
			body = `${previousMessage}§r\n\n${body}`;
		}
		const form: ActionForm = {
			body: body,
			components: [
				{ type: "divider" },
				{ addStyling: true, text: "Back", type: "button" },
				...itemPropertyButtons,
				{
					addStyling: true,
					text: "Submit",
					type: "button",
				},
				{ text: `Selected Components:\n${this.getPropertiesDisplay()}`, type: "label" },
			],
			title: ItemPropertiesForm.FORM_TITLE,
		};
		const backButtonIndex: number = 0;
		const submitButtonIndex: number = itemPropertyButtons.length + 1;
		const itemPropertyButtonsOffset: number = -1;
		let selection = await showActionForm(form, this.player);
		// Treat exiting the form and the back button the same.
		if (selection === undefined || selection === backButtonIndex) {
			const BackConfirmationResult: boolean | undefined =
				await this.propertiesBackConfirmation();
			if (BackConfirmationResult) {
				system.run(async () => {
					const newInstance = new ItemPropertiesForm(
						this.player,
						this.openedFromHelp,
						this.properties.typeId,
					);
					newInstance.commandType = this.commandType;
					newInstance.run(true);
				});
				return Promise.resolve({ message: "", promptResult: PromptResult.Closed });
			} else {
				return Promise.resolve({
					message: previousMessage,
					promptResult: PromptResult.InProgress,
				});
			}
		} else if (selection === submitButtonIndex) {
			return Promise.resolve({ message: "", promptResult: PromptResult.Completed });
		} else {
			selection += itemPropertyButtonsOffset;
			const selectedButton: ActionFormButton | undefined = itemPropertyButtons[selection];
			if (selectedButton === undefined) {
				return Promise.resolve({
					message: previousMessage,
					promptResult: PromptResult.InProgress,
				});
			}
			const message = await this.promptItemProperty(selectedButton.text);
			return Promise.resolve({ message: message, promptResult: PromptResult.InProgress });
		}
	}

	private getCommand(): string {
		let command = `/${CommandNamespace}:${this.commandType}`;
		if (this.commandType === "givex") {
			command += " @p";
		} else {
			command += ` ${commandVector3ToString(this.location)}`;
		}
		command += ` ${this.properties.typeId} ${this.properties.amount}`;
		// Remove typeId and amount from object since they are not part of the json
		const { typeId, amount, ...clonedData } = this.properties;
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
			title: ItemPropertiesForm.FORM_TITLE,
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

	public async run(skipItemTypePrompt: boolean = false): Promise<void> {
		if (!skipItemTypePrompt) {
			const typeIdResult: PromptResult = await this.promptTypeId();
			if (typeIdResult !== PromptResult.Completed) {
				if (this.openedFromHelp) {
					system.run(async () => {
						showActionForm(FormHelp, this.player);
					});
				}
				return;
			}
		}
		if (this.properties.typeId === "minecraft:bed") {
			this.properties.bedColor = "white";
		}
		const commandTypeResult: PromptResult = await this.promptCommandType();
		if (commandTypeResult !== PromptResult.Completed) {
			// Go back to typeId selection form if command type form is closed.
			system.run(async () => {
				this.run();
			});
			return;
		}
		let componentsResult = {
			message: "",
			promptResult: PromptResult.InProgress,
		};
		while (componentsResult.promptResult === PromptResult.InProgress) {
			componentsResult = await this.promptItemProperties(componentsResult.message);
		}
		if (componentsResult.promptResult === PromptResult.Completed) {
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
	title: ItemPropertiesGenerator.FormTitle,
};
*/
