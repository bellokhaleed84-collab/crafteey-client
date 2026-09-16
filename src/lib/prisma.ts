import { PrismaClient } from "@prisma/client";

// Same caching pattern as src/lib/mongodb.ts — reuse the client across
// hot reloads in dev and across serverless invocations in production,
// instead of opening a new Postgres connection pool on every request.

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

export const prisma = global._prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global._prisma = prisma;
}
