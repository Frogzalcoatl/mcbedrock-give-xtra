import {
	type EnchantmentType,
	EnchantmentTypes,
	ItemComponentTypes,
	type ItemDurabilityComponent,
	type ItemEnchantableComponent,
	ItemLockMode,
	ItemStack,
	type Player,
	Potions,
	system,
	world,
} from "@minecraft/server";
import {
	formatTypeId,
	getMaxItemPropertiesAmount,
	getMaxStackSize,
	ItemPropertiesValidation,
	itemTypeToPotionDeliveryType,
	SlotNamesOneStackOnly,
} from "../itemProperties";
import { applyEnchantData, getApplicableEnchantIds, getMaxDurability } from "../itemStack";
import { camelToTitleCase, prettyTypeId, stringToNumber, truncTo } from "../prettyTypeId";
import {
	ArrowTypes,
	BedColors,
	type BooleanWithMessage,
	CommandNamespace,
	type CommandType,
	type ItemDurability,
	type ItemProperties,
	ItemPropertyKeys,
	type SlotData,
	SlotDataKeepOldItemDefault,
	SlotName,
} from "../types";
import { getItemPropertyIconPath } from "./iconPaths";
import { FormInfo } from "./info";
import {
	type ActionForm,
	type ActionFormButton,
	type FormTextComponent,
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
const MaxCommandVector3Value = 2 ** 30 - 1;

export interface CommandVector3 {
	x: CommandVector3Value;
	y: CommandVector3Value;
	z: CommandVector3Value;
}

function cVector3ValueToString(value: CommandVector3Value, decimalPlaces: number): string {
	let str = `${value.includeSquiggly ? "~" : ""}`;
	if (value.num !== undefined) {
		str += `${truncTo(value.num, decimalPlaces)}`;
	}
	return str;
}

export function commandVector3ToString(vector: CommandVector3, decimalPlaces: number = 3): string {
	let str = `${cVector3ValueToString(vector.x, decimalPlaces)}`;
	str += ` ${cVector3ValueToString(vector.y, decimalPlaces)}`;
	str += ` ${cVector3ValueToString(vector.z, decimalPlaces)}`;
	return str;
}

interface CommandVector3ParseResult {
	vector: CommandVector3 | undefined;
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
		if (!value.startsWith("~")) {
			const numResult: number | undefined = stringToNumber(value);
			if (numResult === undefined) {
				return {
					message: `Invalid entry "${value}"`,
					vector: undefined,
				};
			}
			vectorValues.push({ includeSquiggly: false, num: numResult });
		}
		// Minecraft allows for no spaces between values with squigglys. e.g. "~2~10~2" is valid
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
			let nextSquigglyIndex: number | undefined = value.slice(1).indexOf("~") + 1;
			if (nextSquigglyIndex === 0) {
				nextSquigglyIndex = undefined;
			}
			const numResult: number | undefined = stringToNumber(value.slice(1, nextSquigglyIndex));
			if (numResult === undefined || numResult > MaxCommandVector3Value) {
				return {
					message: `Invalid entry "${value}"`,
					vector: undefined,
				};
			}
			vectorValues.push({ includeSquiggly: true, num: numResult });
			if (nextSquigglyIndex === undefined) {
				break;
			}
			value = value.slice(nextSquigglyIndex);
		}
	}
	if (
		vectorValues[0] === undefined ||
		vectorValues[1] === undefined ||
		vectorValues[2] === undefined ||
		vectorValues.length > 3
	) {
		return {
			message: `Must have exactly three values`,
			vector: undefined,
		};
	}
	return {
		message: "Parsed coordinates",
		vector: {
			x: vectorValues[0],
			y: vectorValues[1],
			z: vectorValues[2],
		},
	};
}

interface PromptEnchantTypesResult {
	selectedEnchants: string[];
	message: string;
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
	private editableProperties: string[];
	private openedFromInfo: boolean;
	constructor(
		creator: Player,
		openedFromInfo: boolean,
		itemTypeId?: string,
		commandType?: CommandType,
	) {
		this.player = creator;
		// Just default values, can be changed by user later
		this.properties = {
			amount: 1,
			slot: undefined,
			typeId: itemTypeId ?? "",
		};
		this.commandType = commandType ?? "givex";
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
		this.openedFromInfo = openedFromInfo;
	}

	private static readonly FORM_TITLE: string = "Get Started";

