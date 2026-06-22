import type { BooleanWithMessage, EnchantData, ItemDurability, SlotData } from "./types";

export class GivexProperties {
	public typeId: string;
	public amount: number;
	public lockMode?: string; // ItemLockMode,
	public nameTag?: string;
	// Must be less than the item's max durability, or the str "unbreakable" to for infinite durability
	public durability?: ItemDurability;
	// Dyeable component simply doesn't exist on vanilla items. (Bug tracker MCPE-237577 and MCPE-232617)
	// public dye?: RGB;
	public enchants?: EnchantData[];
	public slot: SlotData | undefined;
	public potionType?: string;
	public arrowType?: string;
	public bedColor?: string;
	public keepOnDeath?: boolean;
	public canPlaceOn?: string[];
	public canDestroy?: string[];
	constructor(typeId: string, amount: number, json?: string) {
		this.typeId = typeId;
		this.amount = amount;
	}

	private parseJson(json: string): BooleanWithMessage {
		let p
		try {

		}
	}
}
