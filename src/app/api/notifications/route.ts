import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

// GET /api/notifications            -> latest 50 + unreadCount
// GET /api/notifications?countOnly=1 -> just { unreadCount } (used by the bell)
export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const unreadCount = await Notification.countDocuments({ clientUid: uid, read: false });

    if (req.nextUrl.searchParams.get("countOnly")) {
      return NextResponse.json({ unreadCount });
    }

    const notifications = await Notification.find({ clientUid: uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/notifications failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH { id } marks one as read, PATCH { all: true } marks all as read.
export async function PATCH(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => ({}));

    if (body.all === true) {
      await Notification.updateMany({ clientUid: uid, read: false }, { $set: { read: true } });
    } else if (typeof body.id === "string") {
      await Notification.updateOne({ _id: body.id, clientUid: uid }, { $set: { read: true } });
    } else {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const unreadCount = await Notification.countDocuments({ clientUid: uid, read: false });
    return NextResponse.json({ unreadCount });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PATCH /api/notifications failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}