	private updateEditableProperties(): void {
		this.editableProperties = [];
		const maxAmount: number = getMaxItemPropertiesAmount(this.properties, this.commandType);
		if (maxAmount > 1) {
			this.editableProperties.push(ItemPropertyKeys.Amount);
		}
		if (this.commandType !== "givex") {
			this.editableProperties.push("location");
		}
		const testItem = new ItemStack(this.properties.typeId);
		const durability: ItemDurabilityComponent | undefined = testItem.getComponent(
			ItemComponentTypes.Durability,
		);
		if (durability !== undefined) {
			this.editableProperties.push(ItemPropertyKeys.Durability);
		}
		const enchantable: ItemEnchantableComponent | undefined = testItem.getComponent(
			ItemComponentTypes.Enchantable,
		);
		if (enchantable !== undefined) {
			this.editableProperties.push(ItemPropertyKeys.Enchants);
		}
		if (itemTypeToPotionDeliveryType(this.properties.typeId) !== undefined) {
			this.editableProperties.push(ItemPropertyKeys.PotionType);
		}
		if (this.properties.typeId === "minecraft:arrow") {
			this.editableProperties.push(ItemPropertyKeys.ArrowType);
		}
		if (this.properties.typeId === "minecraft:bed") {
			this.editableProperties.push(ItemPropertyKeys.BedColor);
		}
		if (this.commandType !== "spawnx") {
			this.editableProperties.push(ItemPropertyKeys.Slot);
		}
		// These properties are always editable
		this.editableProperties.push(ItemPropertyKeys.NameTag);
		this.editableProperties.push(ItemPropertyKeys.LockMode);
		this.editableProperties.push(ItemPropertyKeys.KeepOnDeath);
		this.editableProperties.push(ItemPropertyKeys.CanPlaceOn);
		this.editableProperties.push(ItemPropertyKeys.CanDestroy);
	}

	private propertyDisplay(property: string, value: string | number | boolean): string {
		return `§r\n${property}: §e${value}`;
	}

	private slotPropertyDisplay(): string {
		let str: string = "";
		const data = this.properties;
		if (data.slot === undefined) {
			str += this.propertyDisplay("Slot", "Default");
		} else {
			str += this.propertyDisplay("Slot", data.slot.name);
			if (data.slot.id !== undefined) {
				str += this.propertyDisplay("Slot ID", data.slot.id);
			}
			str += this.propertyDisplay("Keep Old Item in Slot", data.slot.keepOldItem);
		}
		return str;
	}

	private enchantsPropertyDisplay(): string {
		if (this.properties.enchants === undefined) {
			return "";
		}
		let enchants: string = "";
		for (const e of this.properties.enchants) {
			enchants += `\n-${prettyTypeId(e.id)} ${e.level}`;
		}
		return this.propertyDisplay("Enchants", enchants);
	}

	private strArrayPropertyDisplay(arr: string[]): string {
		let str: string = "";
		for (const value of arr) {
			str += `\n-${prettyTypeId(value)}`;
		}
		return str;
	}

	private getPropertiesDisplay(): string {
		const data = this.properties;
		let str: string = this.propertyDisplay("Item Type", prettyTypeId(data.typeId));
		str += this.propertyDisplay("Amount", data.amount);
		str += this.propertyDisplay("Command Type", `/${this.commandType}`);
		if (data.nameTag !== undefined) {
			str += this.propertyDisplay("Name Tag", `"${data.nameTag}§r§e"`);
		}
		if (this.commandType !== "givex") {
			str += this.propertyDisplay("Location", commandVector3ToString(this.location));
		}
		if (this.commandType !== "spawnx") {
			str += this.slotPropertyDisplay();
		}
		if (data.durability !== undefined) {
			str += this.propertyDisplay("Durability", data.durability);
		}
		if (data.enchants !== undefined) {
			str += this.enchantsPropertyDisplay();
		}
		if (data.potionType !== undefined) {
			str += this.propertyDisplay("Potion Type", prettyTypeId(data.potionType));
		}
		if (data.arrowType !== undefined) {
			str += this.propertyDisplay("Arrow Type", prettyTypeId(data.arrowType));
		}
		if (data.bedColor !== undefined) {
			str += this.propertyDisplay("Bed Color", prettyTypeId(data.bedColor));
		}
		if (data.lockMode !== undefined) {
			str += this.propertyDisplay("Item Lock Mode", prettyTypeId(data.lockMode));
		}
		if (data.keepOnDeath !== undefined) {
			str += this.propertyDisplay("Keep On Death", data.keepOnDeath);
		}
		if (data.canPlaceOn !== undefined) {
			this.propertyDisplay("Can Place On", this.strArrayPropertyDisplay(data.canPlaceOn));
		}
		if (data.canDestroy !== undefined) {
			this.propertyDisplay("Can Destroy", this.strArrayPropertyDisplay(data.canDestroy));
		}
		return str;
	}

