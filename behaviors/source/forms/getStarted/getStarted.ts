import type { Enchantment, Player } from "@minecraft/server";
import type { GivexJson } from "../../commands/utils/json";
import type { CommandVector3 } from "./commandVector3";
import { getStartedTypeId } from "./typeId";

export const getStartedTitle: string = "§0Get Started";

export interface GetStartedContext {
	amount: number;
	commandType: "givex" | "blockx" | "spawnx";
	data: number;
	enchants: Enchantment[];
	json: GivexJson;
	location: CommandVector3;
	openedFromInfo: boolean;
	player: Player;
	typeId: string;
}

function getDefaultContext(player: Player, item?: string): GetStartedContext {
	return {
		amount: 1,
		commandType: "givex",
		data: 0,
		enchants: [],
		json: {
			canDestroy: null,
			canPlaceOn: null,
			durability: null,
			enchants: null,
			keepOnDeath: null,
			lockMode: null,
			nameTag: null,
			replaceMode: null,
			slot: null,
			slotId: null,
		},
		location: {
			x: {
				includeSquiggly: true,
				num: null,
			},
			y: {
				includeSquiggly: true,
				num: null,
			},
			z: {
				includeSquiggly: true,
				num: null,
			},
		},
		openedFromInfo: item === undefined,
		player: player,
		typeId: item ?? "",
	};
}

export function formatLabel(top: string, bottom: string, error?: string) {
	if (error) {
		return `${top}\n\n§r§c${error}§r\n${bottom}`;
	} else {
		return `${top}\n\n${bottom}`;
	}
}

export async function formGetStarted(viewer: Player, item?: string): Promise<void> {
	const context: GetStartedContext = getDefaultContext(viewer, item);
	getStartedTypeId(context);
}
