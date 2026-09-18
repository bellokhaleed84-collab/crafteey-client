import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

// Imports match crafteey-client: connectToDatabase (lib/mongodb) and verifyToken/AuthError (middleware/auth).
// Still assumed: models/Job exists with clientUid, technicianUid and status fields.
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth"; // must return the decoded Firebase token ({ uid })
import Job from "@/models/Job"; // needs fields: clientUid, technicianUid, status
import JobVerification from "@/models/JobVerification";

import {
  QR_TTL_MS,
  QR_VISIBLE_STATUSES,
  buildPayload,
  formatDuration,
  generateToken,
  hashToken,
} from "@/lib/jobVerification";

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
  console.error("[job-qr]", err);
  return fail("Something went wrong. Please try again.", 500);
}

/** Loads the job and makes sure it belongs to the signed-in client. */
async function loadOwnedJob(req: NextRequest, id: string) {
  const decoded = await verifyToken(req);
  if (!mongoose.isValidObjectId(id)) return { error: fail("Job not found", 404) };

  await connectToDatabase();
  const job = await Job.findById(id).lean<{
    _id: mongoose.Types.ObjectId;
    clientUid?: string;
    status: string;
  }>();

  if (!job) return { error: fail("Job not found", 404) };
  if (job.clientUid !== decoded.uid) return { error: fail("This is not your job", 403) };
  return { job };
}

/**
 * GET  -> current state (which stage is active, timestamps, duration). Never returns a token.
 * The client screen polls this so it flips to Step 2 the moment the technician scans Step 1.
 */
export async function GET(req: NextRequest, { params }: RouteCtx) {
  try {
    const { job, error } = await loadOwnedJob(req, params.id);
    if (error) return error;

    const v = await JobVerification.findOne({ jobId: job!._id }).lean();

    const stage = v?.completedAt ? "done" : v?.startedAt ? "complete" : "start";

    return NextResponse.json({
      stage,
      jobStatus: job!.status,
      qrAvailable:
        stage === "done"
          ? false
          : (QR_VISIBLE_STATUSES as readonly string[]).includes(job!.status),
      startedAt: v?.startedAt ?? null,
      completedAt: v?.completedAt ?? null,
      durationSeconds: v?.durationSeconds ?? null,
      durationLabel:
        typeof v?.durationSeconds === "number" ? formatDuration(v.durationSeconds) : null,
      serverNow: new Date().toISOString(),
    });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST -> issue a fresh QR for whichever stage is currently active.
 * Issuing a new token invalidates the previous one for that stage.
 *
 * Backend rule: the completion token can only be created when startedAt already exists.
 * A client cannot request it early by calling this route directly.
 */
export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const { job, error } = await loadOwnedJob(req, params.id);
    if (error) return error;

    if (!(QR_VISIBLE_STATUSES as readonly string[]).includes(job!.status)) {
      return fail("A code is not needed for this job right now.", 409);
    }

    // Make sure the verification document exists (safe to call repeatedly).
    await JobVerification.updateOne(
      { jobId: job!._id },
      { $setOnInsert: { jobId: job!._id } },
      { upsert: true }
    );

    const v = await JobVerification.findOne({ jobId: job!._id }).lean();
    if (v?.completedAt) return fail("This job is already completed.", 409);

    const stage = v?.startedAt ? "complete" : "start";
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + QR_TTL_MS);

    let matched = 0;

    if (stage === "start") {
      const res = await JobVerification.updateOne(
        { jobId: job!._id, startedAt: null },
        { $set: { startTokenHash: tokenHash, startTokenExpiresAt: expiresAt } }
      );
      matched = res.matchedCount;
    } else {
      // Only matches if the start scan has really happened and the job is not finished.
      const res = await JobVerification.updateOne(
        { jobId: job!._id, startedAt: { $ne: null }, completedAt: null },
        { $set: { completeTokenHash: tokenHash, completeTokenExpiresAt: expiresAt } }
      );
      matched = res.matchedCount;
    }

    if (matched === 0) {
      return fail("The job changed while loading. Please refresh.", 409);
    }

    return NextResponse.json({
      stage,
      payload: buildPayload(stage, token),
      expiresAt: expiresAt.toISOString(),
      serverNow: new Date().toISOString(),
    });
  } catch (err) {
    return handleError(err);
  }
}