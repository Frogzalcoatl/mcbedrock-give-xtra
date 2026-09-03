import {
	type EnchantmentType,
	EnchantmentTypes,
	ItemComponentTypes,
	type ItemDurabilityComponent,
	type ItemEnchantableComponent,
	ItemLockMode,
	ItemStack,
	type Player,
	Potions,
	system,
	world,
} from "@minecraft/server";
import {
	formatTypeId,
	getMaxItemPropertiesAmount,
	
tMaxStackSize,
	ItemPropertiesValidation

	itemTypeToPotionDeliveryType,
	SlotNamesOneStackOnly,
} from "../itemProperties";
imp
t { applyEnchantData, getApplicableEnchantIds, getMaxDurability } from "../
emStack";
import { camelToTitleCase, prettyTypeId, st

ToNumber, truncTo } from "../prettyTy
Id";
import {
	ArrowTypes,
	BedCo
rs,
	type Boolea
i
Message,
	CommandNamespace,
	type CommandType,
	type ItemDurability,
	typ
ItemProperties,
	ItemPropertyKeys,
	type SlotD
a,
	SlotDataKeepOldItemDefault,
	Slo
ame,
} from "../types";
import { getI
mPropertyIconPath } f
m "./iconPaths"

import { FormInfo } fr
 "./info";

por
{
	type ActionForm,
	type Act
nFormButton,
	type FormTextComponent,
	type MessageForm,
	ty
 ModalForm,
	type ModalFormCompo
nt,
	type M
alFormDropdownComponent,
	type ModalForm
turnType,
	type ModalF
mTextF
ldCo
onent,
	type ModalFormToggleComponent,
	showActionForm,
	showM
sag
orm,
	showModalForm,
} from "./types";

interface CommandVector3Value {
	num?: number

	includeSquiggly: boolean;
}
c
st MaxCommandVector3Value = 
** 30 - 1;

export interface CommandVector3 {

: CommandV
tor3
lue;
	y: CommandVector3Va
e;
	z: CommandVector3Value;
}

function cVect
3ValueToString(value: Comma
Vector3Value,
ecim
Places: number): string {
	let str = `${value.includeSquiggly ? "~" : ""}`;
	
 (value.num !== undefined) {
		s
 += `${truncTo(value.num, decimalP
ces)
;
	}
	return str;
}

export function commandVector3ToString(vector: CommandVector3, de
malPlaces: number = 3): string {
	let str = `${cVector3ValueToString(v
tor.x, decim
Places)}`;
	str += ` ${cVector3ValueToSt
ng(vector.y, decimalPla
s)}`;
str 
 ` ${cVector3ValueToString(vector.z, decimalPlaces)}`;
	return 
r;
}

interface CommandVector3ParseRes
t {
	vect
: Co
andVector3 | undefined;
	message: string;
}

po
 func
on parseCommandVector3(str: string
 CommandVector3ParseResult {
	con
 vectorValues: CommandVector3Value
 = [];
	const arr: strin
] = 
r.split(" 
;
	for (let i = 0; i < arr.length; i++) {
	
et value = arr[i];
	
f (!
lu
 {
			//
kip extra spaces
			continue;

}
		if (!v
ue.startsWith("~")) {
		const numResult: num
r | undefined = string
Numb
(va
e

			if (numResult === undefined) {
	
	return {
					message: `In
lid entry "${valu
"

					vector: undefi
d,
				};
		}
			vect
Values.p
h

ncludeSquiggly: false, num: numRe
lt });
		}
		// Minec
ft allows for no spaces 
tween values with squigglys. e.g.
~2~10~2" is valid
		while (value
tartsWith("~")) {
			if (value.length
== 1) {
				vectorValues.push({ 
cludeSquiggly
true });
				brea

			}
			if (value[1] ==
"~") {
				vectorValu
.push({ includeSquiggly: tru
});
			value = value.slice(1

				continue;
			}
			let nextSquigglyIndex: numbe
| undefined = v
ue.slice(1).i
exOf("~") + 1;
			
 (nextSquigglyIndex === 0) {
				
xtSquigglyIndex = undefined;
			}
			const
umResult: number | 
defined
 stringToNumber(value.slic
1, ne
Squiggl
ndex));
			if (numResult 
= und
ined ||
umResult > MaxCommandVecto
Value
{
	
	return {
					message: `Inval
 entry "${value}"`,
					vector: undef
ed

			};
			}
			vectorValues.push({ includeSquiggly: true, n

numResult });
			if (nextSquigglyIndex ===
ndefined) {
				break;
			}

	value = value.slice(nextSquigglyIndex);
		}
	}
	if (
		vectorValues[0] === unde
ned ||
		vectorValues
] === undefined ||
		vectorValues[2] === undefined ||
	
ect
Values.length > 3
	) {
		return {

	message: `Must have exactly three values`,
		v
tor: undefined,
		};
	}
	return {
		message: "P
sed coordinates",
		vector: {
			x: vectorValues[0],
			y: vectorValues[1],

	z: vectorValues[2],
		},
	};



i
erface PromptEnchantTypesResult {
	selectedEnchants: string[];
	message: string;
}

enum Pr
ptR
ult {
	Completed,
	InProgress,
	Closed,
}

export class ItemPropertiesForm {
	public player: Player;
	public p
pert
s: ItemProperties;
	public comman
ype: CommandType;
	public location: CommandVector3;
	priv
e e
tableProperties: string[];
	private openedFromInfo: boolean;
	const
ctor(
		creator: Player,
		openedFromInfo: boolean,
		item
peI
: string,
		commandType?: CommandType,
	) {

this.player = creator;
		// Just default values, can be cha
ed 
 user later
		this.properties = {
			amount
1,
			slot: undefined,
			typeId: itemTypeId ?? "",
		};
		t
s.commandType = commandType ?? "givex"

		this.location = {
			x: {
				includeSquiggly: tru

	
},
			y: {
				includeSquiggly: true,

	},
			z: {
				includeSquiggly: true,
			},
		};
		
is.editableProperties = [];
		this.openedFromInfo = opene
romInfo;
	}

	private static readonly FORM_TITLE: string =
Get Started";

