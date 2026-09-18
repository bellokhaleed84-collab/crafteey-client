import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

// Uses the same import names as crafteey-client. If the technician app exports different names from
// lib/mongodb or middleware/auth, change only these import lines and the connectToDatabase() call.
// Still assumed: models/Job exists with technicianUid and status fields.
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth"; // must return the decoded Firebase token ({ uid })
import Job from "@/models/Job"; // needs fields: technicianUid, status
import JobVerification from "@/models/JobVerification";

import {
  START_ALLOWED_STATUSES,
  computeDurationSeconds,
  formatDuration,
  hashToken,
  parsePayload,
} from "@/lib/jobVerification";

// Loosely typed handle on the Job model so status values like "in_progress" and "completed"
// do not clash with your Job schema's TypeScript types. Add "in_progress" to the schema enum too.
const JobModel = Job as unknown as mongoose.Model<Record<string, unknown>>;

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function handleError(err: unknown) {
  const e = err as { status?: number; statusCode?: number; message?: string };
  const status = e?.status ?? e?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    return fail(e.message || "Not allowed", status);
  }
  console.error("[job-verify]", err);
  return fail("Something went wrong. Please try again.", 500);
}

/**
 * POST { payload: "CQ1.S.xxxx" | "CQ1.C.xxxx" }
 *
 * The technician app just sends whatever the scanner read. The SERVER decides what it means.
 * Times are always taken from the server clock (new Date()), never from the request body.
 *
 * Enforced here, independent of any UI:
 *  - only the technician assigned to this job can scan
 *  - a completion scan is rejected unless a start scan was already recorded
 *  - a completion scan is rejected unless the job is in progress
 *  - each token works once, and only until it expires
 */
export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const decoded = await verifyToken(req);

    if (!mongoose.isValidObjectId(params.id)) return fail("Job not found", 404);

    const body = await req.json().catch(() => null);
    const parsed = parsePayload(body?.payload);
    if (!parsed) return fail("That is not a valid Crafteey code.", 400);

    await connectToDatabase();

    const job = await JobModel.findById(params.id).lean<{
      _id: mongoose.Types.ObjectId;
      technicianUid?: string | null;
      status: string;
    }>();
    if (!job) return fail("Job not found", 404);
    if (job.technicianUid !== decoded.uid) return fail("This job is not assigned to you.", 403);

    const tokenHash = hashToken(parsed.token);

    // ---------------------------------------------------------------- START
    if (parsed.stage === "start") {
      if (!(START_ALLOWED_STATUSES as readonly string[]).includes(job.status)) {
        return fail(
          job.status === "in_progress"
            ? "This job has already started."
            : "This job cannot be started right now.",
          409
        );
      }

      const now = new Date(); // server time

      const started = await JobVerification.findOneAndUpdate(
        {
          jobId: job._id,
          startTokenHash: tokenHash,
          startTokenExpiresAt: { $gt: now },
          startedAt: null, // single use
        },
        {
          $set: {
            startedAt: now,
            startedByUid: decoded.uid,
            startTokenHash: null,
            startTokenExpiresAt: null,
          },
        },
        { new: true }
      ).lean();

      if (!started) {
        return fail("This code is expired or already used. Ask the client to show a fresh one.", 400);
      }

      await JobModel.updateOne(
        { _id: job._id, status: { $in: [...START_ALLOWED_STATUSES] } },
        { $set: { status: "in_progress" } }
      );

      return NextResponse.json({
        ok: true,
        stage: "start",
        startedAt: now.toISOString(),
      });
    }

    // ------------------------------------------------------------- COMPLETE
    const v = await JobVerification.findOne({ jobId: job._id }).lean();

    // The core rule: no start record, no completion. Checked on the server every time.
    if (!v?.startedAt) {
      return fail("Scan the START code first. The job has not been started yet.", 409);
    }
    if (v.completedAt) return fail("This job is already completed.", 409);
    if (job.status !== "in_progress") {
      return fail("This job is not in progress.", 409);
    }

    const now = new Date(); // server time
    const durationSeconds = computeDurationSeconds(v.startedAt, now);

    const completed = await JobVerification.findOneAndUpdate(
      {
        jobId: job._id,
        completeTokenHash: tokenHash,
        completeTokenExpiresAt: { $gt: now },
        startedAt: v.startedAt, // still the same start record we read
        completedAt: null, // single use
      },
      {
        $set: {
          completedAt: now,
          completedByUid: decoded.uid,
          durationSeconds,
          completeTokenHash: null,
          completeTokenExpiresAt: null,
        },
      },
      { new: true }
    ).lean();

    if (!completed) {
      return fail("This code is expired or already used. Ask the client to show a fresh one.", 400);
    }

    await JobModel.updateOne({ _id: job._id, status: "in_progress" }, { $set: { status: "completed" } });

    return NextResponse.json({
      ok: true,
      stage: "complete",
      startedAt: v.startedAt.toISOString(),
      completedAt: now.toISOString(),
      durationSeconds,
      durationLabel: formatDuration(durationSeconds),
    });
  } catch (err) {
    return handleError(err);
  }
}