	private getTemplatePromptForm(
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
		const form: ModalForm = this.getTemplatePromptForm(
			[textField],
			"Note: You can also run the command §e/givex:info <itemType>§r for auto completion.",
		);
		let input: string = "";
		let formattedTypeId: string | undefined = formatTypeId(input);
		while (formattedTypeId === undefined) {
			if (input) {
				textField.label = this.formatInputLabel(
					question,
					statement,
					`Invalid Type ID "${input}"`,
				);
				textField.options = {
					defaultValue: input,
				};
			}
			const formResult: ModalFormReturnType[] | undefined = await showModalForm(
				form,
				this.player,
			);
			if (formResult === undefined || typeof formResult[0] !== "string") {
				return Promise.resolve(PromptResult.Closed);
			}
			input = formResult[0];
			formattedTypeId = formatTypeId(input);
		}
		this.properties.typeId = formattedTypeId;
		return Promise.resolve(PromptResult.Completed);
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
		const form: ModalForm = this.getTemplatePromptForm([dropdown]);
		const result: ModalFormReturnType[] | undefined = await showModalForm(form, this.player);
		if (result === undefined || typeof result[0] !== "number") {
			return Promise.resolve(PromptResult.Closed);
		}
		const selection: number = result[0];
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
		const maxAmount: number = getMaxItemPropertiesAmount(this.properties, this.commandType);
		const question: string = `How much of your item would you like to ${this.commandType === "spawnx" ? "spawn" : "give"}?`;
		const statement: string = `Enter integer within range 1-${maxAmount}:`;
		const textField: ModalFormTextFieldComponent = {
			label: this.formatInputLabel(question, statement, ""),
			options: {
				defaultValue: `${this.properties.amount}`,
			},
			type: "textField",
		};
		const form = this.getTemplatePromptForm([textField]);
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
			const formResult: ModalFormReturnType[] | undefined = await showModalForm(
				form,
				this.player,
			);
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
		const form = this.getTemplatePromptForm([textField]);
		let input: string = "";
		let parseResult: CommandVector3ParseResult | undefined;
		while (parseResult === undefined || parseResult.vector === undefined) {
			if (input) {
				textField.label = this.formatInputLabel(
					question,
					statement,
					parseResult?.message ?? "",
				);
				if (textField.options) {
					textField.options.defaultValue = input;
				}
			}
			const formResult: ModalFormReturnType[] | undefined = await showModalForm(
				form,
				this.player,
			);
			if (formResult === undefined || typeof formResult[0] !== "string") {
				return Promise.resolve("§cLocation Unchanged");
			}
			input = formResult[0];
			parseResult = parseCommandVector3(input);
		}
		this.location = parseResult.vector;
		return Promise.resolve(`Location set to: §e${commandVector3ToString(this.location)}`);
	}

	private async promptDurability(): Promise<string> {
		const errorLabel: FormTextComponent = {
			text: "",
			type: "label",
		};
		const maxDurability: number | undefined = getMaxDurability(this.properties.typeId);
		if (maxDurability === undefined) {
			return Promise.resolve(
				`Unable to get max durability for ${prettyTypeId(this.properties.typeId)}`,
			);
		}
		if (maxDurability === 0) {
			this.properties.durability = 0;
			return Promise.resolve(
				`Max durability of ${prettyTypeId(this.properties.typeId)} is 0. No durability to change`,
			);
		}
		let currentDurabilityStr: string = `${this.properties.durability}`;
		if (currentDurabilityStr === "undefined" || currentDurabilityStr === "unbreakable") {
			currentDurabilityStr = "";
		}
		const textField: ModalFormTextFieldComponent = {
			label: `Enter durability value within range 0-${maxDurability}:`,
			options: {
				defaultValue: `${currentDurabilityStr}`,
			},
			type: "textField",
		};
		const toggleUnbreakable: ModalFormToggleComponent = {
			label: "Infinite Durability?",
			options: {
				defaultValue: this.properties.durability === "unbreakable",
				tooltip: "If true, durability value is ignored",
			},
			type: "toggle",
		};
		const textFieldIndex: number = 1;
		const toggleIndex: number = 3;
		const form = this.getTemplatePromptForm([textField, toggleUnbreakable]);
		form.components.unshift(errorLabel);
		let validationResult: BooleanWithMessage = {
			bool: false,
			message: "",
		};
		let potentialDurability: ItemDurability | undefined;
		while (!validationResult.bool) {
			potentialDurability = undefined;
			if (validationResult.message) {
				errorLabel.text = `§c${validationResult.message}`;
			}
			const formResult: ModalFormReturnType[] | undefined = await showModalForm(
				form,
				this.player,
			);
			if (formResult === undefined) {
				return Promise.resolve("§cDurability Unchanged");
			}
			const textFieldResult: ModalFormReturnType = formResult[textFieldIndex];
			if (typeof textFieldResult === "string") {
				if (textField.options) {
					textField.options.defaultValue = textFieldResult;
				}
				const num: number | undefined = stringToNumber(textFieldResult);
				if (num !== undefined) {
					potentialDurability = num;
				} else {
					validationResult.bool = false;
					validationResult.message = `Invalid durability "${textFieldResult}"`;
				}
			}
			const toggleUnbreakableResult: ModalFormReturnType = formResult[toggleIndex];
			if (typeof toggleUnbreakableResult === "boolean") {
				if (toggleUnbreakable.options) {
					toggleUnbreakable.options.defaultValue = toggleUnbreakableResult;
				}
				if (toggleUnbreakableResult) {
					potentialDurability = "unbreakable";
				}
			}
			if (potentialDurability === undefined) {
				continue;
			}
			validationResult = ItemPropertiesValidation.durability(
				potentialDurability,
				this.properties.typeId,
			);
		}
		if (potentialDurability === undefined) {
			return Promise.resolve("§cUnable to set durability");
		}
		this.properties.durability = potentialDurability;
		return Promise.resolve(`Set durability to: §e${this.properties.durability}`);
	}

