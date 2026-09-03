import { ModalFormData } from "@minecraft/server-ui";
import { type GetStartedContext, getStartedTitle } from "./getStarted";

export async function getCommandType(context: GetStartedContext): Promise<void> {
	const form = new ModalFormData();
	form.title(getStartedTitle);
	let defaultValueIndex: number = 0;
	if (context.commandType === "givex") {
		defaultValueIndex = 0;
	} else if (context.commandType === "blockx") {
		defaultValueIndex = 1;
	} else if (context.commandType === "spawnx") {
		defaultValueIndex = 2;
	}
	const top: string = "What would you like to do with this item?";
	const bottom: string = "Select Option:";
}
