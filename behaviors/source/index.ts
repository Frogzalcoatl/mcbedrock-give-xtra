import { system } from "@minecraft/server";
import { registerCommandGivex } from "./commands/givex";
import { registerCommandInfo } from "./commands/info";

system.beforeEvents.startup.subscribe((event) => {
	registerCommandGivex(event.customCommandRegistry);
	registerCommandInfo(event.customCommandRegistry);
});
