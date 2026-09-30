import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import Wallet from "@/models/Wallet";
import WalletTopup from "@/models/WalletTopup";
import { getClientByUid } from "@/lib/hub/getClient";
import { initializeTransaction } from "@/lib/paystack";
import { WALLET_LIMITS } from "@/lib/wallet/config";
import { formatNaira } from "@/lib/hub/config";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const amountKobo = Number(body?.amountKobo);
    if (
      !Number.isInteger(amountKobo) ||
      amountKobo < WALLET_LIMITS.minTopupKobo ||
      amountKobo > WALLET_LIMITS.maxTopupKobo
    ) {
      return fail(
        `Enter an amount between ${formatNaira(WALLET_LIMITS.minTopupKobo)} and ${formatNaira(
          WALLET_LIMITS.maxTopupKobo
        )}`
      );
    }

    const client = await getClientByUid(user.uid);
    if (!client) return fail("Client account not found", 404);

    const wallet = await Wallet.findOne({ firebaseUid: user.uid }).select("balanceKobo").lean();
    if ((wallet?.balanceKobo ?? 0) + amountKobo > WALLET_LIMITS.maxBalanceKobo) {
      return fail(`Your wallet can hold up to ${formatNaira(WALLET_LIMITS.maxBalanceKobo)}`);
    }

    const reference = `wtop-${crypto.randomBytes(8).toString("hex")}`;
    await WalletTopup.create({
      reference,
      firebaseUid: user.uid,
      clientId: client._id,
      amountKobo,
      status: "pending",
    });

    const init = await initializeTransaction({
      email: client.email || user.email || "",
      amountKobo,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/dashboard/hub/wallet`,
      metadata: { source: "crafteey-wallet-topup" },
    });

    return NextResponse.json({
      accessCode: init.access_code,
      authorizationUrl: init.authorization_url,
      reference,
    });
  } catch (e) {
    return handleError(e);
  }
}