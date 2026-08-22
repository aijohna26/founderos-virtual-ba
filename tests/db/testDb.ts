import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

// Spins up a real, throwaway Postgres container and applies the actual
// supabase/migrations/*.sql files against it -- not a hand-copied schema -- so these tests
// exercise the exact same SQL (claim_ltd_offer_slot, its advisory locks, the unique indexes)
// that runs in production. The only thing stubbed is the `auth` schema, since Supabase's
// auth.jwt() (used only inside RLS policies, never by claim_ltd_offer_slot itself) doesn't
// exist outside a real Supabase project.
//
// Requires a working local Docker daemon. Tests that need this import call requireDocker()
// first and skip (not fail) when Docker isn't available, since CI/dev environments won't
// always have it running.

const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase/migrations");
// pgvector, not stock postgres: 20260822100000_document_chunk_embeddings.sql needs the
// `vector` extension, which plain postgres:16-alpine doesn't ship. This is the official
// pgvector image (postgres:16 + the extension preinstalled) -- every migration still applies
// against real Postgres exactly as it would on Supabase (which also ships pgvector), this
// image just has the extension available for `create extension if not exists vector` to find.
const IMAGE = "pgvector/pgvector:pg16";

export interface TestDb {
  pool: Pool;
  stop: () => Promise<void>;
}

export function dockerAvailable(): boolean {
  const result = spawnSync("docker", ["info"], { stdio: "ignore" });
  return result.status === 0;
}

function stubAuthSchemaSql(): string {
  // Only auth.jwt() is referenced (inside RLS policies) by these migrations -- a no-op
  // stand-in is enough since none of the concurrency tests authenticate as a Postgres role
  // that would ever hit a policy's USING clause (they all connect as the superuser).
  return `create schema if not exists auth;
create or replace function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$;`;
}

function loadMigrationSql(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"));
}

async function waitForPostgres(pool: Pool, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      await pool.query("select 1");
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`Postgres never became ready: ${String(lastErr)}`);
}

/** Starts a fresh postgres:16-alpine container, applies every migration, returns a ready pool. */
export async function startTestDb(): Promise<TestDb> {
  const containerName = `founderally-ltd-test-${randomUUID().slice(0, 8)}`;
  const port = 15000 + Math.floor(Math.random() * 5000);

  execFileSync("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    containerName,
    "-e",
    "POSTGRES_PASSWORD=postgres",
    "-p",
    `${port}:5432`,
    IMAGE,
  ]);

  const pool = new Pool({
    host: "127.0.0.1",
    port,
    user: "postgres",
    password: "postgres",
    database: "postgres",
    max: 20, // needs to comfortably exceed the concurrency fan-out the tests below use
  });

  const stop = async () => {
    await pool.end();
    spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
  };

  try {
    await waitForPostgres(pool);
    await pool.query(stubAuthSchemaSql());
    for (const sql of loadMigrationSql()) {
      await pool.query(sql);
    }
  } catch (err) {
    await stop();
    throw err;
  }

  return { pool, stop };
}
