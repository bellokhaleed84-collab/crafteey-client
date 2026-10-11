import { formatNaira } from "@/lib/hub/config";

// The ONE place that works out promotion discounts. Pure functions, money in kobo.
// The server uses this to price orders; the screens use it to show the same numbers.
// Rules: the best promotion wins per plate line, promotions never stack,
// and a discount can never be more than the line itself.

export const MAX_PERCENT = 90;

export type PromoType = "percent" | "amount" | "buy_get";

export interface PromoLite {
  _id: string;
  type: PromoType;
  percent?: number;
  amountOffKobo?: number;
  buyQty?: number;
  freeQty?: number;
  scope: "all" | "products";
  productIds: string[];
  label: string;
}

export function promoLabel(p: {
  type: PromoType;
  percent?: number;
  amountOffKobo?: number;
  buyQty?: number;
  freeQty?: number;
}): string {
  if (p.type === "percent") return `${p.percent ?? 0}% off`;
  if (p.type === "amount") return `${formatNaira(p.amountOffKobo ?? 0)} off`;
  return `Buy ${p.buyQty ?? 0} get ${p.freeQty ?? 0} free`;
}

export function appliesTo(p: PromoLite, productId: string): boolean {
  return p.scope === "all" || p.productIds.includes(productId);
}

/**
 * Total discount for ONE cart line: `quantity` plates, each costing `unitKobo`
 * (extras included). Buy X get Y free works per line: every (X+Y) plates, Y are free.
 */
export function discountForLine(p: PromoLite, unitKobo: number, quantity: number): number {
  if (!(unitKobo > 0) || !(quantity > 0)) return 0;

  if (p.type === "percent") {
    const pct = Math.min(Math.max(p.percent ?? 0, 0), MAX_PERCENT);
    return Math.round((unitKobo * pct) / 100) * quantity;
  }

  if (p.type === "amount") {
    const off = Math.min(Math.max(Math.round(p.amountOffKobo ?? 0), 0), unitKobo);
    return off * quantity;
  }

  const buy = p.buyQty ?? 0;
  const free = p.freeQty ?? 0;
  if (buy < 1 || free < 1) return 0;
  const groups = Math.floor(quantity / (buy + free));
  return groups * free * unitKobo;
}

export interface LineDiscount {
  discountKobo: number;
  label: string;
  promoId: string;
}

/** The best promotion for one cart line, or null if none applies. */
export function bestForLine(
  promos: PromoLite[],
  productId: string,
  unitKobo: number,
  quantity: number
): LineDiscount | null {
  let best: LineDiscount | null = null;
  for (const p of promos) {
    if (!appliesTo(p, productId)) continue;
    const d = discountForLine(p, unitKobo, quantity);
    if (d > 0 && (!best || d > best.discountKobo)) {
      best = { discountKobo: d, label: p.label, promoId: p._id };
    }
  }
  return best;
}