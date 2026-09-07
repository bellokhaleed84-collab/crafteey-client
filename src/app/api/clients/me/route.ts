import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Client from "@/models/Client";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const client = await Client.findOne({ firebaseUid: uid }).lean();

    if (!client) {
      return NextResponse.json({ error: "No client profile found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/clients/me failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
