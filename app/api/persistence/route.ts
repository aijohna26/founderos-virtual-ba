import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type Resource = "commitments" | "learnings" | "memories" | "operations";

const TABLES: Record<Resource, string> = {
  commitments: "founder_commitments",
  learnings: "founder_learnings",
  memories: "venture_memories",
  operations: "ai_operation_logs",
};

const ALLOWED_COLUMNS: Record<Resource, Set<string>> = {
  commitments: new Set([
    "id", "venture_id", "commitment", "deadline", "status", "related_ticket_id",
    "source", "created_at", "completed_at",
  ]),
  learnings: new Set([
    "id", "venture_id", "pattern", "evidence", "confidence",
    "suggested_coaching_behavior", "date_detected", "relevant_sprint_id",
  ]),
  memories: new Set([
    "id", "venture_id", "category", "fact", "source", "confidence", "created_at",
  ]),
  operations: new Set([
    "id", "venture_id", "ceremony", "gemini_model", "tool_requested",
    "tool_arguments", "tool_result", "reasoning_category", "latency_ms",
    "success", "created_at",
  ]),
};

function isResource(value: unknown): value is Resource {
  return typeof value === "string" && value in TABLES;
}

function cleanRecord(resource: Resource, value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    if (ALLOWED_COLUMNS[resource].has(key)) cleaned[key] = item;
  }
  if (typeof cleaned.id !== "string" || typeof cleaned.venture_id !== "string") return null;
  if (cleaned.id.length > 160 || cleaned.venture_id.length > 160) return null;
  return cleaned;
}

async function authenticatedUserId() {
  const { isAuthenticated, userId } = await auth();
  return isAuthenticated ? userId : null;
}

export async function GET(request: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource");
  const ventureId = url.searchParams.get("ventureId");
  if (!isResource(resource) || !ventureId || ventureId.length > 160) {
    return Response.json({ error: "Invalid resource or venture" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json(
      { error: "Persistence is not configured", code: "PERSISTENCE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const orderColumn = resource === "learnings" ? "date_detected" : "created_at";
  const { data, error } = await supabase
    .from(TABLES[resource])
    .select("*")
    .eq("user_id", userId)
    .eq("venture_id", ventureId)
    .order(orderColumn, { ascending: false })
    .limit(resource === "operations" ? 100 : 500);

  if (error) {
    console.error("Persistence read failed", { resource, code: error.code });
    return Response.json({ error: "Persistence read failed" }, { status: 500 });
  }
  return Response.json({ records: data ?? [] });
}

export async function POST(request: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { resource?: unknown; record?: unknown } | null;
  if (!body || !isResource(body.resource)) {
    return Response.json({ error: "Invalid resource" }, { status: 400 });
  }
  const record = cleanRecord(body.resource, body.record);
  if (!record) return Response.json({ error: "Invalid record" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json(
      { error: "Persistence is not configured", code: "PERSISTENCE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from(TABLES[body.resource])
    .upsert({ ...record, user_id: userId }, { onConflict: "id,user_id" })
    .select("*")
    .single();

  if (error) {
    console.error("Persistence write failed", { resource: body.resource, code: error.code });
    return Response.json({ error: "Persistence write failed" }, { status: 500 });
  }
  return Response.json({ record: data });
}

export async function DELETE(request: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource");
  const id = url.searchParams.get("id");
  const ventureId = url.searchParams.get("ventureId");
  if (!isResource(resource) || !id || !ventureId || id.length > 160 || ventureId.length > 160) {
    return Response.json({ error: "Invalid delete request" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json(
      { error: "Persistence is not configured", code: "PERSISTENCE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const { error } = await supabase
    .from(TABLES[resource])
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("venture_id", ventureId);
  if (error) return Response.json({ error: "Persistence delete failed" }, { status: 500 });
  return Response.json({ success: true });
}