	private async promptEnchantTypes(previousMessage?: string): Promise<PromptEnchantTypesResult> {
		const applicableEnchants: string[] = getApplicableEnchantIds(this.properties.typeId);
		if (applicableEnchants.length === 0) {
			return Promise.resolve({
				message: `§cNo valid enchants to apply to ${prettyTypeId(this.properties.typeId)}`,
				selectedEnchants: [],
			});
		}
		let selectedEnchantTypes: string[] = (this.properties.enchants ?? []).map((e) => e.id);
		const errorLabel: FormTextComponent = {
			text: "",
			type: "label",
		};
		const form: ModalForm = {
			components: [],
			submitButton: {
				addStyling: true,
				text: "Submit",
			},
			title: ItemPropertiesForm.FORM_TITLE,
		};
		let formResult: ModalFormReturnType[] | undefined;
		let validationResult: BooleanWithMessage = {
			bool: false,
			message: previousMessage ?? "",
		};
		let itemStack: ItemStack;
		let errorMessage: string = "Unable to create test item while validating enchants";
		try {
			itemStack = new ItemStack(this.properties.typeId);
		} catch (error) {
			if (error instanceof Error) {
				errorMessage += `: ${error.message}`;
			}
			return Promise.resolve({
				message: `§c${errorMessage}`,
				selectedEnchants: [],
			});
		}
		const enchantable: ItemEnchantableComponent | undefined = itemStack.getComponent(
			ItemComponentTypes.Enchantable,
		);
		if (enchantable === undefined) {
			return Promise.resolve({
				message: `${errorMessage}: Enchantable component is undefined`,
				selectedEnchants: [],
			});
		}
		while (!validationResult.bool) {
			errorLabel.text = `§c${validationResult.message}`;
			form.components = [errorLabel];
			for (const enchantType of applicableEnchants) {
				form.components.push({
					label: `${prettyTypeId(enchantType)}`,
					options: {
						defaultValue: selectedEnchantTypes.includes(enchantType),
					},
					type: "toggle",
				});
			}
			form.components.push({
				type: "divider",
			});
			formResult = await showModalForm(form, this.player);
			if (formResult === undefined) {
				return Promise.resolve({ message: "§cEnchants unchanged", selectedEnchants: [] });
			}
			formResult.shift(); // Remove error label from formResult at index 0
			formResult.pop(); // Remove divider from last index
			const selectedEnchantIndexes: number[] = [];
			for (let i: number = 0; i < formResult.length; i++) {
				if (formResult[i] === true) {
					selectedEnchantIndexes.push(i);
				}
			}
			selectedEnchantTypes = [];
			for (const index of selectedEnchantIndexes) {
				const enchantType: string | undefined = applicableEnchants[index];
				if (enchantType) {
					selectedEnchantTypes.push(enchantType);
				}
			}
			if (selectedEnchantTypes.length === 0) {
				this.properties.enchants = [];
				return Promise.resolve({
					message: "Set Enchants to: §enone",
					selectedEnchants: [],
				});
			}
			enchantable.removeAllEnchantments();
			for (const enchantType of selectedEnchantTypes) {
				validationResult = applyEnchantData(enchantable, { id: enchantType, level: 1 });
				if (!validationResult.bool) {
					break;
				}
			}
		}
		return Promise.resolve({
			message: "User has selected enchant types",
			selectedEnchants: selectedEnchantTypes,
		});
	}

