// Options (portions, extras like beef, toppings) a vendor sets on a food or drink.
// The server uses this to price orders and the app uses it to show prices.
// Money is always in kobo. Extras are charged per plate, on top of the base price.

export interface OptionChoice {
  id: string;
  name: string;
  priceKobo: number;
  imageUrl?: string;
  /** most of this one a customer can add to a single plate */
  maxQty: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  /** the customer must choose something from this group */
  required: boolean;
  /** only one choice allowed, like a portion size */
  single: boolean;
  choices: OptionChoice[];
}

export type Selection = { choiceId: string; quantity: number };

export interface PickedOption {
  groupName: string;
  choiceName: string;
  quantity: number;
  priceKobo: number;
  imageUrl?: string;
}

export type PriceResult =
  | { ok: true; extrasKobo: number; picked: PickedOption[]; normalized: Selection[] }
  | { ok: false; error: string };

export function hasOptions(groups: OptionGroup[] | null | undefined): boolean {
  return !!groups && groups.some((g) => g.choices.length > 0);
}

/** Same food with the same options = same cart line. No options = just the product id. */
export function lineIdFor(productId: string, selections: Selection[] | null | undefined): string {
  const s = (selections ?? [])
    .filter((x) => x.quantity > 0)
    .sort((a, b) => (a.choiceId < b.choiceId ? -1 : a.choiceId > b.choiceId ? 1 : 0));
  return s.length ? productId + "::" + s.map((x) => x.choiceId + "x" + x.quantity).join("+") : productId;
}

function bad(error: string): PriceResult {
  return { ok: false, error };
}

/**
 * Checks a customer's picks against the vendor's option groups and works out
 * the extras for ONE plate. Never trust a price from the phone: the server calls
 * this with the groups it just loaded from the database.
 */
export function priceSelection(
  groups: OptionGroup[] | null | undefined,
  selections: Selection[] | null | undefined
): PriceResult {
  const gs = (groups ?? []).filter((g) => g.choices.length > 0);

  const merged = new Map<string, number>();
  for (const s of selections ?? []) {
    if (
      !s ||
      typeof s.choiceId !== "string" ||
      typeof s.quantity !== "number" ||
      !Number.isInteger(s.quantity) ||
      s.quantity < 0
    ) {
      return bad("Invalid option");
    }
    if (s.quantity === 0) continue;
    merged.set(s.choiceId, (merged.get(s.choiceId) ?? 0) + s.quantity);
  }

  const known = new Map<string, { group: OptionGroup; choice: OptionChoice }>();
  for (const g of gs) for (const c of g.choices) known.set(c.id, { group: g, choice: c });

  for (const [id, qty] of merged) {
    const hit = known.get(id);
    if (!hit) return bad("One of the options isn't available any more");
    const limit = hit.group.single ? 1 : Math.max(1, hit.choice.maxQty);
    if (qty > limit) {
      return bad(limit === 1 ? hit.choice.name + " can only be added once" : "You can add up to " + limit + " of " + hit.choice.name);
    }
  }

  let extrasKobo = 0;
  const picked: PickedOption[] = [];
  for (const g of gs) {
    let total = 0;
    for (const c of g.choices) {
      const q = merged.get(c.id) ?? 0;
      if (q <= 0) continue;
      total += q;
      extrasKobo += c.priceKobo * q;
      const p: PickedOption = { groupName: g.name, choiceName: c.name, quantity: q, priceKobo: c.priceKobo };
      if (c.imageUrl) p.imageUrl = c.imageUrl;
      picked.push(p);
    }
    if (g.single && total > 1) return bad("Pick only one " + g.name);
    if (g.required && total < 1) return bad("Choose " + g.name);
  }

  const normalized: Selection[] = Array.from(merged, ([choiceId, quantity]) => ({ choiceId, quantity })).sort((a, b) =>
    a.choiceId < b.choiceId ? -1 : a.choiceId > b.choiceId ? 1 : 0
  );

  return { ok: true, extrasKobo, picked, normalized };
}