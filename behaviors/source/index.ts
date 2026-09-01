import { system } from "@minecraft/server";
import { registerGivex } from "./commands/givex";

system.beforeEvents.startup.subscribe((event) => {
	registerGivex(event.customCommandRegistry);
});
