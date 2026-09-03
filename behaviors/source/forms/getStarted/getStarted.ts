import type { ItemType, Player } from "@minecraft/server";
import type { GivexJson } from "../../commands/utils/json";
import type { CommandVector3 } from "../commandVector3";
import { getStartedTypeId } from "./typeId";

export const getStartedTitle: string = "§0Get Started";

export interface GetStartedContext {
	commandType: "givex" | "blockx" | "spawnx";
	json: GivexJson;
	location: CommandVector3;
	openedFromInfo: boolean;
	player: Player;
}

function getDefaultContext(player: Player, itemType?: ItemType): GetStartedContext {
	return {
		commandType: "givex",
		json: {
			amount: 1,
			typeId: itemType?.id ?? "",
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
		openedFromInfo: itemType === undefined,
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

export async function formGetStarted(viewer: Player, startingType?: ItemType): Promise<void> {
	const context: GetStartedContext = getDefaultContext(viewer, startingType);
	getStartedTypeId(context);
}
