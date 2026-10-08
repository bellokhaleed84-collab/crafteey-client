import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Banner from "@/models/Banner";

export const dynamic = "force-dynamic";

type BannerRow = {
  _id: unknown;
  title: string;
  subtitle?: string;
  buttonText?: string;
  link?: string;
  art?: string;
  emoji?: string;
  theme?: string;
};

/**
 * GET /api/banners?placement=home|hub|rides - public.
 * Only banners that are switched on and inside their schedule.
 * Old banners with no placement count as Home.
 * Home shows "home" and "both"; Hub shows "hub" and "both"; Rides shows "rides" only.
 */
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const now = new Date();
    const asked = new URL(req.url).searchParams.get("placement");
    const placement = asked === "hub" ? "hub" : asked === "rides" ? "rides" : "home";

    const placementFilter =
      placement === "hub"
        ? { placement: { $in: ["hub", "both"] } }
        : placement === "rides"
        ? { placement: "rides" }
        : { placement: { $nin: ["hub", "rides"] } };

    const rows = await Banner.find({
      enabled: true,
      ...placementFilter,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .sort({ order: 1, createdAt: 1 })
      .limit(10)
      .lean<BannerRow[]>();

    return NextResponse.json(
      {
        banners: rows.map((b) => ({
          id: String(b._id),
          title: b.title,
          subtitle: b.subtitle ?? "",
          buttonText: b.buttonText ?? "",
          link: b.link ?? "",
          art: b.art ?? "",
          emoji: b.emoji ?? "",
          theme: b.theme ?? "navy",
        })),
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("GET /api/banners failed", err);
    return NextResponse.json({ banners: [] }, { status: 500 });
  }
}