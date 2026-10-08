import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubVendor from "@/models/HubVendor";
import { isHubCategory } from "@/lib/hub/config";
import { isVisibleInCategoryBrowsing, TIER_SORT_WEIGHT, type VendorTier } from "@/lib/pricing/vendorCommission";
import { haversineKm } from "@/lib/pricing/distance";
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

    // "Near me": the app sends the phone's position. Only distances go back, never the shop coordinates.
    const lat = sp.get("lat") !== null ? Number(sp.get("lat")) : NaN;
    const lng = sp.get("lng") !== null ? Number(sp.get("lng")) : NaN;
    const hasLoc = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const nearest = sp.get("sort") === "nearest" && hasLoc;

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

    let found = await HubVendor.find(filter)
      .select(
        "name description logoUrl emoji tagline filterTags rating reviewCount etaMin etaMax isOpen categories tier lat lng"
      )
      .lean();

    // Basic-tier vendors are search-only: hidden whenever this isn't a
    // direct name search (i.e. plain browsing, with or without a category).
    if (!q) {
      found = found.filter((v) => isVisibleInCategoryBrowsing(v.tier as VendorTier));
    }

    // Add the distance, and drop the coordinates before sending.
    const vendors = found.map((v) => {
      const { lat: vLat, lng: vLng, ...rest } = v;
      const distanceKm =
        hasLoc && typeof vLat === "number" && typeof vLng === "number"
          ? Math.round(haversineKm({ lat: vLat, lng: vLng }, { lat, lng }) * 10) / 10
          : null;
      return { ...rest, distanceKm };
    });

    vendors.sort((a, b) => {
      if (nearest) {
        // Closest first. Shops with no saved location go last.
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      // Premium vendors are boosted to the top; ties broken by rating, then name.
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