	private async promptEnchantLevels(selectedEnchantTypes: string[]): Promise<BooleanWithMessage> {
		const errorLabel: FormTextComponent = {
			text: "",
			type: "label",
		};
		const form: ModalForm = {
			components: [],
			submitButton: {
				addStyling: true,
				text: "Submit",
			},
			title: ItemPropertiesForm.FORM_TITLE,
		};
		errorLabel.text = "";
		form.components = [errorLabel];
		for (const enchantType of selectedEnchantTypes) {
			const enchantTypeMc: EnchantmentType | undefined = EnchantmentTypes.get(enchantType);
			if (enchantTypeMc === undefined) {
				return Promise.resolve({
					bool: false,
					message: `§cUnable to get max level of enchant type ${enchantType}`,
				});
			}
			let currentLevel: number | undefined;
			if (this.properties.enchants !== undefined) {
				for (const enchant of this.properties.enchants) {
					if (enchant.id === enchantTypeMc.id) {
						currentLevel = enchant.level;
						break;
					}
				}
			}
			if (enchantTypeMc.maxLevel === 1) {
				form.components.push({
					text: `${prettyTypeId(enchantTypeMc.id)} Level: 1`,
					type: "label",
				});
			} else {
				form.components.push({
					label: `${prettyTypeId(enchantTypeMc.id)} Level`,
					maximumValue: enchantTypeMc.maxLevel,
					minimumValue: 1,
					options: {
						defaultValue: currentLevel ?? 1,
					},
					type: "slider",
				});
			}
		}
		form.components.push({
			type: "divider",
		});
		const formResult: ModalFormReturnType[] | undefined = await showModalForm(
			form,
			this.player,
		);
		if (formResult === undefined) {
			return Promise.resolve({ bool: false, message: "§cCancelled level selection" });
		}
		formResult.shift(); // Remove formResult of errorLabel
		formResult.pop(); // Remove divider from last index
		this.properties.enchants = [];
		for (let i: number = 0; i < formResult.length; i++) {
			const currentType: string | undefined = selectedEnchantTypes[i];
			const level: ModalFormReturnType = formResult[i];
			if (currentType === undefined || typeof level !== "number") {
				continue;
			}
			this.properties.enchants.push({
				id: currentType,
				level: level,
			});
		}
		return Promise.resolve({
			bool: true,
			message: `Set Enchants to:\n${this.enchantsPropertyDisplay()}`,
		});
	}

	private async promptEnchants(): Promise<string> {
		let enchantTypesResult: PromptEnchantTypesResult = {
			message: "",
			selectedEnchants: [],
		};
		let enchantLevelsResult: BooleanWithMessage = {
			bool: false,
			message: "",
		};
		while (!enchantLevelsResult.bool) {
			enchantTypesResult = await this.promptEnchantTypes(enchantLevelsResult.message);
			if (enchantTypesResult.selectedEnchants.length === 0) {
				return Promise.resolve(enchantTypesResult.message);
			}
			enchantLevelsResult = await this.promptEnchantLevels(
				enchantTypesResult.selectedEnchants,
			);
		}
		return Promise.resolve(enchantLevelsResult.message);
	}

	// Returns new value
	private async promptEnum(
		question: string,
		statement: string,
		enumArr: string[],
		currentValue: string | undefined,
	): Promise<string | undefined> {
		let currentIndex: number = 0;
		if (currentValue !== undefined) {
			currentIndex = enumArr.indexOf(currentValue);
			if (currentIndex === -1) {
				currentIndex = 0;
			}
		}
		const enumArrDisplay: string[] = enumArr.map((value) => prettyTypeId(value));
		const dropdown: ModalFormDropdownComponent = {
			items: enumArrDisplay,
			label: this.formatInputLabel(question, statement, ""),
			options: {
				defaultValueIndex: currentIndex,
			},
			type: "dropdown",
		};
		const form = this.getTemplatePromptForm([dropdown]);
		const formResult: ModalFormReturnType[] | undefined = await showModalForm(
			form,
			this.player,
		);
		if (formResult === undefined || typeof formResult[0] !== "number") {
			return Promise.resolve(undefined);
		}
		currentIndex = formResult[0];
		const selectedValue: string | undefined = enumArr[currentIndex];
		return Promise.resolve(selectedValue);
	}

	private async promptPotionType(): Promise<string> {
		const newValue: string | undefined = await this.promptEnum(
			"Would you like to select a specific potion type?",
			"Select potion type:",
			Potions.getAllEffectTypes().map((e) => e.id),
			this.properties.potionType,
		);
		if (newValue === undefined) {
			return Promise.resolve("§cPotion Type Unchanged");
		} else {
			this.properties.potionType = newValue;
			return Promise.resolve(`Potion Type set to:§e ${newValue}`);
		}
	}

	private async promptArrowType(): Promise<string> {
		const newValue: string | undefined = await this.promptEnum(
			"Would you like to select a tipped arrow?",
			"Select arrow type:",
			ArrowTypes,
			this.properties.arrowType,
		);
		if (newValue === undefined) {
			return Promise.resolve("§cArrow Type Unchanged");
		} else {
			this.properties.arrowType = newValue;
			return Promise.resolve(`Arrow Type set to:§e ${newValue}`);
		}
	}

