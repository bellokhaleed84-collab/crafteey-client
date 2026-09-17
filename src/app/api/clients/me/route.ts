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

// Updates the caller's own client profile — used by the new editable
// Profile settings page (name/phone) and Preferences page
// (notifyEmail/notifyPush/language). Email is intentionally NOT editable
// here — changing the Firebase auth email needs re-authentication and
// goes through Firebase's client SDK directly, not this endpoint.
export async function PATCH(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => ({}));
    const { name, phone, notifyEmail, notifyPush, language } = body as {
      name?: string;
      phone?: string;
      notifyEmail?: boolean;
      notifyPush?: boolean;
      language?: string;
    };

    const update: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) update.name = name.trim();
    if (typeof phone === "string" && phone.trim()) update.phone = phone.trim();
    if (typeof notifyEmail === "boolean") update.notifyEmail = notifyEmail;
    if (typeof notifyPush === "boolean") update.notifyPush = notifyPush;
    if (typeof language === "string" && language.trim()) update.language = language.trim();

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const client = await Client.findOneAndUpdate(
      { firebaseUid: uid },
      { $set: update },
      { new: true }
    ).lean();

    if (!client) {
      return NextResponse.json({ error: "No client profile found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PATCH /api/clients/me failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}