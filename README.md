# Give Xtra
/give or spawn items with special properties including infinite durability, enchants and more.

# Commands

**Note:** Commands can be typed without the "givex:" namespace, given there are no conflicts with commands from other packs.

## /givex:info

**Usage:**
```
/givex:info <itemName (optional)>
```

**Description:**

Select item properties to generate and copy givex commands. Additionally contains a wiki explaining every givex property.

**Parameters:**

`itemName?:` Open item properties UI with an item type ID filled in. Useful for tab autocompletion.

**Example:**

**Usage:**
```
/givex:info diamond_sword
```
Opens UI to generate a command with special properties for a diamond sword.

## /givex:givex

**Usage:**
```
/givex:givex <target> <itemName> <amount: (optional, default = 1)> <data: (optional, default = 0)> <json (optional)>
```

**Description:**

Give items with special properties to entities.

**Parameters:**

`target:` Entities to recieve the item.

`itemName:` Item type ID.

`amount?:` The number of item(s) to give. Must be an integer greater than 0. If a slot id is specified in the json parameter, max amount is the item's max stack size, otherwise 32767. (32767 matches the max defined in the vanilla /give command)

`data?:` The data value of the item. Must be an integer greater than or equal to 0. Useful for items such as beds, arrows, and potions (as of Minecraft v1.26.44).

`json?:` Special properties to assign to an item in stringified json format surrounded by quotes. Any quotes inside the outer quotes must be escaped using a backslash (i.e. `\"`). This parameter can be easily generated using the /givex:info command.

**Example:**
```
/givex:givex @p arrow 64 28 "{\"nameTag\":\"Scary Arrows\"}"
```
Gives the nearest player 64 arrows of poison with the nametag "Scary Arrows".

## /givex:blockx

**Usage:**
```
/givex:blockx <position> <itemName> <amount(optional, default = 1)> <data: (optional, default = 0)> <json (optional)>
```

**Description:**

Give items with special properties to blocks.

**Parameters:**

`position:` Coordinates of a block with an inventory (such as a chest).

`itemName:` Item type ID.

`amount?:` The number of item(s) to give. Must be an integer greater than 0. If a slot id is specified in the json parameter, max amount is the item's max stack size, otherwise 32767. (32767 matches the max defined in the vanilla /give command)

`data?:` The data value of the item. Must be an integer greater than or equal to 0. Useful for items such as beds, arrows, and potions (as of Minecraft v1.26.44).

`json?:` Special properties to assign to an item in stringified json format surrounded by quotes. Any quotes inside the outer quotes must be escaped using a backslash (i.e. `\"`). This parameter can be easily generated using the /givex:info command.

**Example:**
```
/givex:blockx ~ ~ ~ iron_pickaxe 1 0 "{\"durability\":\"unbreakable\"}"
```
Gives an iron piackaxe with infinite durability to a block with an inventory.

## /givex:spawnx

**Usage:**
```
/givex:spawnx <position> <itemName> <amount (optional, default = 1)> <json (optional)>
```

**Description:**

Spawn items with special properties.

**Parameters:**

`position:` Coordinates at which to spawn an item.

`itemName:` Item type ID.

`amount?:` The number of item(s) to give. Must be an integer within range 1 and the max stack size of your specified item.

`data?:` The data value of the item. Must be an integer greater than or equal to 0. Useful for items such as beds, arrows, and potions (as of Minecraft v1.26.44).

`json?:` Special properties to assign to an item in stringified json format surrounded by quotes. Any quotes inside the outer quotes must be escaped using a backslash (i.e. `\"`). This parameter can be easily generated using the /givex:info command.

**Example:**
```
/givex:spawnx ~ ~10 ~ gold_block 1 0 "{\"canPlaceOn\":[\"grass_block\"]}"
```
Spawns a gold block 10 blocks above the user's head that can be placed on grass blocks in adventure mode.

## Item Property JSON
All properties listed below are optional, and some are exclusive to specific items such as durability and enchants.
```ts
interface GivexJson {
	nameTag: string | null;
	lockMode: ItemLockMode | null;
	keepOnDeath: boolean | null;
	canPlaceOn: string[] | null;
	canDestroy: string[] | null;
	durability: "unbreakable" | number | null;
	enchants: (string | number)[] | null;
	lore: string[] | null;
	slot: SlotName | null;
	slotId: number | null;
	replaceMode: "keep" | "destroy" | "move" | null;
}
```
### nameTag
The nameTag of the item. Cannot exceed length 255. I suggest starting nametags with `§r` to remove default italicization applied by Minecraft.

Default = null (The item's default name)

Ex: `{\"nameTag\":\"Name Here\"}`

### lockMode
Based on the lock modes provided by Minecraft:
```ts
enum ItemLockMode {
    inventory = 'inventory',
    none = 'none',
    slot = 'slot',
}
```
When set to slot, the item is locked to the players slot and cannot be dropped. When set to inventory the item cannot be dropped, but the player is free to move it to any slot in their inventory.

Default = "none"

Ex: `{\"lockMode\":\"inventory\"}`

### keepOnDeath
Whether the item is kept on death.

Default = false

Ex: `{\"keepOnDeath\":true}`

### canPlaceOn
The item can be placed on the blocks listed. Strangely can be applied to any item, even if its not actually placeable.

Default = null

Ex: `{\"canPlaceOn\":[\"diamond_block\",\"gold_block\"]}`

### canDestroy
The item can destroy the blocks listed.

Default = null

Ex: `{\"canDestroy\":[\"sand\",\"gravel\"]}`

### durability
Only applicable to tools and armor. Set this to "unbreakable" for infinite durability. Otherwise, set this to a specific number value.

Default = null

Ex: `{\"durability\":500}`

### enchants
Only applicable to items that have the enchantable component. Organized as an array of strings and numbers representing enchant names and levels. If a number is ommitted, level 1 is assumed.

Default = null

Ex: `{\"enchants\":[\"sharpness\",2,\"mending\",\"unbreaking\",3}`

### lore
Up to 20 lines of lore which shows as a description beneath the item in the player's inventory. Each line can be at most 50 characters long.

Default = null

Ex: `{\"lore\":[\"This is line 1!\", \"This is line 2!\"]}`

### slot
Based on the slot names from the /replaceitem command:
```ts
enum SlotName {
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
```

Default = null

Ex: `{\"slot\":\"slot.weapon.mainhand\"}`

### slotId
The id at which to place an item. For example, id 0 in slot.inventory is the furthest left slot in the hotbar.

Default = null

Ex: `{\"slotId\":0}`

### replaceMode
Applicable when a slot or slotId is selected. When set to keep, if an item is in the selected slot id or the selected slot name is full, nothing will happen. If set to destroy, the items would be replaced. If set to move, the old items would simply be moved, or spawned as an item at the player's position.

Default = "destroy"

Ex: `{\"replaceMode\":\"move\"}`
