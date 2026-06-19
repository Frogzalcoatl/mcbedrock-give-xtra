# Give Xtra
/give or spawn items with special properties including infinite durability, enchants and more.

## Commands

**Note:** Commands can be typed without the "givex:" namespace, given there are no conflicts with other commands. For example, `/givex:help` must include "givex:" to avoid conflicting with the vanilla /help command.

## /givex:help
```
/givex:help <itemName (optional)>
```

**Description:**

Select item properties to generate and copy givex commands. Additionally contains a wiki explaining every givex property.

**Parameters:**

`itemName?:` Open item properties UI with an item type ID filled in. Useful for tab autocompletion.

**Example:**

```
/givex:help diamond_sword
```
Opens UI to generate a command with special properties for a diamond sword.

## /givex:givex
```
/givex:givex <target> <itemName> <amount: (optional, default = 1)> <json (optional)>
```

**Description:**

Give items with special properties to entities.

**Parameters:**

`target:` Entities to recieve the item.

`itemName:` Item type ID.

`amount?:` The number of item(s) to give. Must be an integer greater than 0. If a slot id is specified in the json parameter, max amount is the item's max stack size, otherwise 32767. (32767 matches the max defined in the vanilla /give command)

`json?:` Special properties to assign to an item in stringified json format surrounded by quotes. Any quotes inside the outer quotes must be escaped using a backslash (i.e. ```\"```). This parameter can be easily generated using the /givex:help command.

**Example:**
```
/givex:givex @p arrow 64 "{\"arrowType\":\"poison\",\"nameTag\":\"Scary Arrows\"}"
```
Gives the nearest player 64 arrows of poison with the nametag "Scary Arrows".

## /givex:blockx
```
/givex:blockx <position> <itemName> <amount(optional, default = 1)> <json (optional)>
```

**Description:**

Give items with special properties to blocks.

**Parameters:**

`position:` Coordinates of a block to recieve an item (such as a chest).

`itemName:` Item type ID.

`amount?:` The number of item(s) to give. Must be an integer greater than 0. If a slot id is specified in the json parameter, max amount is the item's max stack size, otherwise 32767. (32767 matches the max defined in the vanilla /give command)

`json?:` Special properties to assign to an item in stringified json format surrounded by quotes. Any quotes inside the outer quotes must be escaped using a backslash (i.e. ```\"```). This parameter can be easily generated using the /givex:help command.

**Example:**
```
/givex:blockx ~ ~ ~ iron_pickaxe 1 "{\"durability\":\"unbreakable\"}"
```
Gives an iron piackaxe with infinite durability to a block with an inventory (such as a chest).

## /givex:spawnx
```
/givex:spawnx <position> <itemName> <amount (optional, default = 1)> <json (optional)>
```

**Description:**

Spawn items with special properties.

**Parameters:**

`position:` Coordinates at which to spawn an item.

`itemName:` Item type ID.

`amount?:` The number of item(s) to give. Must be an integer within range 1 and the max stack size of your specified item.

`json?:` Special properties to assign to an item in stringified json format surrounded by quotes. Any quotes inside the outer quotes must be escaped using a backslash (i.e. ```\"```). This parameter can be easily generated using the /givex:help command.

**Example:**
```
/givex:spawnx ~ ~10 ~ gold_block 1 "{\"canPlaceOn\":[\"grass_block\"]}"
```
Spawns a gold block 10 blocks above the user's head that can be placed on grass blocks in adventure mode.

## Item Property JSON
