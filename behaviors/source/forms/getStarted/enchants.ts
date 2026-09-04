import {
	type Enchantment,
	type EnchantmentType,
	EnchantmentTypes,
	ItemComponentTypes,
	type ItemEnchantableComponent,
	ItemStack,
	system,
} from "@minecraft/server";
import { ModalFormData, type ModalFormResponse } from "@minecraft/server-ui";
import { applyEnchants } from "../../items/enchants";
import { type GetStartedContext, getStartedTitle } from "./getStarted";
import { getStartedProperties } from "./properties";

function getAllowedEnchantTypes(item: ItemStack): EnchantmentType[] | null {
	const enchantable: ItemEnchantableComponent | undefined = item.getComponent(
		ItemComponentTypes.Enchantable,
	);
	if (enchantable === undefined) {
		return null;
	}
	const allowed: EnchantmentType[] = [];
	for (const type of EnchantmentTypes.getAll()) {
		if (enchantable.canAddEnchantment({ level: 1, type: type })) {
			allowed.push(type);
		}
	}
	if (allowed.length === 0) {
		return null;
	}
	return allowed;
}

function getFormTypes(
	allowedTypes: EnchantmentType[],
	selectedTypes: EnchantmentType[],
	error?: string,
): ModalFormData {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	let label: string = "§rSelect enchant types for your item.";
	if (error) {
		label = `${error}\n\n${label}`;
	}
	form.label(label);
	for (const type of allowedTypes) {
		const enabled: boolean = selectedTypes.findIndex((t) => t.id === type.id) !== -1;
		form.toggle(type.id, { defaultValue: enabled });
	}
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	return form;
}

function getFormLevels(
	context: GetStartedContext,
	selectedTypes: EnchantmentType[],
): ModalFormData {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	form.label("Select enchant levels for your item.");
	for (const type of selectedTypes) {
		const existingLevel: number =
			context.enchants.find((e) => e.type.id === type.id)?.level ?? 1;
		form.slider(type.id, 1, type.maxLevel, { defaultValue: existingLevel });
	}
	form.divider();
	form.label("§r");
	form.submitButton("Submit");
	return form;
}

export async function getStartedEnchants(
	context: GetStartedContext,
	selectedTypes?: EnchantmentType[],
	error?: string,
): Promise<void> {
	const testItem = new ItemStack(context.json.typeId);
	const allowed: EnchantmentType[] | null = getAllowedEnchantTypes(testItem);
	if (allowed === null) {
		system.run(() => getStartedProperties(context, `§cNo valid enchants to apply to item.`));
		return;
	}
	const selected: EnchantmentType[] = selectedTypes ?? context.enchants.map((e) => e.type);
	let form: ModalFormData = getFormTypes(allowed, selected, error);
	let resp: ModalFormResponse = await form.show(context.player);
	if (resp.formValues === undefined) {
		system.run(() => getStartedProperties(context, `§cEnchants unchanged`));
		return;
	}
	selected.length = 0;
	// Start at i = 1 to account for label at form index 0
	for (let i: number = 1; i < resp.formValues.length; i++) {
		if (resp.formValues[i] !== true) {
			continue;
		}
		const current: EnchantmentType | undefined = allowed[i - 1];
		if (current !== undefined) {
			selected.push(current);
		}
	}
	if (selected.length === 0) {
		context.enchants.length = 0;
		system.run(() => getStartedProperties(context, `Enchants set to: §eNone`));
		return;
	}
	const selectedEnchants: Enchantment[] = selected.map((t) => {
		const e: Enchantment = { level: 1, type: t };
		return e;
	});
	const invalidIndex: number | null = applyEnchants(selectedEnchants, testItem);
	if (invalidIndex !== null) {
		system.run(() =>
			getStartedEnchants(
				context,
				selected,
				`§cUnable to apply ${selectedEnchants[invalidIndex]?.type.id}`,
			),
		);
		return;
	}
	form = getFormLevels(context, selected);
	resp = await form.show(context.player);
	if (resp.formValues === undefined) {
		system.run(() => getStartedEnchants(context, selected));
		return;
	}
	context.enchants.length = 0;
	for (let i: number = 1; i < resp.formValues.length; i++) {
		const currentVal: string | number | boolean | undefined = resp.formValues[i];
		if (typeof currentVal !== "number") {
			continue;
		}
		const currentType: EnchantmentType | undefined = selected[i - 1];
		if (currentType === undefined) {
			continue;
		}
		context.enchants.push({ level: currentVal, type: currentType });
	}
	system.run(() => getStartedProperties(context, "Updated enchants"));
}
