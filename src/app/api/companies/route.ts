import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Company from "@/models/Company";

export const dynamic = "force-dynamic";

/** GET /api/companies. Approved companies, with only the details customers may see. */
export async function GET(req: NextRequest) {
  try {
    await verifyToken(req);
    await connectToDatabase();
    const companies = await Company.find({ status: "approved" })
      .select("businessName logoUrl trades areas description priceRange rating ratingCount verified yearsOperating isOnline")
      .sort({ verified: -1, rating: -1 })
      .limit(60)
      .lean();
    return NextResponse.json({ companies });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/companies failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}