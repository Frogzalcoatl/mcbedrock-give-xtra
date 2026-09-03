import { system } from "@minecraft/server";
import { registerCommandBlockx } from "./commands/customCommands/blockx";
import { registerCommandGivex } from "./commands/customCommands/givex";
import { registerCommandInfo } from "./commands/customCommands/info";
import { registerCommandSpawnx } from "./commands/customCommands/spawnx";

system.beforeEvents.startup.subscribe((event) => {
	registerCommandGivex(event.customCommandRegistry);
	registerCommandBlockx(event.customCommandRegistry);
	registerCommandSpawnx(event.customCommandRegistry);
	registerCommandInfo(event.customCommandRegistry);
});
