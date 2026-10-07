import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken, AuthError } from "@/middleware/auth";
import CompanyJob from "@/models/CompanyJob";
import Company from "@/models/Company";
import Quote from "@/models/Quote";

export const dynamic = "force-dynamic";

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);

/** GET /api/company-jobs/[id] : one job, for the customer who paid for it. No phone numbers. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { uid } = await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    await connectToDatabase();

    const job = await CompanyJob.findOne({ _id: params.id, clientUid: uid }).lean();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const company = await Company.findById(job.companyId).select("businessName").lean();
    const quotes = await Quote.find({ _id: { $in: job.quoteIds }, status: "paid" })
      .select("title totalKobo kind")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      job: {
        id: String(job._id),
        conversationId: job.conversationId,
        title: job.title,
        description: job.description,
        area: job.area,
        status: job.status,
        companyName: company?.businessName ?? "Company",
        workerName: job.workerName ?? null,
        confirmedAt: iso(job.createdAt),
        onTheWayAt: iso(job.onTheWayAt),
        arrivedAt: iso(job.arrivedAt),
        completedAt: iso(job.completedAt),
        paidKobo: quotes.reduce((s, q) => s + q.totalKobo, 0),
        payments: quotes.map((q) => ({ title: q.title, kind: q.kind, totalKobo: q.totalKobo })),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("company job read error", err);
    return NextResponse.json({ error: "Couldn't load this job." }, { status: 500 });
  }
}