	private async promptBedColor(): Promise<string> {
		const newValue: string | undefined = await this.promptEnum(
			"Would you like to select a bed color?",
			"Select bed color:",
			BedColors,
			this.properties.bedColor,
		);
		if (newValue === undefined) {
			return Promise.resolve("§cBed Color Unchanged");
		} else {
			this.properties.bedColor = newValue;
			return Promise.resolve(`Bed Color set to:§e ${newValue}`);
		}
	}

	private async promptSlot(): Promise<string> {
		const potentialSlotData: SlotData = {
			id: this.properties.slot?.id,
			keepOldItem: this.properties.slot?.keepOldItem ?? SlotDataKeepOldItemDefault,
			name: this.properties.slot?.name ?? "default",
		};
		if (this.commandType !== "givex") {
			potentialSlotData.name = SlotName.Inventory;
		}
		const errorLabel: FormTextComponent = {
			text: "",
			type: "label",
		};
		const slotNameItems: string[] = ["default"].concat(Object.values(SlotName));
		let selectedSlotNameIndex: number = slotNameItems.indexOf(potentialSlotData.name);
		if (selectedSlotNameIndex === -1) {
			selectedSlotNameIndex = 0;
		}
		const dropdownSlotName: ModalFormDropdownComponent = {
			items: slotNameItems,
			label: "Select Slot Name:",
			options: {
				defaultValueIndex: selectedSlotNameIndex,
				tooltip: '"default" option functions like the vanilla /give command',
			},
			type: "dropdown",
		};
		const textFieldSlotId: ModalFormTextFieldComponent = {
			label: "Enter slot ID greater than or equal to 0:",
			options: {
				defaultValue: `${potentialSlotData.id ?? ""}`,
			},
			type: "textField",
		};
		const toggleKeepOldItem: ModalFormToggleComponent = {
			label: "Keep old item?",
			options: {
				defaultValue: potentialSlotData.keepOldItem,
				tooltip: "If true, the old item in the selector's slot is given back to them.",
			},
			type: "toggle",
		};
		// Account for extra spacing components added by template prompt form and errorLabel
		let slotNameIndex: number = 1;
		let slotIdIndex: number = 3;
		let keepOldItemIndex: number = 5;
		const inputComponents: ModalFormComponent[] = [];
		if (this.commandType === "givex") {
			inputComponents.push(dropdownSlotName);
			textFieldSlotId.label += " (Optional)";
		} else {
			slotNameIndex = -1;
			slotIdIndex -= 2;
			keepOldItemIndex -= 2;
		}
		inputComponents.push(textFieldSlotId);
		inputComponents.push(toggleKeepOldItem);
		const form = this.getTemplatePromptForm(inputComponents);
		form.components.unshift(errorLabel);
		let validationResult: BooleanWithMessage = {
			bool: false,
			message: "",
		};
		const maxStackSize: number = getMaxStackSize(this.properties.typeId) ?? 1;
		let potentialAmount: number = this.properties.amount;
		while (!validationResult.bool) {
			if (validationResult.message) {
				errorLabel.text = `§c${validationResult.message}`;
			}
			const formResult: ModalFormReturnType[] | undefined = await showModalForm(
				form,
				this.player,
			);
			if (formResult === undefined) {
				return Promise.resolve("§cSlot Unchanged");
			}
			if (slotNameIndex !== -1) {
				const slotNameItemsIndex: ModalFormReturnType = formResult[slotNameIndex];
				if (typeof slotNameItemsIndex === "number") {
					if (dropdownSlotName.options) {
						dropdownSlotName.options.defaultValueIndex = slotNameItemsIndex;
					}
					const slotName: string | undefined = slotNameItems[slotNameItemsIndex];
					if (slotName) {
						potentialSlotData.name = slotName;
					}
				}
				if (potentialSlotData.name === "default") {
					this.properties.slot = undefined;
					return Promise.resolve(
						`Set SlotName to: §edefault§6\n\n"Slot ID" and "Keep old item?" are not compatible with default, so they were ignored.`,
					);
				}
			}
			const slotIdResult: ModalFormReturnType = formResult[slotIdIndex];
			if (typeof slotIdResult === "string") {
				if (textFieldSlotId.options) {
					textFieldSlotId.options.defaultValue = slotIdResult;
				}
				const slotId: number | undefined = stringToNumber(slotIdResult);
				if (slotId !== undefined) {
					potentialSlotData.id = slotId;
				}
			}
			const keepOldItemResult: ModalFormReturnType = formResult[keepOldItemIndex];
			if (typeof keepOldItemResult === "boolean") {
				if (toggleKeepOldItem.options) {
					toggleKeepOldItem.options.defaultValue = keepOldItemResult;
				}
				potentialSlotData.keepOldItem = keepOldItemResult;
			}
			if (
				SlotNamesOneStackOnly.includes(potentialSlotData.name) &&
				this.properties.amount > maxStackSize
			) {
				potentialAmount = maxStackSize;
			} else {
				potentialAmount = this.properties.amount;
			}
			validationResult = ItemPropertiesValidation.slot(
				potentialSlotData,
				this.properties.typeId,
				potentialAmount,
				this.commandType,
			);
		}
		let adjustedSlotid: boolean = false;
		if (SlotNamesOneStackOnly.includes(potentialSlotData.name) && potentialSlotData.id !== 0) {
			// ^ None of these need a slot id greater than 0 as they only have one slot
			potentialSlotData.id = 0;
			adjustedSlotid = true;
		}
		this.properties.slot = potentialSlotData;
		let message: string = `Set to:${this.slotPropertyDisplay()}`;
		if (potentialAmount !== this.properties.amount) {
			this.properties.amount = potentialAmount;
			message += `\n\n§6Additionally reduced amount to max stack size: §e${this.properties.amount}`;
		}
		if (adjustedSlotid) {
			message += `\n\n§6Additionally reduced slot id to §e0§6, as anything higher is not needed for ${this.properties.slot.name}`;
		}
		return Promise.resolve(message);
	}

