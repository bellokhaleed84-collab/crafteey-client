import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import LegalDocument from "@/models/LegalDocument";
import { DEFAULT_TERMS, TERMS_TITLE } from "@/lib/legalDefaults";

export const dynamic = "force-dynamic";

/** GET /api/legal/terms -> the current Terms & Conditions. Public, so it can also show on sign-up. */
export async function GET() {
  try {
    await connectToDatabase();
    const doc = await LegalDocument.findOne({ slug: "terms" }).lean<{
      body: string;
      version: number;
      updatedAt?: Date;
    } | null>();

    return NextResponse.json({
      title: TERMS_TITLE,
      body: doc?.body ?? DEFAULT_TERMS,
      version: doc?.version ?? 1,
      updatedAt: doc?.updatedAt ?? null,
    });
  } catch (err) {
    console.error("GET /api/legal/terms failed:", err);
    return NextResponse.json({ error: "Couldn't load the terms." }, { status: 500 });
  }
}