import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubVendor from "@/models/HubVendor";
import { isHubCategory } from "@/lib/hub/config";
import { isVisibleInCategoryBrowsing, TIER_SORT_WEIGHT, type VendorTier } from "@/lib/pricing/vendorCommission";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const category = sp.get("category");
    const q = (sp.get("q") || "").trim().slice(0, 60);
    const openOnly = sp.get("openOnly") === "true";
    const minRating = sp.get("minRating") ? Number(sp.get("minRating")) : null;
    const maxEta = sp.get("maxEta") ? Number(sp.get("maxEta")) : null;
    const tag = sp.get("tag");

    if (category && !isHubCategory(category)) return fail("Invalid category");
    if (minRating !== null && (Number.isNaN(minRating) || minRating < 0 || minRating > 5)) {
      return fail("Invalid minRating");
    }
    if (maxEta !== null && (Number.isNaN(maxEta) || maxEta < 0)) return fail("Invalid maxEta");

    await connectToDatabase();
    const filter: Record<string, unknown> = { isActive: true };
    if (category) filter.categories = category;
    if (q) filter.name = { $regex: escapeRegex(q), $options: "i" };
    if (openOnly) filter.isOpen = true;
    if (minRating !== null) filter.rating = { $gte: minRating };
    if (maxEta !== null) filter.etaMax = { $lte: maxEta };
    if (tag) filter.filterTags = tag;

    let vendors = await HubVendor.find(filter)
      .select(
        "name description logoUrl emoji tagline filterTags rating reviewCount etaMin etaMax isOpen categories tier"
      )
      .lean();

    // Basic-tier vendors are search-only: hidden whenever this isn't a
    // direct name search (i.e. plain browsing, with or without a category).
    if (!q) {
      vendors = vendors.filter((v) => isVisibleInCategoryBrowsing(v.tier as VendorTier));
    }

    // Premium vendors are boosted to the top; ties broken by rating, then name.
    vendors.sort((a, b) => {
      const weightDiff = TIER_SORT_WEIGHT[b.tier as VendorTier] - TIER_SORT_WEIGHT[a.tier as VendorTier];
      if (weightDiff !== 0) return weightDiff;
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ vendors });
  } catch (e) {
    return handleError(e);
  }
}