	private async promptNameTag(): Promise<string> {
		const question: string = "Would you like to give your item a custom name?";
		const statement: string = "Enter Name Tag:";
		const textField: ModalFormTextFieldComponent = {
			label: this.formatInputLabel(question, statement, ""),
			options: {
				defaultValue: this.properties.nameTag ?? "",
			},
			type: "textField",
		};
		const form = this.getTemplatePromptForm([textField]);
		let input: string = "";
		let validationResult: BooleanWithMessage = {
			bool: false,
			message: "",
		};
		while (!validationResult.bool) {
			if (textField.options) {
				textField.options.defaultValue = input;
			}
			if (input) {
				textField.label = this.formatInputLabel(
					question,
					statement,
					validationResult.message,
				);
			}
			const formResult: ModalFormReturnType[] | undefined = await showModalForm(
				form,
				this.player,
			);
			if (formResult === undefined || typeof formResult[0] !== "string") {
				return Promise.resolve("§cName Tag Unchanged");
			}
			input = formResult[0];
			validationResult = ItemPropertiesValidation.nameTag(input);
		}
		this.properties.nameTag = input;
		return Promise.resolve(`Name Tag set to: §e"${this.properties.nameTag}§r§e"`);
	}

	private async promptLockMode(): Promise<string> {
		const newValue: string | undefined = await this.promptEnum(
			"Would you like to apply an inventory lock mode to your item?",
			"Select Lock Mode:",
			Object.values(ItemLockMode),
			this.properties.lockMode,
		);
		if (newValue === undefined) {
			return Promise.resolve("§cLock Mode Unchanged");
		} else {
			this.properties.lockMode = newValue;
			return Promise.resolve(`Lock Mode set to:§e ${camelToTitleCase(newValue)}`);
		}
	}

	private async promptKeepOnDeath(): Promise<string> {
		const toggle: ModalFormToggleComponent = {
			label: "Keep item on death?",
			options: {
				defaultValue: this.properties.keepOnDeath ?? false,
			},
			type: "toggle",
		};
		const form = this.getTemplatePromptForm([toggle]);
		// just for some extra spacing
		form.components.unshift({ text: "", type: "label" });
		const toggleIndex: number = 1;
		const result: ModalFormReturnType[] | undefined = await showModalForm(form, this.player);
		if (result === undefined || typeof result[toggleIndex] !== "boolean") {
			return Promise.resolve("§cKeep on Death Unchanged");
		}
		this.properties.keepOnDeath = result[toggleIndex];
		return Promise.resolve(`Keep on Death set to: §e${this.properties.keepOnDeath}`);
	}

