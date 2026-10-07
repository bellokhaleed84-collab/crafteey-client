import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import CompanyJob from "@/models/CompanyJob";
import Company from "@/models/Company";
import Review, { REVIEW_COMMENT_MAX } from "@/models/Review";
import { recomputeRating } from "@/lib/reviews";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/reviews
 * body: { sourceType: "company_job", sourceId, rating (1-5), comment? }
 * The server works out who is being reviewed from the job. The app never sends a target.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    const body = await req.json().catch(() => null);

    const sourceType = body?.sourceType;
    const sourceId = String(body?.sourceId ?? "");
    const rating = Number(body?.rating);
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

    if (sourceType !== "company_job") return fail("Reviews for this aren't available yet.");
    if (!mongoose.isValidObjectId(sourceId)) return fail("Job not found", 404);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("Pick a rating from 1 to 5 stars.");
    if (comment.length > REVIEW_COMMENT_MAX) return fail(`Keep your comment under ${REVIEW_COMMENT_MAX} characters.`);

    await connectToDatabase();

    const job = await CompanyJob.findOne({ _id: sourceId, clientUid: user.uid })
      .select("companyId status clientName")
      .lean();
    if (!job) return fail("Job not found", 404);
    if (job.status !== "completed") return fail("You can leave a review once the job is completed.", 409);

    const company = await Company.findById(job.companyId).select("businessName").lean();
    const targetId = String(job.companyId);

    try {
      await Review.create({
        reviewerUid: user.uid,
        reviewerName: job.clientName,
        targetType: "company",
        targetId,
        targetName: company?.businessName ?? "",
        sourceType: "company_job",
        sourceId,
        rating,
        comment,
      });
    } catch (e) {
      if ((e as { code?: number } | null)?.code === 11000) return fail("You've already reviewed this job.", 409);
      throw e;
    }

    await recomputeRating("company", targetId).catch((e) => console.error("[review] rating update failed", e));

    return NextResponse.json({ ok: true, review: { rating, comment } });
  } catch (e) {
    return handleError(e);
  }
}