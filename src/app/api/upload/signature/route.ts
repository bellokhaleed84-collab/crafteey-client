import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { generateUploadSignature } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    const signature = generateUploadSignature(`crafteey/jobs/${uid}`);
    return NextResponse.json(signature);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/upload/signature failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
