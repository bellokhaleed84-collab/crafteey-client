import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { FieldValue } from "firebase-admin/firestore";
import { connectToDatabase } from "@/lib/mongodb";
import { adminDb } from "@/lib/firebase/adminApp";
import { verifyToken } from "@/middleware/auth";
import Quote from "@/models/Quote";
import { effectiveStatus, quoteBlockMessage } from "@/lib/quoteShared";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

/** POST /api/quotes/[id]/decline : the customer says no. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Invalid quotation id");
    await connectToDatabase();

    const quote = await Quote.findOne({ _id: params.id, clientUid: user.uid });
    if (!quote) return fail("Quotation not found", 404);

    const status = effectiveStatus(quote);
    if (status !== "sent") return fail(quoteBlockMessage(status), 409);

    const updated = await Quote.findOneAndUpdate(
      { _id: quote._id, clientUid: user.uid, status: "sent", expiresAt: { $gt: new Date() } },
      { $set: { status: "declined", statusAt: new Date() } },
      { new: true }
    );
    if (!updated) return fail("This quotation can't be declined any more.", 409);

    try {
      const ref = adminDb.collection("conversations").doc(quote.conversationId);
      const text = `Customer declined: ${quote.title}`;
      const batch = adminDb.batch();
      batch.set(ref.collection("messages").doc(), {
        senderUid: "system",
        senderRole: "system",
        type: "system",
        quoteId: String(quote._id),
        text,
        createdAt: FieldValue.serverTimestamp(),
      });
      batch.update(ref, {
        lastMessage: text.slice(0, 120),
        lastMessageAt: FieldValue.serverTimestamp(),
        lastSenderRole: "system",
        unreadCompany: FieldValue.increment(1),
      });
      await batch.commit();
    } catch (e) {
      console.error("quote decline notice failed", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}