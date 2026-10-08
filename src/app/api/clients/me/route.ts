import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Client from "@/models/Client";
import { isAvatarKey } from "@/lib/avatars";

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

// Updates the caller's own client profile: name/phone, preferences
// (notifyEmail/notifyPush/language), avatar, and saved addresses. Email is
// intentionally NOT editable here: changing the Firebase auth email needs
// re-authentication and goes through Firebase's client SDK directly.
export async function PATCH(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => ({}));
    const { name, phone, notifyEmail, notifyPush, language, addresses, avatar } = body as {
      name?: string;
      phone?: string;
      notifyEmail?: boolean;
      notifyPush?: boolean;
      language?: string;
      avatar?: unknown;
      addresses?: { label?: unknown; address?: unknown }[];
    };

    const update: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) update.name = name.trim();
    if (typeof phone === "string" && phone.trim()) update.phone = phone.trim();
    if (typeof notifyEmail === "boolean") update.notifyEmail = notifyEmail;
    if (typeof notifyPush === "boolean") update.notifyPush = notifyPush;
    if (typeof language === "string" && language.trim()) update.language = language.trim();

    // Avatar: one of the 10 built-in keys, or "" to go back to initials.
    if (avatar !== undefined) {
      if (avatar === "" || isAvatarKey(avatar)) {
        update.avatar = avatar;
      } else {
        return NextResponse.json({ error: "That avatar isn't available." }, { status: 400 });
      }
    }

    // Saved addresses: capped at 10, each trimmed and length-limited.
    // Entries missing a label or address are dropped.
    if (Array.isArray(addresses)) {
      if (addresses.length > 10) {
        return NextResponse.json(
          { error: "You can save up to 10 addresses." },
          { status: 400 }
        );
      }
      update.addresses = addresses
        .filter((a) => typeof a?.label === "string" && typeof a?.address === "string")
        .map((a) => ({
          label: (a.label as string).trim().slice(0, 30),
          address: (a.address as string).trim().slice(0, 300),
        }))
        .filter((a) => a.label && a.address);
    }

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