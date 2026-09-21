import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import HubVendor from "@/models/HubVendor";
import { isHubCategory } from "@/lib/hub/config";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category");
    const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 60);
    if (category && !isHubCategory(category)) return fail("Invalid category");

    await connectToDatabase();
    const filter: Record<string, unknown> = { isActive: true };
    if (category) filter.categories = category;
    if (q) filter.name = { $regex: escapeRegex(q), $options: "i" };

    const vendors = await HubVendor.find(filter)
      .select("name description logoUrl emoji tagline filterTags rating reviewCount etaMin etaMax isOpen categories")
      .sort({ rating: -1, name: 1 }) // best rated first
      .lean();

    return NextResponse.json({ vendors });
  } catch (e) {
    return handleError(e);
  }
}
