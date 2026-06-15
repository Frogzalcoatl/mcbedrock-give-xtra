import { system } from "@minecraft/server";
import {
	BLOCKX_COMMAND,
	blockxCommandCallback,
	GIVEX_COMMAND,
	givexCommandCallback,
	HELP_COMMAND,
	helpCommandCallback,
} from "./commands";

system.beforeEvents.startup.subscribe((e) => {
	e.customCommandRegistry.registerCommand(GIVEX_COMMAND, givexCommandCallback);
	e.customCommandRegistry.registerCommand(HELP_COMMAND, helpCommandCallback);
	e.customCommandRegistry.registerCommand(BLOCKX_COMMAND, blockxCommandCallback);
});
