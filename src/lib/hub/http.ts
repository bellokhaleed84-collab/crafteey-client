import { NextResponse } from "next/server";
import { AuthError } from "@/middleware/auth";

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(e: unknown) {
  if (e instanceof AuthError) return fail(e.message, e.status);
  console.error("[hub]", e);
  return fail("Something went wrong. Please try again.", 500);
}
