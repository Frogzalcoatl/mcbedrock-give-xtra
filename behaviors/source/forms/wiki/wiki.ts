import { ItemLockMode, type Player, system } from "@minecraft/server";
import { ActionFormData, type ActionFormResponse } from "@minecraft/server-ui";
import { camelToTitleCase } from "../../commands/utils/beautification";
import { validJsonKeys } from "../../commands/utils/json";
import { SlotName } from "../../items/slot";
import { getIconPath } from "../getStarted/iconPaths";
import { formInfo } from "../info";
import { safeActionFormShow } from "../safeShow";
import { formWikiCommand, type WikiParam } from "./commands";
import { formWikiJsonParam } from "./jsonParam";

export const wikiTitle: string = "§0Wiki";

export async function formWiki(viewer: Player): Promise<void> {
	const form = new ActionFormData();
	form.title(wikiTitle);
	form.button("Back");
	form.divider();
	form.button("Commands");
	form.button("Json");
	const resp: ActionFormResponse = await safeActionFormShow(form, viewer);
	if (!viewer.isValid) {
		return;
	}
	system.run(() => {
		if (resp.selection === undefined || resp.selection === 0) {
			formInfo(viewer);
		} else if (resp.selection === 1) {
			formWikiCommandList(viewer);
		} else if (resp.selection === 2) {
			formWikiJsonList(viewer);
		}
	});
}

export async function formWikiCommandList(viewer: Player): Promise<void> {
	const form = new ActionFormData();
	form.title(wikiTitle);
	form.button("Back");
	form.divider();
	form.button("/info");
	form.button("/givex");
	form.button("/blockx");
	form.button("/spawnx");
	const resp: ActionFormResponse = await safeActionFormShow(form, viewer);
	if (!viewer.isValid) {
		return;
	}
	if (resp.selection === 0 || resp.selection === undefined) {
		system.run(() => formWiki(viewer));
		return;
	}
	const itemNameParam: WikiParam = {
		description: "Item type ID.",
		name: "itemName",
	};
	const amountParam: WikiParam = {
		description:
			"The number of item(s) to give. Must be an integer greater than 0. If a slot id is specified in the json parameter, max amount is the item's max stack size, otherwise 32767. (32767 matches the max defined in the vanilla /give command)",
		name: "amount (optional)",
	};
	const dataParam: WikiParam = {
		description:
			"The data value of the item. Must be an integer greater than or equal to 0. Useful for items such as beds, arrows, and potions (as of Minecraft v1.26.44).",
		name: "data (optional)",
	};
	const jsonParam: WikiParam = {
		description:
			'Special properties to assign to an item in stringified json format surrounded by quotes. Any quotes inside the outer quotes must be escaped using a backslash (i.e. "). This parameter can be easily generated using the /givex:info command.',
		name: "json (optional)",
	};
	system.run(() => {
		switch (resp.selection) {
			case 1:
				formWikiCommand(viewer, {
					description:
						"Select item properties to generate and copy givex commands. Additionally contains a wiki explaining every givex property.",
					name: "info",
					params: [
						{
							description:
								"Open item properties UI with an item type ID filled in. Useful for tab autocompletion.",
							name: "itemName (optional)",
						},
					],
				});
				break;
			case 2:
				formWikiCommand(viewer, {
					description: "Give items with special properties to entities.",
					name: "givex",
					params: [
						{
							description: "Entities to recieve the item.",
							name: "target",
						},
						itemNameParam,
						amountParam,
						dataParam,
						jsonParam,
					],
				});
				break;
			case 3:
				formWikiCommand(viewer, {
					description: "Give items with special properties to blocks.",
					name: "blockx",
					params: [
						{
							description:
								"Coordinates of a block with an inventory (such as a chest).",
							name: "at",
						},
						itemNameParam,
						amountParam,
						dataParam,
						jsonParam,
					],
				});
				break;
			case 4:
				formWikiCommand(viewer, {
					description: "Spawn items with special properties.",
					name: "spawnx",
					params: [
						{ description: "Coordinates at which to spawn an item.", name: "at" },
						itemNameParam,
						amountParam,
						dataParam,
						jsonParam,
					],
				});
				break;
			default:
				formWikiCommandList(viewer);
		}
	});
}

