import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubOrder from "@/models/HubOrder";
import HubReview from "@/models/HubReview";
import { getClientByUid } from "@/lib/hub/getClient";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/**
 * GET /api/hub/vendors/[id]/reviews?before=<ISO date>
 * Reviews for one shop, newest first. Reviewers show as first name only.
 * On the first page it also says whether THIS person can write a review:
 * canReview is the id of one of their delivered orders from this shop that has no review yet.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Shop not found", 404);
    await connectToDatabase();

    const before = req.nextUrl.searchParams.get("before");
    const parsed = before ? new Date(before) : null;
    const beforeDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

    const filter: Record<string, unknown> = { vendorId: params.id };
    if (beforeDate) filter.createdAt = { $lt: beforeDate };

    const rows = await HubReview.find(filter)
      .select("firebaseUid rating comment createdAt")
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE + 1)
      .lean();

    const more = rows.length > PAGE_SIZE;
    const page = more ? rows.slice(0, PAGE_SIZE) : rows;

    // First names only. If a name can't be found the review shows as "Customer".
    const nameByUid = new Map<string, string>();
    const uids = Array.from(new Set(page.map((r) => r.firebaseUid)));
    await Promise.all(
      uids.map(async (uid) => {
        try {
          const c = (await getClientByUid(uid)) as unknown as { name?: string } | null;
          const first = (c?.name ?? "").trim().split(/\s+/)[0];
          if (first) nameByUid.set(uid, first);
        } catch {
          // keep "Customer"
        }
      })
    );

    // Can this person review? Only on the first page.
    let canReview: string | null = null;
    if (!beforeDate) {
      const orders = await HubOrder.find({ firebaseUid: user.uid, vendorId: params.id, status: "delivered" })
        .select("_id")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      if (orders.length > 0) {
        const done = await HubReview.find({ orderId: { $in: orders.map((o) => o._id) } })
          .select("orderId")
          .lean();
        const doneSet = new Set(done.map((d) => String(d.orderId)));
        const next = orders.find((o) => !doneSet.has(String(o._id)));
        if (next) canReview = String(next._id);
      }
    }

    return NextResponse.json({
      reviews: page.map((r) => ({
        id: String(r._id),
        name: nameByUid.get(r.firebaseUid) ?? "Customer",
        rating: r.rating,
        comment: r.comment ?? "",
        createdAt: new Date(r.createdAt).toISOString(),
      })),
      nextBefore: more ? new Date(page[page.length - 1].createdAt).toISOString() : null,
      canReview,
    });
  } catch (e) {
    return handleError(e);
  }
}