	private updateEditableProperties(): void {
		this.editableProperties = [];
		const maxAmount: number =
et

temPropertiesAmount(this.properties, this.commandType);
		if (maxAmount > 1) {
			th
.editableProperties.push(ItemPropertyKeys
mo

;
		}
		if (this.commandType !== "give
) {
			this.editablePr
erties.push("location");
	}
		const testItem = new ItemS
ck(this.properties.typeId);
		const durability: I
mDurabilit
omponent | undefined = testItem.getComponent(
			ItemC
ponentTypes.Durability,
		);
		if 
urability !== undefined) {
			this.editableProperties.pu
(Ite
ropertyKeys.Durability);
		}
		const enchantable: ItemEnchantableComponent | 
def
ed = testItem
et

onent(
			ItemComponentTypes.Enchantable,

);
		if (enchantable !== undefined) {
	
this.editable
ope
ies.push(ItemPropertyKeys.En
ants);
		}
		if (itemTypeToPotionDeli
ryType(this.properties.typeId) !== undefined) {
			t
s.e
tableProperties.push(ItemPropertyKeys.PotionType);

}

f (this.properties.typeId === "minecraft:arrow") {
			th
.editableProperties.pus
ItemPropertyKeys.ArrowType);
		}
		if (this.properties.typeId === 
ine
aft:bed") {

	t

editableProperties.push(ItemPropertyKeys.
dColor);
		}
		if (this
ommandType !== "spawnx") {
			this.editableProperties.push(ItemPropertyKeys.Slot

		}
		// These properties are always editable
		t
s.editableProperties.push(ItemPropertyKeys.NameTag);
		this.editableP
perties.push(ItemPropertyKeys.LockM
e);
		this.editableProperties.push(ItemPropertyKeys.KeepOnDeath);
		
is.
itableProperties.push(ItemPropertyKey
CanPlaceOn);
		this.editableProperties.push(ItemPropertyKeys.CanDestroy);
	}


riv
e propertyDisplay(property: string, va
e: string | number | boolean): string

	
eturn `§r\n${property}: §e${value}`;
	}

	private slotPropertyDisplay(): string {
		let str: str
g =
";
		const data = this.properties;
	if (data.slot === undefined) {
			str +
thi
propertyDisplay("Slot", "Default");
	
 else {
			str += this.propertyDisplay("Slot", data.slot.name);
			if (data
lot
d !== undefined) {
				str += this.p
pertyDisplay("Slot ID", data.slot.id);
			}
			str += this.propertyDispla
"Ke
 Old Item in Slot", data.slot.keepOl
tem);
		}
		return str;
	}

	private enchantsPropertyDisplay(): stri
 {
	if (this.properties.enchants === un
fined) {
			return "";
		}
		let enchants: string = "";
		for (const e of 
is.
operties.enchants) {
			enchants += `\
${prettyTypeId(e.id)} ${e.level}`;
		}
		return this.propertyDis
ay(
nchants", enchants);
	}

	private s
ArrayPropertyDisplay(arr: string[]): string {
		let str: string = "";
		for (const va
e o
arr) {
			str += `\n-${prettyTypeId(v
ue)}`;
		}
		return str;
	}

	private getPropertiesDisplay(): string {
		const d
a =
his.propertie



t str: string = this.propertyDi
lay("Item Type", prettyTypeId(data.typeI
);
		str += this.proper
Display("Amount
 data.amount);
		str += this.propertyDisplay(
ommand Type", `/${this.commandType}`);
		if
data.nameTag !== undefined) {
		str += this.proper
Display("Name Ta
, `"${data.nameTag
r§e"
;

}
		if (this.comma
Type !== "givex") {
			str += this.prop
tyDis
ay("Location", comm
dVector3ToString(this.location));
	

		if (this.comm
dType
== "spawnx
 {
			str += this.slotPro
rtyDisplay();
		}
		if (data.durability
== undefined) {
		
tr +=
his.propertyDisplay("Durability", data.d
abil
y)

	}
		if (data.enchants !== undefined) {
			str += this.enchantsPropertyDisplay();
		

		if (data.potionType !== undefined) 

			str += thi
propertyDisplay("Potion Type", p
tty
peId(data.potionTyp
);
		}
		if
da

rrowType !== undefined) {
			str += this.propertyDisp
y("Arrow Type", prettyTypeId(data.arrowType));
		}
		if (data.b
Color !== undefined) {
			str += this.propertyDis
ay("Bed Color", prettyTypeId(data.bedColor));
		}
		if (data.lockMode !== undefined) {
			str += this.prop
tyDisplay("It
 Lock Mode", prettyTypeId(data.lock
de));
		}
		if (data.keepO
eath
== undefined) {
			str += this.propertyDisplay("Keep
n Death", data.
epOnDeath);
		}
		if (data.canPlaceOn !== undefined) {
			this.propertyDisplay("Can Pla
 On"
this.strArrayPropertyDisp
y(data.canPlaceOn));
		}
		if (data.canDestroy !== undefined) 

			this.propertyDisplay("Can Destroy", t
s.strArrayPrope
yDisplay(data.canDestroy));
		}
		return s
;
	}

	priv
e getTemplatePr
ptForm(
		inputComponents: ModalF
mCompo
nt[],
		optionalNote?: s
ing,
	): ModalForm {
		
nst co
onen
: ModalFormComponent[] = [];
		for (const component of inputComponents) {
	
component
push(component);
			co
onents.push({
				text: `§r`,
				type: "label",
			});
		}
		com
nents.pop();
		components.push({
			type: "div
er",
		});
		components.push(

			text: `${optionalNote ?? ""}§r`,
		
ype
"label",
		});
		return {
			compo
nts: components,
			submitButton: {
				addStyl
g:

e,
				text: "Submit",
			},
			title: ItemPropertiesFor
FORM_TITLE,
		};
	}

	private fo
atInputLabel(question: string, statem
t: string, error: string)
string {
		let str: string = `${question}\n\
;
		if (error) {
			str
= `§r§c${error}§r\n`;
		}
		str += state
nt;
		return str;
	}

pri
te async promptTypeId(): Promise<PromptResult> {
		const quest
n: string = "What item would you like
o use?§r";
		const statement: string = "Enter 
em type ID:";
		const textField: ModalFormTextFieldComponent = {
			label: this.format
putLabel(question, statement, ""),
			options: {
				de
ultValue: thi
properties.typeId,
			},
			type: "text
eld",
		};
		const form: 
dalF
m = this.getTemplatePromptForm(
			[textField],
			"Note: You c
 also run the command §e/givex:info <itemType>§r for auto completion.",
		);
		let inpu
 string = "";
		let formattedTypeId: string | undefined = for
tTypeId(input);
		while (formattedTypeId === u
efi
d) {
			if (input) {
				textField.l
el = this.formatInputL
el(
					
estion,
					statement,
					
nvalid Typ
ID "${inpu
"`,
				);
				textField.optio
 = {
				
efaultValu
 input,
				};
			}
			const 
rmResult: 
dalFormRetu
Type[] | undefined = await showModalForm(
				f
m,
			this.player,
			);
			if (formResult === und
in

| typeof formResult[0] !== "string") {
				return Promise.
solve(PromptResult.Closed);
			}
			input = formResult[0];
			formattedTypeId = formatTypeI
input);
		}
		this.properties.typ
d = formattedTypeId;
		re
rn Promise.r
olve(PromptResult.Com
eted);
	}

	pri
te a
nc promptCommandType
: P

se<PromptResult> {
		let defaultValueIndex: number = 0;
		if 
his.commandType === "givex") {
			defaultValueIndex = 0;
		} else if (this.commandType
== "blockx") {
			defaultValueIndex = 1;
	} else if (this.commandType 
= "spawnx") {
		d
aultValueIndex = 2;

}
		const question = "What would
ou like to
o with this item?";
		const sta
men
= 

ect Option:";
		const dropdown: ModalFormDropdo
Component = {
			items: ["Give to Player/Mob", "Give to Block (e.g: Chest)", "Spawn
s Dropped Item"],
			label: this.formatInputLabel(question, statement, ""),
			options: {
				defaultValueIndex: defaul
alueIndex,
			},
			type: "dropdown",
		};
		const form: ModalForm = 
is.getTemplatePromptForm([dropdown]);
		const res
t: ModalFormReturnType[] | undefined = await showModalFor
form, this.pl
er);
		if (result === undefined || type
 resu
[0] !== "number") {

	ret
n Promise.resolve(PromptResult.Closed);
		}
		const s
ection: number = result[0

		switch (selection) {
			case 0:
	
	this.com
ndType = "givex";
				break;
	
case 1:
				this.comm
dType = "blockx";
				break;
		case 2:
				this.commandType = 
pawnx

				break;
	
default:
				return Promise.resolve(PromptR
ult.Closed);

}
		return Pro
se.resolve(PromptResult.Completed

	}

	private static readonly 
CK_CONFIRMATION: MessageF
m = {
	bod
 "Are you sure you would like to go back? Any selected item properties will b
reset.",
	button1: {
			
dStyl
g: false,
			text: "Im Sure!",
		},
		button2: {
			addStyling: fal
,
			text: "Cancel",
		},
		title: "Go Back?",
};

	private async properties
ckConfirmation(): Promise<boolean> {
		
t r
ult = await showMessageForm(ItemPr
ertiesForm.BACK_CONFIRMATION, this.player);
		// Treat closin
th

orm as "Im Sure!"
		if (result === undefined) {

	result = 0;
		}
		if (r
ult === 1) {
			return Promise.
solve(false);
		} else {
			return Promise.res
ve(true);
		}
	}

	private async promptAmount(): P
mise<string> {
		const maxAmount: number
 getMaxItemPropertiesAmount(this.properties, this.
mmandType);
		const question: string = `How much of your
tem would you
ike to ${this.commandType === "spawnx" ? "spawn" : "give"}?`;
		con
 statement: string = 
nter
nteger within range 1-${maxAmount}:`;
		const textFiel
 ModalFormTextFieldCompon
t = {
			label: this.formatInputLabel(question, statemen
 ""),
			options: {
				defaultValue: `${this.properties.amount}`,
			

			type: "tex
ield",
		};
		const form = this.getTemplat
romptForm([tex
ield]);
		let 
put: string = "";
		let amountR
ult: n
ber | undefined;
		while (
		amountResult === undefined ||
			amountRe
lt < 
||

	amountResult > maxAmount ||
			!Number.isInteger(amountResult)
		) {
			i
(input) {
				textField.la
l = t
s.formatInputLabel(
					question,
					statement,
					`Invalid amo
t "${input}"`,
				);
				textField.options = {
	
		de
ultValue: input,
				};
		}
			const formResult: ModalFormReturnTyp
] |
ndefined = await showModalForm(
				
rm,
				this.player,
			);
			if (formResult === undefined || typeof formResult[0] !==
st

") {
				return Promise.resolve("§cAmount unchange
);
			}
			input = formResult[0];
			a
untResult = 
ringToNumber(inpu
;
	

		this.properties.amount = amountResult;
		return Promise.resolve(`Amount se
to: §e${amountResult}`);
	}

	pr
ate async promptLocation()
Promise<string> {
		const question: string =
			this.commandType === "s
wnx"
			
"Where would you like to spa
 your item?"
				: "What bl
k location would you like 
 target?";
		const statement = "Enter Coordinates:";
		const textField: ModalFormTextF
ldCom
nen
= {
			label: this.formatInputLabel(question, statement, ""),
		options: {
				defaultValue: `${commandVector3ToString(this.location)}`,
			},
			
pe: "textField",
		};
		con
 fo
 = this.getTemplatePromptForm([textField]);
		let
nput: string = "";
		let parseResult: CommandVector3ParseResult | u
efined;
		wh
e (parseResult === undefined || parseResult.
ctor 
= undefined) {
			if
inpu
 {
				textField.label = this.formatInputLabel(
					
estion,
					statement,
					pa
eResult?.mess
e ?? "",
				);
				if (textField.options) {
					text
eld.options.defaultValue = input;
				}
			}
			c
st fo
Result: ModalFormR
urnT
e[] | undefined = await showModalFo
(
				form,
				this.player,

	);
			if (formResult === undefined || typeof formResult[0] !== "string")

				return Promise.resolve("§cLocat
n Unchanged");
			}
			input = formResult[0]

			parseResult
 parseCommandVe
or3(
put);
		}
		this.location = parseResult.vector;
		r
urn Promise.resolve(`Location set 
: §e${commandVector3ToString(this.
cation)}`);
	}

	private async 
omptDurability(): Promise<string> {
		const errorLabel
Form
xtComponent = {
			text: "",
			type: "label",
		};
		const maxDurability
number | 
defined = getMax
rabil
y(this.properties.typeId);
		if (
xDurability === undefined) {
			return Promise.resolv

		
`Unable to get max durability for ${prettyTypeId(this.properties.typeId)}`,
			);
		}
		if (maxDurability === 0) {
			
is.properties.durability = 0

			return Promise.resolve(
				`Max durability of ${
ettyT
eId(this.properties.typeId)} is 0. No durability to change`,
			);
	}
		let currentDurabilityS
: string = `${this.properties.d
ability}`;

if (currentDurabilityStr === "undef
ed" || currentDurabilityStr === "unbreakable") {
			currentDurabilityStr 
"";

}
	
onst textField: ModalFormTextFieldComponent = {
			label: `Enter durability val
 within range 0-${maxDurability}:`,
			options: {
		
defaultValue: `${currentDurabilitySt
`,
			},
			type: "textField",
		};
		const toggleUnbreakable: Mod
FormT
gleComponent = {
			label: "Infin
e Durability?",
			options: {
				defau
Value
this
roperties.durability === "unbreakable",
		
tooltip: "If 
ue, 
rability value is ignored",
			},
			type: "toggle",
		

		const textFieldIndex
number = 1;
		const 
ggleI
ex:
umber = 3;
		const form = this.getTemplat
romptForm([textField, toggleUnbreakable]);
		form.compon
ts.
shift(errorLabel);
		let validationResult: B
leanWithMessage = {
			bool: false,
			message: "",
		};
		let potenti
Du

lity: ItemDurability | undefined;
		while (!validationResult.bool) {
			potentialDurability = 
defined;
			if (validationResult.message) {
				errorLabel.text = `§c${validat
nResult.message}`;
			}
			const formR
ult: ModalFormReturnType[] 
undefined = await showModalForm(
				form,
				this.player,
			);
			if (formR
ult === undefined) {
			
eturn 
omi
.resolve("§cDurability Unchanged");
			}
			const textFieldResult: ModalFormRetu
Type = formResult[textFieldIndex];
			if
typeof textF
ldResult === "str
g") 

				if (textField.options)

					textField.o
ions.defaultValue 
textFieldResult;
			

				const num: nu
er | 
defined = stringToNumber(textFieldResult

		
if (num !== undefined) {
					potentialDurability =
um;
				} else {
					validationResult.bool 
false;
					va
dationResult.message = `Invalid du
bili
 "${textFieldResult}"`;
		
}
			}
			const toggleUnbreakableResult: ModalFormReturnType = formResult[toggleIn
x];
		
f (typeof toggleUnbreakableResult === "boolean"
{
				if (toggleUn
eakable.options) {
					toggleU
reakable.options.defaultValue = toggleUnb
akab
Result;
				}
				if (tog
eUnbreakableResult) {
					potent
lDurability = "unbreakabl
;
			

	
}
			if (potentialDurability === undefined) {
				continue;
			}
			validationR
ult = ItemPropertiesValidation.dur
ilit

				potentialDurability,
				th
.properties.typeId,
			);
	}
		if (potentialDurability === undefined) {
			return Promise.r
olve("§cUnable to set du
bility
;

}
		this.properties.durability = 
tentialDurability;
		return Promise.resolve(`Set dura
lity to: §e${this.properties.dura
lity}`);
	}

	private async promptEnchantTypes(
eviousMessage?: string): P
mise<PromptEnchantTypesResult> {
		const a
licableEnchants
string[] = getApplicableEnchantIds(this.properties.typeId);
		
 (appli
bleEnchants.length =
 0) {

	ret
n Promise.resolve({
				
ssage: `§cNo valid 
chants
o apply to ${prettyTypeId(this.properties.typeId)}`,
	
	selectedEnchants: [],
			});
		

		let selectedEnchantTypes: string[] = (this.properties.enchants ?? []).map((e) => e.i
;
	
onst errorLabel: FormTextComponent = {
			text: "",
			type: "label",
		};
		const form: ModalForm = {
			components: [],
		submitButton: {
				addStyling: true,
				t
t: "Submit",
			},
			title: ItemPropertiesForm.FORM_T
LE,
		};
		let formResult: Moda
ormReturnType[] | undefined;
		let 
lidat
nRes
t: BooleanWithMessage = {
		
ool: false,
			message: previousMessage ?? "",
	};
		let itemStack: ItemStack;
		let errorMessage: string = "Unable
o create test item whi
 validating enchants";
		try {
			itemStac
= new
temS
ck(this.properties.typeId);
		} catch (err
) {
			if (error instanceof
rror) {
				errorMessage +=
: ${error.message}`;
			}
			return Pro
se.resolve({
				message:
§c${er
rMes
ge}`,
				selectedEnchants: [],
			})

		}
		const enchantable: ItemEnchantableComponent 
undefined = itemStack.getComponent(
			ItemComponentTypes.Enchantable,
		);
		if 
nchantable === undefined) {
			r
urn Promise
esolv
{
	
	me
age: `${errorMessage}: Enc
ntable component is undefined`,
				selectedE
hants: [],
			});
		}
		while (!validat
nResu
.b

 {
			errorLabel.text = `§c${validationResult.message}`;
			form.components = [errorLabel];
	
for (const enchantType of applicableEncha
s) {
				fo
.components.push(

			
label: `${prettyTypeId(ench
tType)}`,
					op
ons: {
						defa
tValue: selectedEncha
Types.includes(ench
tType

					},
					type: "toggle",
				});
			}
			form.components.push

				type: "divider",
			});
	
formResult = await showModalForm(form, this.player)

			if (formResult === undefined) {
				return Promise.resolve({ message: "§cEnchants 
changed", selectedEnchants: [] });
	
}
			formResult.shift(); //
emove error label
rom formResult at index 0
			formResult.pop(); // Remove divider from las
index

	con
 selectedEnchantIndexes: number[] = [];
		for (let i: number = 0; i < formResult.l
gth; i++) {
				if (formResult[i] === true) {
				selectedEnchantIndexes.push(i);
				}
		}
			selectedEnchantTypes = [];
		for (const
ndex o
selec
dEnc
ntIndexes) {
				const enchantType: s
ing | undefined = applicab
Enchants[index];
				if (enchantType) {
					selectedE
hantTypes.push(ench
tType);
				}
			}
			if (selectedEnchantType
length === 0) {
				this.properties.enchants = [];
	
	return Promise.resolve({
					message: "
t Enchants to: §enon
,
					selecte
nchants: [],
				});
			}
			enchan
ble.rem
eAllEnchantments();
		for (
nst 
cha
Type of selectedEnchantT
es) {
				validati
Resul
= applyEnchantData(enchantable, { id: enchantType, level: 1 });
				if (!va
dationRe
lt.bool) {
			
brea

				}
			}
		}
		return Prom
e.resolve({
			message: "User has selected enchant types",
			selectedEnchants: se
cte
nchantTypes,
		});
	}

	private async promptEnchantL
els(selectedEnchantTypes: string[]): Promise<BooleanW
hMessage> {
		const error
bel: FormTextComponent = {
			text: "",
			type: "lab
",
		};
		const form: ModalForm = {
			components: [],
			submi
utton: {
				addStyling: true,
				text: "Submit",
			},
			title: ItemPropertiesForm.FORM_TITLE,
		};
		errorLa
l.text = "";
	for
components = [errorLabel];

for (const enchantTy
 of selectedEncha
Types)

	
const enchantTypeMc: Encha
mentType | und
ined = EnchantmentTypes.get(enchantType);
			if (enchantTypeMc ==
undef
ed


				return Promise.resolve({
					bool: false,

			message: `§cUnable to get max level of enchant typ
${enchantType}`

				});
			}
			let c
rent
vel: number | undefined;
			if (this.properties.
chants !== unde
ned) {
				for
cons
enchant of this.properties.enchants) 

					if (enchant.id === enchantTypeMc.id) {
						currentLevel = enchant.level;

				break;
					}
				}
			}
			if (enchantTypeMc.maxL
el === 1) {
				form.components.push({
					text: `${
etty
peId(enchantTypeMc.id)} Level: 1`,
					type: "label",
			});
			} else {
				form.components
ush({
			
label: `${prettyTypeId(enchantTypeMc.id)} Level`,
			
ma

mValue: enchantTypeMc
axLevel,
					minimumValu
 1,
					options: 

						defaultValue:
urrentLevel ?? 1,
	
		},
					type: "slider",
				});
			}
		}
		form.components.push

			type: "divider",
		});
	
onst formResult: ModalFormReturnTyp
] | undefined = await showModalForm(
			form,

	this.player,
		);
		if (fo
Result === undefined)

		
etu
 Promise.resolve({ bool: false, message: "§cCancelled level selection" });
		

		formResult.shift(); // Remove formResult of e
orLabel
		formResult.pop
; // Remove divider from last index
		this.properties.en
ants = [];
	
or (let i: number = 0; i < formResul
lengt
 i++) {
			const cu
entT
e: string | undefined = selectedEnchantTypes[i];
			c
st level: ModalFormReturnType = formResult[i];
			if (currentType === undef
ed || ty
of level !== "n
ber"
{
				continue;
			}
			this.properties.enchants.push({
				id: cu
entType,
				level: level,
			});

}

return Promise.resolve({
			bo
: true,
			message: `Set Enchants to:\n${this.enchantsPropertyDis
ay()}`,
		});
	}

	private async pro
tE

nts(): Promise<string> {
		let enchantTypesResult: 
omptEnchantTypesResult = {
			message: "",
			selectedEncha
s: [],
		};
		let enchantLevelsResult: BooleanWithMe
age = {
			bool: false,
		message: "",
		};
		while (!enchantLevelsRes
t.bool) {
			enchantTyp
Resu
 = await this.promptEnchantType
enchantLevelsResult.message);
			if (enchantTypesResu
.selectedE
hants.length === 0) {
				return P
mise.resolve(enchantTypesResult.message);
			}
			enchantLevel
esu
 =

it this.promptEnchantLevels(
				enchantTypesResul
selectedEnchants,
			);
		}
		return Promise.resolve(encha
LevelsResult.message);
	}

	// Returns new 
lue
	private async prom
Enum(
		quest
n: string,
		statement
stri
,
		enumArr: string[],
		curr
tValue: string | undefined,
	): Promise<string | und
ined> {
	
et currentIndex: number = 0;
		if
currentValue !== undefined) {
			currentIndex = enumArr.indexO
cur
nt

e);
			if (currentIndex === -1) {
				currentInd
 = 0;
			}
		}
		const enumArrDisplay: string[] = enumArr.
p((value) => prettyTypeId(value));
		const
ropdown: ModalFormDropd
nComponent = 

			items: enumArrDisp
y,

	label: this.formatInputLabel(q
stion, statement, ""),
			options: {
				defaultVa
eIndex: cu
entIndex,
			},
			type: "dropd
n",
		};
		const form = this.getTemplatePromptForm([dropdown
;

co

formResult: ModalFormReturnType[] | undefined 
await showModalForm(
			form,
			this
layer,
		);
		if (formRe
lt === undefined || typeof formResult[0] !== "number") {
			return Promis
resolve(undefined);
		}
		currentIndex = 
rmRe
lt[0];
		const selectedValue: string
 undefined = enumArr[currentIndex];
		return P
mis
resolve(selectedValue);
	}

	private a
nc promptPot
nType(): Promise<
ring
{
		const newValue: string | undefined = await this.promptEnum(
			"Would yo
like to select a specific potion type?",
			"Select potion type:",
			Potions.getA
EffectTypes().map((e) => e.id),
			t
s.properties.potionType,
		)

		
 (newValue === undefined) {
			return Promise.resolve("
cPotion Type Unchanged")

		} else {
			this.propertie
potionType = 
wValue;
			return Promise.resolve(`Potion Ty
 set to:§e ${newValue}`);
		}
	}

	private async promptArrowType(): 
omise
tring> {
		const ne
alue
string | undefined = await this.promptEnum(
			"Would y
 like to select a tipped arrow?",
			"Select arrow ty
:",
			Arrow
pes,
			this.properties.arrowType,
		);
		if (n
Value
== undefined) {
			r
urn 
omise.resolve("§cArrow Type Unchanged");
		} else {

	this.properties.arrowType 
newValue;
		
eturn Promise.resolve(`Arrow Type set to:§e ${n
Value}`);
		}
	}

	private async promptBedColor(): Promise<string> {
		const n
Value
string | undefined
 awa
 this.promptEnum(
			"Would you like to select a bed color?",
			"Select bed color:"

			BedColors,
			this.properti
.bedColor,
		);
		if (newVal
 === undefined) {
			return Promis
resolve("§cBed Color Unchanged");
		} else {
			
is.properties.bedColor = newValue;
	
return Promise.resolve(`Bed Color set to:§
 ${newValue}`);
		}
	}

	private async
romptSlot(
 Promise<string> {
		
nst potentialSlotDat
 SlotData = {
			id: thi
pro
rties.slot?.id,
			keepOldItem: this.pr
erties.slot?.keepOldItem ?? SlotDataKeepOl
temDefault,
			name: this.properties.slot?.name ?? "defaul
,
		};
		if (this.commandType !== "g
ex") {
			potentialSlotData.name = SlotName.I
entory;
		}
	
onst errorLabel
Form
xtComponent = {
			text: "",
			type: "label",
		};
		const slotNa
Items: string[] = ["default"].concat(Object.value
SlotName));
		let selectedSlotNam
ndex: number = slotNameItems.index
(potentialSlotData.name);
		if (selectedSlotNameIndex 
= -1
{
			selectedSlotNameIndex = 0;
		}
		const dropdownSlotName: ModalFormDro
ownCompon
t = {
			items:
lotNa
Items,
			label: "Select Slot Nam
",
			options: {
				defaultValueIndex: select
Slot
meIndex,
				tooltip: '"defau
" option functions like the vanilla /give command',
			},
			type: "dropdown

		};
		const textFieldSlotId: ModalFormTextFie
Component = {
			label: "Enter slot
D greater than or equal to 0:",
			options: {
				defaultValue: `${p
ential
otData.id ?? ""}`,
			},
			type: "textField",
		};
		const toggleKeepOl
tem: ModalFormToggle
mponent = {
			label: "Keep old item?",
			opt
ns: {
				defaultValue: potentialSlotData.keepOldItem

				tooltip: "If true, the old 
em in the selector's slot is
iven back to them.",
			},
			type: "toggle",
		};
		// Account for extra spacing components added by template prompt form a
 errorL
el
	
et s
tNameIndex: number = 1;
		let slotIdIndex: number = 3;
		let keepOl
temIndex: number = 5;
		const inputCompon
ts: ModalFormComponent[] = [];
		
 (this.commandType === "givex") {
			inputComponents.pus
dropd
nSlotName);
			textFieldSlotId.label += " (Optional)";
		} else {
		slotNameIndex = -1;
			slotI
ndex -= 2;
			keepOldItemIndex -= 

		}
		in
tComponents.push(textFieldSlotId);
		inputComponents.push(toggleKeepOldItem);
	const form = this.getTemplatePromptForm(inputCo
onents);
		form.components.unshift(
rorLabel);
		let validationResult: BooleanWithMessage = {
			b
l: fa
e,
			message: "",
		};
		const maxStackSize: numbe
= ge
axStack
ze(this.properties.typeId) ?? 1;
		let potentialAmount: numb
 = this.properties.amount;
		while
!valid
ionResult.bool) {
			if (validatio
esult.messa
) {
				errorLabel.text = `§c${valida
onRe
lt.message}`;
			}
			const formResult: ModalFormR
urnType[] | undefined 
await showModalForm(
			form,
				this.p
yer,
			);
			if (f
mResu
 ==
undefined) {
				return Promise.resol
("§cSlot Unchanged");
			}
			if (slotNameIndex !== -1) {
				const slotNameItemsIndex: M
alFormReturnType = formResult[slotNameIndex];
				if (typeof slotNameItemsInd
 === "number") {
					if (d
pdownSlotName.options) {
			
dropdownSlotName.options.defaultValue
dex = slotNameItemsIndex;
					}
					const slotName: string 
undefined = slotNameItems[slotNameItemsIndex]

					if (slotName) {
						potential
otData.name = slotName;
					}
				}
				if (potentialSlotData.name === "default") {
				
his
roperties.slot = undefi
d;
					return Promise.resolve(
						`Set SlotName to: §edefault§6\n\n"Slot ID" and "Keep old item?" are not compatible
ith
efault, so they were ignored.`,
	
		

				}
			}
			const slotIdResult: ModalFormRetu
Type = formResult[slotIdIndex];
			if (typeof slotIdResult === "string") {

		if (textFieldSlotId.options) {
					textFie
SlotId.options.defaultValue = slotIdResult;
				}
				const slotId: number | undefined = stringToNumber(slo
dResult);
		
if (slotId !== undefined) {
					potentia
lotDa
.id = slotId;
				}
		}
		const keepOldItemResult: ModalFormReturnType = formRe
lt[keepOldItemIndex];
		
f (typeof keepOldItemResult === "boolean") {

		if (toggleKee
ldItem.options)

		
	toggleKeepOldItem.options.default
lue = keepOldItemResult;
	
	}
				potentialSlotData.keepOldItem = kee
ldIt
Result;
			}

	if (
				SlotNamesOneStackOnly.includes(po
ntialSlotData.
me) &&
				thi
properties.amount > maxStackSi

			)

		
potentialAmount = maxStackSize;
			} else {
				potentialAmount = this.prop
ties.amou
;
			}
			vali
tionR
ult = ItemPropertiesValidation.slot(
				potentialSlotData,
				this.
operties.typeId,
				potentialAmount,
				this.com
ndTy
,
			);
		}
		let adju
edSlotid: boolean = false;
		if (SlotNamesOneStackOnly.includ
(po
ntialSlotData.name) && poten
alSlotData.id !== 0) {
			// ^ None of these need a slot id greater than 0 a
th

nly have one slot
			potentialSlotData.id = 0;
	
adjustedSlotid = true;
		}
		this.properties.slot = potenti
SlotData;
		let message: string = `Set to:${this.slotPropertyDisp
y()}`;
		if (potential
ount !== this.properties.amount
{
			this.properties.
ount
 potentialAmount;
			message +
`\n\n§6Additionally reduced amount to max stack siz
 §e${this
roperties.amount}`;
		}
		if (a
ustedSlotid) {
			message += `\n\n§6Additionally reduced slot id to §e0§6, a
any
in

gher is not needed for ${this.properties.slot.name}`;
		}
		return Promise.resolve(message);
	}

	private async promptNameTag():
romise<string
{
		const question: string = "Would you like to 
ve yo
 item a custom nam
";

const statement: string = "Enter Name Tag:";
		cons
textField: ModalFormTextFieldCom
nent = {
			label: this.formatInputLabel(question, sta
ment, ""),
			options: {
				d
aultValue: this.properties.nameTag ?? "",
			},
			type: "textField",
		};
		const form
 this.getTemplatePromptForm([textField]);
		let input: string = "";
		l
 validationResult: BooleanWithMessage = {
			bool: fals

	
message: "",
		};
		while (!validationResult
ool) {
			if (textField.options) {
				textField.options.defaultValue = inpu




	
if (input) {
				textField.l
el = this.formatInputLabel(
					question,
					statement,
					valida
onResult.message,
				);
		}
			const formResult: ModalFormReturnType[] 
undefined = await showModalForm(
				fo
,
				this.player,
		);
			if (for
esult === undefine
|| t
eof formResult[0] !== "string") {
	
	return Promise.resolve("§cName Tag Uncha
ed");
			}
			inpu
= formResult[0];
			validationResult = ItemPropert
sValidation.nameTa
inpu
;
		}
		this.properties.nameTag = in
t;
		return Promise.resolve(`Name Tag set to: §e"${this.properties
ameTag}§r§e"`);
	}

	private asyn
promptLockMode(): Pr
ise<string> {
		const
ewValue: string | undefined = await this.promptEnum(
			"W
ld you like to appl
an inv
tor
lock mode to your item?",
	
"Select Lock Mode:",
			O
ect.values(ItemLockMode),
			this.prope
ies.
ckMode,
		);
		if (newValue === undefined) {
			return Promise.resolve("§cLoc
Mode Unchanged");
		} else {
			this.properties.lockMode = newVal
;
			return Promise.resolve(`Lock
ode set to:§e ${camelToTitleCase(newValue)}`);
	}
	}

	private async promptKeepO
eath(): Pr
ise<string> {
		const toggle: ModalFor
oggleComponent = {
			label: "Keep item 
 de
h?

			options: {
				defaultValue: this.
operties.keepOnDeath ?? false,
			},
			type: "toggle",
		};
		const 
rm = this.getTemplatePromp
orm([toggle]);
		// j
t for some extra spacing
		form.components.unshift({ text: "", type: "label" });
		c
st toggleIndex: number = 1;
		const result: Modal
rmReturnType[] |
ndefined = awai
showModalForm(form, t
s.pl
er);
		if (result === undefined || typeof result[toggleIndex] !==
boolean") {
			return Promise.resolve("§cKee
on Death Unchan
d");
		}
		th
.pro
rties.keepOnDeath = resul
toggleIndex];
		return Promise.re
lve(`Keep on Death set to: 
e${this.properties.keepOnDeath}`);
	}

	

	p
vate async showItemTypes(
		forPr
erty: ItemPropertyKeys.CanDestroy | ItemPropertyKeys.CanPlaceOn,
	
urrentValue
 string[],
	): Promise<"bac
 | "
dNew" | "removedType"> {
		const buttonBack: ActionFormButton = {
			addStyling: true,

	text: "Back",
			type: "button",
		};
		const buttonBackIndex: numb
 = 0;
		const buttonAddNew: Actio
ormB
ton = {
			addStyling: t
e,
			text: `Add to ${camelToTitleCase(forProperty)}`,
			
pe: 

ton",
		};
		const buttonAddNewIndex: number = 1;
		const component
 ActionFormButton[] = [buttonBack, buttonAddNew];
		for (const value of cu
entValues) {
			comp
ents.push({
				addStyling: fal
,
				text: `${prettyTypeId(value)}\n§
Click to R
ove!§r`,
				type
"button",
			});
		}
		const form: Act
nForm = {
		components: components,
			title:
temPropertiesForm.FORM_TITLE,
		};
		cons
formResult
number | undefined = await showAct
nForm(form, this.player);
		if (formResu
 === undef
ed || formResult === buttonBackIndex
{
			return Promise.resolve("back");
		} 
se if (for
esult === buttonAddNewIndex) {
			
turn Promise.resolve("addNew");
		} else 

			curren
alues.splice(formResult, 1);
			r
urn Promise.resolve("removedType");
		}
}

	priv
e async promptItemTypeAddition

		forProperty: ItemPropertyKeys.CanD
troy | Ite
ropertyKeys.CanPlaceOn,
		curren
alues: string[],
	): Promise<boolean> {
		const la
l: string = `§rEnter an item to a
 to ${camelToTitleCase(forProperty)}`;
	
onst textF
ld: ModalFormTextFieldComponent = {

	label: label,
			options: {},
			type: "t
tField",

};
		const form: ModalForm = this.g
TemplatePromptForm([textField
;
		let v
idationResult: BooleanWithMessage = 

			bool: false,
			message:
",
		};

let
nput: string = "";
		while (!val
at

esult.bool) {
			if (textField.options) {
				textField.options.defaultVa
e = input;
			}
			if (validationR
ult.message) {
				textFi
d.label = `§c${validationResult.message}\n\n${label}`;
			} 
se {
				textField.label = label;
			}
			const formResult: ModalFormReturnType[] | un
fined = showModalForm(form, this.player);
			if (f
mResult === undefined || type
 formResult[0] !== "s
ing") {
				return Promise.resolve(false);
			}
			input
 formResult[0];
			validationResult 
ItemPropertiesValid
ion.ty
Id(

		}
	}*/

	private async promptItemProperty(property: string): Promise<string> {
		le
result: string = `§cUna
e to open form for property "${property}"`;

swi
h (property) {
			case Item
opertyKeys.Amo
t:
				result =
wait this.promptAmount()

				break;
			case "location":
				result = await th
.promptLocation();
				bre
;
		
ase ItemPropertyKeys.D
ability:
				result
 await this.promptDu
bility
;
				break;
			case ItemPropertyKeys.Enchants:
				result = await this.promptEnc
nts()

				break;
			case ItemPropertyKeys.Po
onTy
:
				result = await this.promptPot
nType();
				break;
			case ItemPropertyKeys.ArrowType:
				resu
 = await this.promptArrowType();
				break;
	
case ItemPropertyKeys.BedColor:
				result = await this.p
mptBedColor();
				break;
			case ItemPropertyKeys.Slot

				result = await this.promptSlot();
				break;
			case ItemP
pertyKeys.NameTag:
				result = await this.promptName
g();
				break;
			case ItemPropertyKeys.L
kMode:
				result = await this.
omptLockMode();
				break;
		case ItemPropertyKeys.KeepOnDeath:
				result
 await this.prompt
epOnDeath();
				break;

	case ItemPropertyKeys.
nPlaceOn:
				result =
§cUnfi
shed";
				break;
			case
temProp
tyKeys.CanDestroy:
				result = "§cUnfinished";
				break;
		}
		return Pr
ise.resolve
esult);
	}

	// Returns m
sage to display o
next promptComponent form (if applicable)

rivate 
ync 
omptItemProperties(
		previousMessage: string,
	): Promise<{ message: string; promptResult: PromptResult }> {
		this.updateEdit
leProperti
();
		const itemPropertyButtons: ActionFo
Button[] = [];
		for (const property of this.editableProperties) {
			itemPropertyBut
ns.push({
				addStyling: true,
				
onPath: getItemPropertyIconP
h(property, this.properties),
			text: camelToTitleCase(property),
				t
e: "but
n",
		});
		}
		let body: string = `Select property to edit for:\n§e${prettyTypeId(t
s.properties.typeId)}`;
		i
(previousMessage) {
			body = `${previousMess
e}§r\n\n${body}`;
		}
		const form: ActionForm = {
			body
body,
			c
ponents: [
				{ type: "divider" },
				{ addStyling: true, text: "Back", t
e: "
tton" },
				...itemPropertyButtons,
				{
					addStyling: true,
					text: "Submi
,

		

e: "button",
				},
				{ tex
 `Selected Properties:\n${this.getPropertiesDisplay()}`, ty
: "label" },
			],
			title: ItemPr
ertiesForm.FORM_TITL

		};
		
nst backButtonIndex: number = 0;
		const submitButtonInde
 nu
er = itemPropertyButtons.length + 1;
		const itemProper
ButtonsOffset: number = -1;
		let selection = await showActionForm(form, thi
player);
		// Treat exiting the form and the back but
n the same.
		if (selection === undefined 
 selection === backButtonIndex) {
			const BackC
firmationResult: boolean | undefined =
				await this.propertiesBa
Con
rmation();
			if
Ba

nfirmationResult) {
				system.run(async () => {
			
const newInstance = new ItemPropertiesForm(
					this.player,
						this.openedFromInfo,
			
	this.properties.typeId,
						this.command
pe,
					);
				newInstance.run(true);
				}

				return Promise.
solv
{ message: "", promptResult: PromptResult.Closed });
	
} else {
				return Promise.resolv
{
					messa
: "",
					promptResult
Promp
esult.InProgress,
			}

			}
		} else if (select
n === submitButtonIndex) {
			return Promise.resolve({ message: ""
promptResult: Prom
Result.Completed });
	} else {
			sel
tion 
 itemPropertyButtonsOffset;
			const se
cted
tton: ActionFormButton | undefined = itemPropertyButtons[selection];
			if (
lectedButton === undefined) {
				retur
Promise.resolve({
					messag
 previousMessage,
					promptR
ult: PromptResult.InProgress,
				});
			}
			const selectedProperty: string |
ndef
ed = this.editableProperties[se
ction];
			let message: string 
"";
			if (typeof selectedProperty === "string") {
				message = await th
.promptItemProperty(selectedProperty);
			
else {
				message = `Una
e to
pen
roperty form at selection index ${selection}`;
			}
			return Promise.resolve({ message: 
ssage, promptResult: PromptRe
lt.InProgr
s }

		}
	}

	private getCommand(): string {
		let command =
/${CommandNamespace}:${this.
mmandType}`;
		if (this.commandType =
 "g
ex


			command += " @p";
		} else {
			command += ` ${commandVector3ToS
ing(this.location)}`;
		}

command += ` ${this.properties.typeId} ${this.properties.amount}

		// Remove typeId and amount from object since
hey are not part of the json

const { typeId, amount, ...cl
edData } = this.properties;
		if (Object.ke
(clonedD
a).le
th > 0) {

	let
son
string = JSON.stringify(clonedData);
			json = json.replaceAll('"', '\\"
;
			command += ` "${json}"`;
		}
		return command

	}

	private async showGeneratedCommand(): Promise<void> {
		const
ommand: string = this.getCo
and();
		const
extFie
: ModalFor
ext
eldComponent = {
			label: `\nCopy generated
ommand below:`,
			options: {

		d
aultValue: command,
			},
			type: "textF
ld",
		};
		const shareInChatToggle: Mo
lFor
oggleComponent = {
			label: "Share command in chat?",
			options: 

				defaultValue: false,
			},
			type: "toggle",
		};
		const form: ModalF
m =

			components: [textField, { type: "divider" }, shareInChatTogg
],
			submitButton: {
			
ddStyling: true,
				text: "Don
,
			

	
ti
e
ItemPropertiesForm.FORM_TITLE,
		};
		// text field default value characters start to distort at a certain length
		if (textField.options !== undefined) {
			if (command.length > 600) {
				textField.options.tooltip =
					"Characters may appear distorted but are still copyable via Ctrl+A Ctrl+C.";
			}
			if (command.length > 4096) {
				textField.options.tooltip +=
					"\nAlso command is too long to safely share in chat. Option removed.";
				// Remove send in chat toggle component
				form.components.pop();
			}
		}
		const result: ModalFormReturnType[] | undefined = await showModalForm(form, this.player);
		if (result === undefined) {
			return;
		}
		const sendInChatSelection: ModalFormReturnType = result[2];
		if (sendInChatSelection) {
			world.sendMessage(`§b${command}`);
		}
	}

	public async run(skipItemTypePrompt: boolean = false): Promise<void> {
		if (!skipItemTypePrompt) {
			const typeIdResult: PromptResult = await this.promptTypeId();
			if (typeIdResult !== PromptResult.Completed) {
				if (this.openedFromInfo) {
					system.run(async () => {
						showActionForm(FormInfo, this.player);
					});
				}
				return;
			}
		}
		const commandTypeResult: PromptResult = await this.promptCommandType();
		if (commandTypeResult !== PromptResult.Completed) {
			// Go back to typeId selection form if command type form is closed.
			system.run(async () => {
				this.run();
			});
			return;
		}
		if (this.properties.typeId === "minecraft:bed") {
			this.properties.bedColor = "white";
		}
		let componentsResult = {
			message: "",
			promptResult: PromptResult.InProgress,
		};
		while (componentsResult.promptResult === PromptResult.InProgress) {
			componentsResult = await this.promptItemProperties(componentsResult.message);
		}
		if (componentsResult.promptResult === PromptResult.Completed) {
			system.run(async () => {
				this.showGeneratedCommand();
			});
		}
	}
}
