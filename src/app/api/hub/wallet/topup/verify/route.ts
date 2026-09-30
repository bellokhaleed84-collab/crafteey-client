import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import Wallet from "@/models/Wallet";
import WalletTopup from "@/models/WalletTopup";
import { settleWalletTopup } from "@/lib/wallet";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

// Called by the wallet page right after the Paystack popup reports success.
// Safe to call more than once: the credit only ever applies once.
export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const reference = typeof body?.reference === "string" ? body.reference : "";
    if (!reference.startsWith("wtop-")) return fail("Invalid reference");

    // Only the customer who started the top-up can settle it.
    const topup = await WalletTopup.findOne({ reference, firebaseUid: user.uid }).select("_id").lean();
    if (!topup) return fail("Top-up not found", 404);

    const result = await settleWalletTopup(reference);
    if (!result.ok) {
      return fail("We haven't confirmed your payment yet. Your balance will update once we do.", 409);
    }

    const wallet = await Wallet.findOne({ firebaseUid: user.uid }).select("balanceKobo").lean();
    return NextResponse.json({ balanceKobo: wallet?.balanceKobo ?? 0 });
  } catch (e) {
    return handleError(e);
  }
}