import { system } from "@minecraft/server";
import { registerCommandBlockx } from "./commands/blockx";
import { registerCommandGivex } from "./commands/givex";
import { registerCommandInfo } from "./commands/info";
import { registerCommandSpawnx } from "./commands/spawnx";

system.beforeEvents.startup.subscribe((event) => {
	registerCommandGivex(event.customCommandRegistry);
	registerCommandBlockx(event.customCommandRegistry);
	registerCommandSpawnx(event.customCommandRegistry);
	registerCommandInfo(event.customCommandRegistry);
});
