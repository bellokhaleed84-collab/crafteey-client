import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Job from "@/models/Job";

// Clients no longer post jobs. They pick a company on the Technicians page
// and chat with it. Old jobs can still be read.
export async function POST() {
  return NextResponse.json(
    { error: "Posting jobs is no longer available. Choose a company on the Technicians page." },
    { status: 410 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const jobs = await Job.find({ clientUid: uid }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ jobs });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/jobs failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}