	/*
	private async showItemTypes(
		forProperty: ItemPropertyKeys.CanDestroy | ItemPropertyKeys.CanPlaceOn,
		currentValues: string[],
	): Promise<"back" | "addNew" | "removedType"> {
		const buttonBack: ActionFormButton = {
			addStyling: true,
			text: "Back",
			type: "button",
		};
		const buttonBackIndex: number = 0;
		const buttonAddNew: ActionFormButton = {
			addStyling: true,
			text: `Add to ${camelToTitleCase(forProperty)}`,
			type: "button",
		};
		const buttonAddNewIndex: number = 1;
		const components: ActionFormButton[] = [buttonBack, buttonAddNew];
		for (const value of currentValues) {
			components.push({
				addStyling: false,
				text: `${prettyTypeId(value)}\n§cClick to Remove!§r`,
				type: "button",
			});
		}
		const form: ActionForm = {
			components: components,
			title: ItemPropertiesForm.FORM_TITLE,
		};
		const formResult: number | undefined = await showActionForm(form, this.player);
		if (formResult === undefined || formResult === buttonBackIndex) {
			return Promise.resolve("back");
		} else if (formResult === buttonAddNewIndex) {
			return Promise.resolve("addNew");
		} else {
			currentValues.splice(formResult, 1);
			return Promise.resolve("removedType");
		}
	}

	private async promptItemTypeAddition(
		forProperty: ItemPropertyKeys.CanDestroy | ItemPropertyKeys.CanPlaceOn,
		currentValues: string[],
	): Promise<boolean> {
		const label: string = `§rEnter an item to add to ${camelToTitleCase(forProperty)}`;
		const textField: ModalFormTextFieldComponent = {
			label: label,
			options: {},
			type: "textField",
		};
		const form: ModalForm = this.getTemplatePromptForm([textField]);
		let validationResult: BooleanWithMessage = {
			bool: false,
			message: "",
		};
		let input: string = "";
		while (!validationResult.bool) {
			if (textField.options) {
				textField.options.defaultValue = input;
			}
			if (validationResult.message) {
				textField.label = `§c${validationResult.message}\n\n${label}`;
			} else {
				textField.label = label;
			}
			const formResult: ModalFormReturnType[] | undefined = showModalForm(form, this.player);
			if (formResult === undefined || typeof formResult[0] !== "string") {
				return Promise.resolve(false);
			}
			input = formResult[0];
			validationResult = ItemPropertiesValidation.typeId()
		}
	}*/

	private async promptItemProperty(property: string): Promise<string> {
		let result: string = `§cUnable to open form for property "${property}"`;
		switch (property) {
			case ItemPropertyKeys.Amount:
				result = await this.promptAmount();
				break;
			case "location":
				result = await this.promptLocation();
				break;
			case ItemPropertyKeys.Durability:
				result = await this.promptDurability();
				break;
			case ItemPropertyKeys.Enchants:
				result = await this.promptEnchants();
				break;
			case ItemPropertyKeys.PotionType:
				result = await this.promptPotionType();
				break;
			case ItemPropertyKeys.ArrowType:
				result = await this.promptArrowType();
				break;
			case ItemPropertyKeys.BedColor:
				result = await this.promptBedColor();
				break;
			case ItemPropertyKeys.Slot:
				result = await this.promptSlot();
				break;
			case ItemPropertyKeys.NameTag:
				result = await this.promptNameTag();
				break;
			case ItemPropertyKeys.LockMode:
				result = await this.promptLockMode();
				break;
			case ItemPropertyKeys.KeepOnDeath:
				result = await this.promptKeepOnDeath();
				break;
			case ItemPropertyKeys.CanPlaceOn:
				result = "§cUnfinished";
				break;
			case ItemPropertyKeys.CanDestroy:
				result = "§cUnfinished";
				break;
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
				iconPath: getItemPropertyIconPath(property, this.properties),
				text: camelToTitleCase(property),
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
				{ text: `Selected Properties:\n${this.getPropertiesDisplay()}`, type: "label" },
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
						this.openedFromInfo,
						this.properties.typeId,
						this.commandType,
					);
					newInstance.run(true);
				});
				return Promise.resolve({ message: "", promptResult: PromptResult.Closed });
			} else {
				return Promise.resolve({
					message: "",
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
			const selectedProperty: string | undefined = this.editableProperties[selection];
			let message: string = "";
			if (typeof selectedProperty === "string") {
				message = await this.promptItemProperty(selectedProperty);
			} else {
				message = `Unable to open property form at selection index ${selection}`;
			}
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
		const shareInChatToggle: ModalFormToggleComponent = {
			label: "Share command in chat?",
			options: {
				defaultValue: false,
			},
			type: "toggle",
		};
		const form: ModalForm = {
			components: [textField, { type: "divider" }, shareInChatToggle],
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
					"\nAlso command is too long to safely share in chat. Option removed.";
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
			world.sendMessage(`§b${command}`);
		}
	}

	public async run(skipItemTypePrompt: boolean = false): Promise<void> {
		if (!skipItemTypePrompt) {
			const typeIdResult: PromptResult = await this.promptTypeId();
			if (typeIdResult !== PromptResult.Completed) {
				if (this.openedFromInfo) {
					system.run(async () => {
						showActionForm(FormInfo, this.player);
					});
				}
				return;
			}
		}
		const commandTypeResult: PromptResult = await this.promptCommandType();
		if (commandTypeResult !== PromptResult.Completed) {
			// Go back to typeId selection form if command type form is closed.
			system.run(async () => {
				this.run();
			});
			return;
		}
		if (this.properties.typeId === "minecraft:bed") {
			this.properties.bedColor = "white";
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
