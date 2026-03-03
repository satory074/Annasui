import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Use DATABASE_URL for server-side Drizzle ORM connection (direct PostgreSQL)
// This is separate from the NEXT_PUBLIC_SUPABASE_* vars used by the Supabase JS client

// Lazy initialization — avoids throwing at module import time during build
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "This should be your Supabase PostgreSQL connection string."
    );
  }

  const client = postgres(connectionString, {
    prepare: false, // Required for Supabase connection pooling
  });

  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
