import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "[AD TERMINAL] DATABASE_URL is not set. Add your Neon connection string to Vercel environment variables."
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __adTerminalPool?: Pool;
};

export const pool =
  globalForDb.__adTerminalPool ??
  new Pool({
    connectionString: databaseUrl,
    // ✅ Neon requires SSL — without this you get "connection refused"
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    // ✅ Serverless-friendly pool sizing — Vercel spins up many instances
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

// ✅ Reuse pool in dev (hot reload safe)
if (process.env.NODE_ENV !== "production") {
  globalForDb.__adTerminalPool = pool;
}

export const db = drizzle(pool, { schema });
