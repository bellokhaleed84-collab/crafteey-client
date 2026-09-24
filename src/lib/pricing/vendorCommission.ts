/**
 * Vendor commission tiers — applied globally to a vendor's whole
 * storefront/restaurant, not per individual item/listing.
 *
 * Basic:   15% commission, search-only visibility (not in category browsing)
 * Regular: 20% commission, standard category-listing placement
 * Premium: 30% commission, featured/banner placement, frequent high placement
 */

export type VendorTier = "basic" | "regular" | "premium";

export const TIER_COMMISSION_RATE: Record<VendorTier, number> = {
  basic: 0.15,
  regular: 0.2,
  premium: 0.3,
};

export type HubVisibility = "search_only" | "standard" | "featured";

export const TIER_VISIBILITY: Record<VendorTier, HubVisibility> = {
  basic: "search_only",
  regular: "standard",
  premium: "featured",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface VendorPayoutResult {
  vendorPayout: number;
  platformVendorRevenue: number;
  commissionRate: number; // e.g. 0.2
}

export function calculateVendorPayout(itemSubtotal: number, tier: VendorTier): VendorPayoutResult {
  const rate = TIER_COMMISSION_RATE[tier];
  if (rate === undefined) {
    throw new Error(`Unknown vendor tier: ${tier}`);
  }
  if (typeof itemSubtotal !== "number" || Number.isNaN(itemSubtotal) || itemSubtotal < 0) {
    throw new Error("itemSubtotal must be a non-negative number");
  }

  const platformVendorRevenue = round2(itemSubtotal * rate);
  const vendorPayout = round2(itemSubtotal - platformVendorRevenue);

  return { vendorPayout, platformVendorRevenue, commissionRate: rate };
}

/** Sort/boost helper for Hub category listing queries. Higher = shown first. */
export const TIER_SORT_WEIGHT: Record<VendorTier, number> = {
  premium: 2,
  regular: 1,
  basic: 0, // never appears in category browsing — this weight is unused there
};

/** True if a vendor of this tier should appear in normal category browsing at all. */
export function isVisibleInCategoryBrowsing(tier: VendorTier): boolean {
  return TIER_VISIBILITY[tier] !== "search_only";
}