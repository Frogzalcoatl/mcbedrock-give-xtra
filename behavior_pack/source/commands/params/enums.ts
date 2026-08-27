import { ItemLockMode, system } from "@minecraft/server";
import { PACK_NAMESPACE } from "../../constants";
import { SlotName } from "../../items/slot";

export const commandEnums = {
	durability: `${PACK_NAMESPACE}:durability`,
	lockMode: `${PACK_NAMESPACE}:lockMode`,
	replaceMode: `${PACK_NAMESPACE}:replaceMode`,
	slot: `${PACK_NAMESPACE}:slot`,
};

system.beforeEvents.startup.subscribe((event) => {
	event.customCommandRegistry.registerEnum(commandEnums.durability, ["unbreakable", "max"]);
	event.customCommandRegistry.registerEnum(commandEnums.lockMode, Object.values(ItemLockMode));
	event.customCommandRegistry.registerEnum(commandEnums.slot, Object.values(SlotName));
	event.customCommandRegistry.registerEnum(commandEnums.replaceMode, ["destroy", "keep"]);
});
