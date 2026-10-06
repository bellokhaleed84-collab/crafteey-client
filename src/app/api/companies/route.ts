import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Company from "@/models/Company";

export const dynamic = "force-dynamic";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/companies?q=&trade=&area=&price=&online=1&sort=best|rating|experience
 * Approved companies with only the details customers may see (no phone, email or documents).
 * Also returns the trades and areas that exist, for the filter lists.
 */
export async function GET(req: NextRequest) {
  try {
    await verifyToken(req);
    await connectToDatabase();

    const p = req.nextUrl.searchParams;
    const q = (p.get("q") ?? "").trim().slice(0, 60);
    const trade = (p.get("trade") ?? "").trim();
    const area = (p.get("area") ?? "").trim();
    const price = (p.get("price") ?? "").trim();
    const online = p.get("online") === "1";
    const sortKey = p.get("sort") ?? "best";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { status: "approved" };
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ businessName: rx }, { description: rx }];
    }
    if (trade) filter.trades = trade;
    if (area) filter.areas = area;
    if (["low", "mid", "high"].includes(price)) filter.priceRange = price;
    if (online) filter.isOnline = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sort: any = { isOnline: -1, verified: -1, rating: -1, ratingCount: -1 };
    if (sortKey === "rating") sort = { rating: -1, ratingCount: -1 };
    if (sortKey === "experience") sort = { yearsOperating: -1, rating: -1 };

    const [companies, trades, areas] = await Promise.all([
      Company.find(filter)
        .select(
          "businessName logoUrl trades areas description priceRange rating ratingCount verified yearsOperating isOnline"
        )
        .sort(sort)
        .limit(60)
        .lean(),
      Company.distinct("trades", { status: "approved" }),
      Company.distinct("areas", { status: "approved" }),
    ]);

    return NextResponse.json({
      companies,
      facets: { trades: [...trades].sort(), areas: [...areas].sort() },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/companies failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}