import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import mongoose from "mongoose";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { adminDb } from "@/lib/firebase/adminApp";
import Client from "@/models/Client";
import Company from "@/models/Company";
import CompanyRequest from "@/models/CompanyRequest";
import BlockedMessage from "@/models/BlockedMessage";
import { companyUids } from "@/lib/chatAccess";
import { checkMessage } from "@/lib/contactLock";

export const dynamic = "force-dynamic";

const MAX_OPEN_PER_COMPANY = 3;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/chat/start  body: { companyId, title, description, area }
 * Creates the request and opens the chat. The description becomes the first message.
 */
export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const client = await Client.findOne({ firebaseUid: uid }).lean();
    if (!client) return bad("Complete your profile first.", 403);

    const body = await req.json().catch(() => null);
    if (!body) return bad("Invalid request body");

    const companyId = String(body.companyId ?? "");
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const area = String(body.area ?? "").trim();

    if (!mongoose.isValidObjectId(companyId)) return bad("Company not found.", 404);
    if (title.length < 3 || title.length > 80) return bad("Tell us what you need (3 to 80 characters).");
    if (description.length < 10 || description.length > 600) {
      return bad("Describe the job in 10 to 600 characters.");
    }
    if (area.length < 3 || area.length > 200) return bad("Enter the area or address.");

    for (const [field, value] of [["title", title], ["description", description], ["area", area]]) {
      const result = checkMessage(value);
      if (result.blocked) {
        await BlockedMessage.create({
          uid,
          role: "client",
          conversationId: "request-form",
          companyId,
          text: `[${field}] ${value}`.slice(0, 1000),
          reason: result.reason,
        }).catch((e) => console.error("blocked log failed", e));
        return NextResponse.json(
          {
            error: "Your request can't include phone numbers, emails, links or payment details. Keep everything in Crafteey chat.",
            blocked: true,
          },
          { status: 422 }
        );
      }
    }

    const company = await Company.findOne({ _id: companyId, status: "approved" })
      .select("businessName")
      .lean();
    if (!company) return bad("This company isn't available right now.", 404);

    const openCount = await CompanyRequest.countDocuments({ clientUid: uid, companyId, status: "open" });
    if (openCount >= MAX_OPEN_PER_COMPANY) {
      return bad("You already have open requests with this company. Open one of your chats.", 429);
    }

    const uids = await companyUids(companyId);
    if (uids.length === 0) return bad("This company can't take requests right now.", 409);

    const convRef = adminDb.collection("conversations").doc();
    const request = await CompanyRequest.create({
      clientUid: uid,
      clientName: client.name,
      companyId,
      title,
      description,
      area,
      conversationId: convRef.id,
    });

    try {
      const batch = adminDb.batch();
      batch.set(convRef, {
        clientUid: uid,
        clientName: client.name,
        companyId,
        companyName: company.businessName,
        requestId: String(request._id),
        requestTitle: title,
        participantUids: Array.from(new Set([uid, ...uids])),
        status: "open",
        lastMessage: description.slice(0, 120),
        lastMessageAt: FieldValue.serverTimestamp(),
        lastSenderRole: "client",
        unreadCompany: 1,
        unreadClient: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
      batch.set(convRef.collection("messages").doc(), {
        senderUid: uid,
        senderRole: "client",
        type: "text",
        text: description,
        createdAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      await CompanyRequest.deleteOne({ _id: request._id });
      throw err;
    }

    return NextResponse.json({ conversationId: convRef.id, requestId: String(request._id) }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return bad(err.message, err.status);
    console.error("POST /api/chat/start failed:", err);
    return bad("Couldn't start the chat. Try again.", 500);
  }
}