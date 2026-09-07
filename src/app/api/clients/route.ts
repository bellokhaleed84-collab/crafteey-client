import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Client from "@/models/Client";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json();
    const { name, email, phone } = body as { name?: string; email?: string; phone?: string };

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "name, email, and phone are required" },
        { status: 400 }
      );
    }

    const existing = await Client.findOne({ firebaseUid: uid });
    if (existing) {
      return NextResponse.json({ client: existing }, { status: 200 });
    }

    const client = await Client.create({ firebaseUid: uid, name, email, phone });
    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/clients failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
