import { adminDb } from "@/lib/firebase/adminApp";
import { connectToDatabase } from "@/lib/mongodb";
import Company from "@/models/Company";
import CompanyStaff from "@/models/CompanyStaff";
import { AuthError } from "@/middleware/auth";

export type ChatRole = "client" | "company";

/** Loads a conversation and checks this person is in it. Anyone else gets "not found". */
export async function getConversationForUser(conversationId: string, uid: string) {
  if (!conversationId || conversationId.includes("/")) throw new AuthError("Chat not found", 404);
  const ref = adminDb.collection("conversations").doc(conversationId);
  const snap = await ref.get();
  const data = snap.data();
  if (!data || !Array.isArray(data.participantUids) || !data.participantUids.includes(uid)) {
    throw new AuthError("Chat not found", 404);
  }
  const role: ChatRole = data.clientUid === uid ? "client" : "company";
  return { ref, data, role };
}

/** The company owner's uid plus every ACTIVE staff member's uid. */
export async function companyUids(companyId: string): Promise<string[]> {
  await connectToDatabase();
  const company = await Company.findById(companyId).select("uid").lean();
  if (!company) return [];
  const staff = await CompanyStaff.find({
    companyId,
    status: "active",
    staffUid: { $exists: true },
  })
    .select("staffUid")
    .lean();
  return [company.uid, ...staff.map((s) => s.staffUid as string).filter(Boolean)];
}