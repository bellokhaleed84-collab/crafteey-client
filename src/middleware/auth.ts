import { type NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/adminApp";

export interface VerifiedUser {
  uid: string;
  email: string | undefined;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the Authorization: Bearer <idToken> header against Firebase.
 * Does NOT check for a Client Mongo document — some routes (like creating
 * the client profile itself) are called before that document exists.
 * Routes that need an existing profile should look it up themselves.
 */
export async function verifyToken(req: NextRequest): Promise<VerifiedUser> {
  const authHeader = req.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AuthError("Missing or malformed Authorization header", 401);
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    throw new AuthError("Invalid or expired token", 401);
  }
}