export async function formWikiJsonList(viewer: Player): Promise<void> {
	const form = new ActionFormData();
	form.title(wikiTitle);
	form.button("Back");
	for (const key of validJsonKeys) {
		form.button(camelToTitleCase(key), getIconPath(key));
	}
	const resp: ActionFormResponse = await safeActionFormShow(form, viewer);
	if (!viewer.isValid) {
		return;
	}
	if (resp.selection === 0 || resp.selection === undefined) {
		system.run(() => formWiki(viewer));
		return;
	}
	const index: number = resp.selection - 1;
	system.run(() => {
		switch (validJsonKeys[index]) {
			case "nameTag":
				formWikiJsonParam(
					viewer,
					"nameTag",
					"§eThe nameTag of the item. Cannot exceed length 255. I suggest starting nametags with \u0019r to remove default italicization applied by Minecraft.",
					"null",
					'{\\"nameTag\\":\\"Name Here\\"}',
				);
				break;
			case "lockMode":
				formWikiJsonParam(
					viewer,
					"lockMode",
					`Based on the lock modes provided by Minecraft: ${Object.values(ItemLockMode).join(", ")}\nWhen set to slot, the item is locked to the players slot and cannot be dropped. When set to inventory the item cannot be dropped, but the player is free to move it to any slot in their inventory.`,
					"none",
					'{\\"lockMode\\":\\"inventory\\"}',
				);
				break;
			case "keepOnDeath":
				formWikiJsonParam(
					viewer,
					"keepOnDeath",
					"Whether the item is kept on death.",
					"false",
					'{\\"keepOnDeath\\":true}',
				);
				break;
			case "canPlaceOn":
				formWikiJsonParam(
					viewer,
					"canPlaceOn",
					"The item can be placed on the blocks listed. Strangely can be applied to any item, even if its not actually placeable.",
					"null",
					'{\\"canPlaceOn\\":[\\"diamond_block\\",\\"gold_block\\"]}',
				);
				break;
			case "canDestroy":
				formWikiJsonParam(
					viewer,
					"canDestroy",
					"The item can destroy the blocks listed.",
					"null",
					'{\\"canDestroy\\":[\\"sand\\",\\"gravel\\"]}',
				);
				break;
			case "durability":
				formWikiJsonParam(
					viewer,
					"durability",
					'Only applicable to tools and armor. Set this to "unbreakable" for infinite durability. Otherwise, set this to a specific number value.',
					"null",
					'{\\"durability\\":500}',
				);
				break;
			case "enchants":
				formWikiJsonParam(
					viewer,
					"enchants",
					"Only applicable to items that have the enchantable component. Organized as an array of strings and numbers representing enchant names and levels. If a number is ommitted, level 1 is assumed.",
					"null",
					'{\\"enchants\\":[\\"sharpness\\",2,\\"mending\\",\\"unbreaking\\",3}',
				);
				break;
			case "lore":
				formWikiJsonParam(
					viewer,
					"lore",
					"Up to 20 lines of lore which shows as a description beneath the item in the player's inventory. Each line can be at most 50 characters long.",
					"null",
					'{\\"lore\\":[\\"This is line 1!\\", \\"This is line 2!\\"]}',
				);
				break;
			case "slot":
				formWikiJsonParam(
					viewer,
					"slot",
					`Based on the slot names from the /replaceitem command:\n${Object.values(SlotName).join("\n")}`,
					"null",
					'{\\"slot\\":\\"slot.weapon.mainhand\\"}',
				);
				break;
			case "slotId":
				formWikiJsonParam(
					viewer,
					"slotId",
					"The id at which to place an item. For example, id 0 in slot.inventory is the furthest left slot in the hotbar.",
					"null",
					'{\\"slotId\\":0}',
				);
				break;
			case "replaceMode":
				formWikiJsonParam(
					viewer,
					"replaceMode",
					"Applicable when a slot or slotId is selected. When set to keep, if an item is in the selected slot id or the selected slot name is full, nothing will happen. If set to destroy, the items would be replaced. If set to move, the old items would simply be moved, or spawned as an item at the player's position.",
					"destroy",
					'{\\"replaceMode\\":\\"move\\"}',
				);
				break;
			default:
				formWikiJsonList(viewer);
		}
	});
}
