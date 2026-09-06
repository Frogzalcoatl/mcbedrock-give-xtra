export enum SlotName {
	Inventory = "slot.inventory",
	Mainhand = "slot.weapon.mainhand",
	Offhand = "slot.weapon.offhand",
	Head = "slot.armor.head",
	Chest = "slot.armor.chest",
	Legs = "slot.armor.legs",
	Feet = "slot.armor.feet",
	Hotbar = "slot.hotbar",
	MobChest = "slot.chest", // Donkeys, Mules, Llamas
	Armor = "slot.armor", // Horse armor
	Saddle = "slot.saddle", // Horses, llamas (carpet), donkeys, etc.
	EndChest = "slot.endchest",
}

// These slots will behave the same as /give if slotId is not defined
export const containerSlots: string[] = [SlotName.Inventory, SlotName.MobChest, SlotName.EndChest];
