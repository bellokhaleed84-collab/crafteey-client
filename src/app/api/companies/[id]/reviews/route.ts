import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import Review from "@/models/Review";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/**
 * GET /api/companies/[id]/reviews?before=<ISO date>
 * Published reviews for one company, newest first. Reviewers show as first name only.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Company not found", 404);
    await connectToDatabase();

    const before = req.nextUrl.searchParams.get("before");
    const beforeDate = before ? new Date(before) : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { targetType: "company", targetId: params.id, status: "published" };
    if (beforeDate && !Number.isNaN(beforeDate.getTime())) filter.createdAt = { $lt: beforeDate };

    const rows = await Review.find(filter)
      .select("reviewerName rating comment createdAt")
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE + 1)
      .lean();

    const more = rows.length > PAGE_SIZE;
    const page = more ? rows.slice(0, PAGE_SIZE) : rows;

    return NextResponse.json({
      reviews: page.map((r) => ({
        id: String(r._id),
        name: (r.reviewerName || "Customer").trim().split(/\s+/)[0],
        rating: r.rating,
        comment: r.comment,
        createdAt: new Date(r.createdAt).toISOString(),
      })),
      nextBefore: more ? new Date(page[page.length - 1].createdAt).toISOString() : null,
    });
  } catch (e) {
    return handleError(e);
  }
}