import { system } from "@minecraft/server";
import {
	BLOCKX_COMMAND,
	blockxCommandCallback,
	GIVEX_COMMAND,
	givexCommandCallback,
	INFO_COMMAND,
	infoCommandCallback,
	SPAWNX_COMMAND,
	spawnxCommandCallback,
} from "./commands";

system.beforeEvents.startup.subscribe((e) => {
	e.customCommandRegistry.registerCommand(GIVEX_COMMAND, givexCommandCallback);
	e.customCommandRegistry.registerCommand(INFO_COMMAND, infoCommandCallback);
	e.customCommandRegistry.registerCommand(BLOCKX_COMMAND, blockxCommandCallback);
	e.customCommandRegistry.registerCommand(SPAWNX_COMMAND, spawnxCommandCallback);
});
