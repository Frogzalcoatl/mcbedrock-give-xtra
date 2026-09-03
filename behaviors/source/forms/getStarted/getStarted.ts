import type { Enchantment, Player } from "@minecraft/server";
import type { GivexJson } from "../../commands/utils/json";
import type { CommandVector3 } from "./commandVector3";
import { getStartedTypeId } from "./typeId";

export const getStartedTitle: string = "§0Get Started";

export interface GetStartedContext {
	commandType: "givex" | "blockx" | "spawnx";
	enchants: Enchantment[];
	json: GivexJson;
	location: CommandVector3;
	openedFromInfo: boolean;
	player: Player;
}

function getDefaultContext(player: Player, item?: string): GetStartedContext {
	return {
		commandType: "givex",
		enchants: [],
		json: {
			amount: 1,
			typeId: item ?? "",
		},
		location: {
			x: {
				includeSquiggly: true,
			},
			y: {
				includeSquiggly: true,
			},
			z: {
				includeSquiggly: true,
			},
		},
		openedFromInfo: item === undefined,
		player: player,
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
