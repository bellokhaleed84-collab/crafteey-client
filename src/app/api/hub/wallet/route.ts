import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import { handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    await connectToDatabase();

    const wallet = await Wallet.findOne({ firebaseUid: user.uid }).select("balanceKobo").lean();
    const txs = await WalletTransaction.find({ firebaseUid: user.uid })
      .sort({ createdAt: -1 })
      .limit(30)
      .select("type reason amountKobo balanceAfterKobo note createdAt")
      .lean();

    return NextResponse.json({
      balanceKobo: wallet?.balanceKobo ?? 0,
      transactions: txs.map((t) => ({
        _id: String(t._id),
        type: t.type,
        reason: t.reason,
        amountKobo: t.amountKobo,
        balanceAfterKobo: t.balanceAfterKobo,
        note: t.note ?? null,
        createdAt: t.createdAt,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}