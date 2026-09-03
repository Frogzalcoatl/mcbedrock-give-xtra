import { system } from "@minecraft/server";
import { registerCommandGivex } from "./commands/customCommands/givex";
import { registerCommandInfo } from "./commands/customCommands/info";

system.beforeEvents.startup.subscribe((event) => {
	registerCommandGivex(event.customCommandRegistry);
	registerCommandInfo(event.customCommandRegistry);
});
