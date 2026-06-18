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
	getMaxItemDataAmount,
	getMaxStackSize,
	ItemDataValidation,
	itemTypeToPotionDeliveryType,
} from "../itemData";
import { camelToTitleCase, prettyTypeId, stringToNumber, truncTo } from "../prettyTypeId";
import {
	CommandNamespace,
	type CommandType,
	type ItemData,
	ItemDataKeys,
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

export class ItemDataCreator {
	public player: Player;
	public data: ItemData;
	public commandType: CommandType;
	public location: CommandVector3;
	private editableComponents: { text: string; iconPath: string }[];
	private openedFromHelp: boolean;
	constructor(creator: Player, openedFromHelp: boolean, itemTypeId?: string) {
		this.player = creator;
		// Just default values, can be changed by user later
		this.data = {
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
		this.editableComponents = [];
		this.openedFromHelp = openedFromHelp;
	}

	private static readonly FORM_TITLE: string = "Get Started";

	private updateEditableComponents(): void {
		const editableComponents: { text: string; iconPath: string }[] = [];
		const maxAmount: number = getMaxItemDataAmount(this.data);
		if (maxAmount > 1) {
			editableComponents.push({
				iconPath: "textures/items/hopper.png",
				text: ItemDataKeys.Amount,
			});
		}
		if (this.commandType !== "givex") {
			editableComponents.push({
				iconPath: "textures/items/map_filled.png",
				text: "location",
			});
		}
		if (this.commandType !== "spawnx") {
			editableComponents.push({
				iconPath: "textures/blocks/chest_front.png",
				text: ItemDataKeys.Slot,
			});
		}
		const testItem = new ItemStack(this.data.typeId);
		const durability: ItemDurabilityComponent | undefined = testItem.getComponent(
			ItemComponentTypes.Durability,
		);
		if (durability !== undefined) {
			editableComponents.push({
				iconPath: "textures/ui/anvil_icon.png",
				text: ItemDataKeys.Durability,
			});
		}
		const enchantable: ItemEnchantableComponent | undefined = testItem.getComponent(
			ItemComponentTypes.Enchantable,
		);
		if (enchantable !== undefined) {
			editableComponents.push({
				iconPath: "textures/items/book_enchanted.png",
				text: ItemDataKeys.Enchants,
			});
		}
		if (itemTypeToPotionDeliveryType(this.data.typeId) !== undefined) {
			editableComponents.push({
				iconPath: "textures/items/potion_bottle_fireResistance.png",
				text: ItemDataKeys.PotionType,
			});
		}
		if (this.data.typeId === "minecraft:arrow") {
			editableComponents.push({
				iconPath: "textures/items/tipped_arrow_poison.png",
				text: ItemDataKeys.ArrowType,
			});
		}
		if (this.data.typeId === "minecraft:bed") {
			editableComponents.push({
				iconPath: "textures/items/bed_red.png",
				text: ItemDataKeys.BedColor,
			});
		}
		// These components are always editable
		editableComponents.push({
			iconPath: "textures/items/name_tag.png",
			text: ItemDataKeys.NameTag,
		});
		editableComponents.push({
			iconPath: "textures/ui/accessibility_glyph_color.png",
			text: ItemDataKeys.LockMode,
		});
		editableComponents.push({
			iconPath: "textures/items/totem.png",
			text: ItemDataKeys.KeepOnDeath,
		});
		editableComponents.push({
			iconPath: "textures/blocks/target_side.png",
			text: ItemDataKeys.CanPlaceOn,
		});
		editableComponents.push({
			iconPath: "textures/items/iron_pickaxe.png",
			text: ItemDataKeys.CanDestroy,
		});
		for (const value of editableComponents) {
			value.text = camelToTitleCase(value.text);
		}
		this.editableComponents = editableComponents;
	}

	private formatComponent(component: string, value: string | number | boolean): string {
		return `§r\n${component}: §e${value}`;
	}

	private getComponentsDisplay(): string {
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
			str += formatComponent("Location", commandVector3ToString(this.location));
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
			title: ItemDataCreator.FORM_TITLE,
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
				defaultValue: this.data.typeId,
			},
			type: "textField",
		};
		const form: ModalForm = this.getTemplatePrompt(
			[textField],
			"Note: You can also run the command §e/givex:help <itemType>§r for auto completion.",
		);
		let result: ModalFormReturnType[] | undefined;
		let input: ModalFormReturnType;
		while (typeof input !== "string" || !ItemDataValidation.typeId(input).bool) {
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
			this.data.typeId = itemType.id;
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
		body: "Are you sure you would like to go back? Any selected item components will be reset.",
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

	private async componentsBackConfirmation(): Promise<boolean> {
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

	private async promptAmount(): Promise<string> {
		let maxAmount: number = 0;
		if (this.commandType === "spawnx") {
			maxAmount = getMaxStackSize(this.data.typeId) ?? 64;
		} else {
			maxAmount = getMaxItemDataAmount(this.data);
		}
		const question: string = `How much of your item would you like to ${this.commandType === "spawnx" ? "spawn" : "give"}?`;
		const statement: string = `Enter number within range 1-${maxAmount}:`;
		const textField: ModalFormTextFieldComponent = {
			label: this.formatInputLabel(question, statement, ""),
			options: {
				defaultValue: `${this.data.amount}`,
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
		this.data.amount = amountResult;
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
			this.data.slot?.name ?? "default",
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
				defaultValue: `${this.data.slot?.id ?? ""}`,
			},
			type: "textField",
		};
		const keepOldItemLabel: string = "Keep old item?";
		const toggleKeepOldItem: ModalFormToggleComponent = {
			label: keepOldItemLabel,
			options: {
				defaultValue: this.data.slot?.keepOldItem ?? SlotDataKeepOldItemDefault,
				tooltip:
					"If true, the old item in your selected slot is given back to the reciever.",
			},
			type: "toggle",
		};
		const form = this.getTemplatePrompt([textFieldSlotName, textFieldId, toggleKeepOldItem]);
		await showModalForm(form, this.player);
		return Promise.resolve("This component is in progress");
	}

	// Returns prompt result message to be displayed
	private async promptItemComponent(component: string): Promise<string> {
		let result: string = "";
		switch (component) {
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
	private async promptItemComponents(
		previousMessage: string,
	): Promise<{ message: string; promptResult: PromptResult }> {
		this.updateEditableComponents();
		const itemComponentButtons: ActionFormButton[] = [];
		for (const component of this.editableComponents) {
			itemComponentButtons.push({
				addStyling: true,
				iconPath: component.iconPath,
				text: component.text,
				type: "button",
			});
		}
		let body: string = `Select component to edit for:\n§e${prettyTypeId(this.data.typeId)}`;
		if (previousMessage) {
			body = `${previousMessage}§r\n\n${body}`;
		}
		const form: ActionForm = {
			body: body,
			components: [
				{ type: "divider" },
				{ addStyling: true, text: "Back", type: "button" },
				...itemComponentButtons,
				{
					addStyling: true,
					text: "Submit",
					type: "button",
				},
				{ text: `Selected Components:\n${this.getComponentsDisplay()}`, type: "label" },
			],
			title: ItemDataCreator.FORM_TITLE,
		};
		const backButtonIndex: number = 0;
		const submitButtonIndex: number = itemComponentButtons.length + 1;
		const itemComponentButtonsOffset: number = -1;
		let selection = await showActionForm(form, this.player);
		// Treat exiting the form and the back button the same.
		if (selection === undefined || selection === backButtonIndex) {
			const BackConfirmationResult: boolean | undefined =
				await this.componentsBackConfirmation();
			if (BackConfirmationResult) {
				system.run(async () => {
					const creator = new ItemDataCreator(
						this.player,
						this.openedFromHelp,
						this.data.typeId,
					);
					creator.commandType = this.commandType;
					creator.run(true);
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
			selection += itemComponentButtonsOffset;
			const selectedButton: ActionFormButton | undefined = itemComponentButtons[selection];
			if (selectedButton === undefined) {
				return Promise.resolve({
					message: previousMessage,
					promptResult: PromptResult.InProgress,
				});
			}
			const message = await this.promptItemComponent(selectedButton.text);
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
		let componentsResult = {
			message: "",
			promptResult: PromptResult.InProgress,
		};
		while (componentsResult.promptResult === PromptResult.InProgress) {
			componentsResult = await this.promptItemComponents(componentsResult.message);
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
	title: ItemDataCreator.FormTitle,
};
*/
