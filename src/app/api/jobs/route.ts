import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Job from "@/models/Job";
import Client from "@/models/Client";
import { TRADE_OPTIONS, ISSUE_SUGGESTIONS, OTHER_ISSUE, JOB_STATUS, type Trade } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const client = await Client.findOne({ firebaseUid: uid });
    if (!client) {
      return NextResponse.json(
        { error: "Complete your client profile before posting a job" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { category, issueType, description, area, photoUrls, videoUrls } = body as {
      category?: string;
      issueType?: string;
      description?: string;
      area?: string;
      photoUrls?: string[];
      videoUrls?: string[];
    };

    if (!category || !(TRADE_OPTIONS as readonly string[]).includes(category)) {
      return NextResponse.json({ error: "A valid category/trade is required" }, { status: 400 });
    }

    const validIssues = [...ISSUE_SUGGESTIONS[category as Trade], OTHER_ISSUE];
    if (!issueType || !validIssues.includes(issueType)) {
      return NextResponse.json({ error: "A valid issue type is required" }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }
    if (!area) {
      return NextResponse.json({ error: "area is required" }, { status: 400 });
    }

    const job = await Job.create({
      clientUid: uid,
      clientName: client.name,
      clientPhone: client.phone,
      category,
      issueType,
      description,
      area,
      photoUrls: photoUrls ?? [],
      videoUrls: videoUrls ?? [],
      status: JOB_STATUS.PENDING,
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/jobs failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
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