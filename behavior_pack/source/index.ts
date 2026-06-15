import { system } from "@minecraft/server";
import {
	BLOCKX_COMMAND,
	blockxCommandCallback,
	GIVEX_COMMAND,
	givexCommandCallback,
	HELP_COMMAND,
	helpCommandCallback,
	SPAWNX_COMMAND,
	spawnxCommandCallback,
} from "./commands";

system.beforeEvents.startup.subscribe((e) => {
	e.customCommandRegistry.registerCommand(GIVEX_COMMAND, givexCommandCallback);
	e.customCommandRegistry.registerCommand(HELP_COMMAND, helpCommandCallback);
	e.customCommandRegistry.registerCommand(BLOCKX_COMMAND, blockxCommandCallback);
	e.customCommandRegistry.registerCommand(SPAWNX_COMMAND, spawnxCommandCallback);
});
