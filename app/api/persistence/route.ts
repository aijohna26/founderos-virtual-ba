import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ingestDocument } from "@/lib/rag/documentIngestion";
import { resolveVentureAccess, type VentureAccess } from "@/lib/venture/access";

type Resource = "ventures" | "commitments" | "learnings" | "memories" | "documents" | "operations";

const TABLES: Record<Resource, string> = {
  ventures: "founder_ventures",
  commitments: "founder_commitments",
  learnings: "founder_learnings",
  memories: "venture_memories",
  documents: "venture_documents",
  operations: "ai_operation_logs",
};

const ALLOWED_COLUMNS: Record<Resource, Set<string>> = {
  ventures: new Set(["id", "venture_id", "workspace", "created_at", "updated_at"]),
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
  documents: new Set([
    "id", "venture_id", "title", "category", "content", "created_at", "updated_at",
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
  if (!isResource(resource) || (resource !== "ventures" && !ventureId) || (ventureId?.length ?? 0) > 160) {
    return Response.json({ error: "Invalid resource or venture" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json(
      { error: "Persistence is not configured", code: "PERSISTENCE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (resource === "ventures") {
    const { data: owned, error: ownedError } = await supabase
      .from(TABLES.ventures)
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (ownedError) return Response.json({ error: "Persistence read failed" }, { status: 500 });
    const { data: memberships } = await supabase
      .from("venture_memberships")
      .select("owner_user_id,venture_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .neq("owner_user_id", userId)
      .limit(500);
    const sharedRows = (await Promise.all((memberships || []).map(async (membership) => {
      const { data } = await supabase.from(TABLES.ventures).select("*")
        .eq("user_id", membership.owner_user_id)
        .eq("venture_id", membership.venture_id)
        .maybeSingle();
      return data;
    }))).filter(Boolean);
    const records = [...(owned || []), ...sharedRows]
      .filter((row, index, rows) => rows.findIndex((candidate) => candidate.id === row.id && candidate.user_id === row.user_id) === index)
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    return Response.json({ records });
  }

  const access = await resolveVentureAccess(supabase, userId, ventureId!);
  if (!access) return Response.json({ error: "Forbidden" }, { status: 403 });
  const orderColumn = resource === "learnings" ? "date_detected" : "created_at";
  let query = supabase
    .from(TABLES[resource])
    .select("*")
    .eq("user_id", access.ownerUserId)
    .order(orderColumn, { ascending: false })
    .limit(resource === "operations" ? 100 : 500);
  if (ventureId) query = query.eq("venture_id", ventureId);
  const { data, error } = await query;

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

  let ownerUserId = userId;
  let access: VentureAccess | null = null;
  if (body.resource === "ventures") {
    access = await resolveVentureAccess(supabase, userId, String(record.venture_id));
    ownerUserId = access?.ownerUserId || userId;
  } else {
    access = await resolveVentureAccess(supabase, userId, String(record.venture_id));
    if (!access) return Response.json({ error: "Forbidden" }, { status: 403 });
    ownerUserId = access.ownerUserId;
  }
  if (access && access.role !== "owner" && !access.canEditBoard) {
    return Response.json({ error: "Read-only venture access" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from(TABLES[body.resource])
    .upsert({ ...record, user_id: ownerUserId }, { onConflict: "id,user_id" })
    .select("*")
    .single();

  if (error) {
    console.error("Persistence write failed", { resource: body.resource, code: error.code });
    return Response.json({ error: "Persistence write failed" }, { status: 500 });
  }
  if (body.resource === "ventures" && !access) {
    const workspace = record.workspace && typeof record.workspace === "object"
      ? record.workspace as Record<string, unknown>
      : {};
    const members = Array.isArray(workspace.members) ? workspace.members as Array<Record<string, unknown>> : [];
    const owner = members.find((member) => member.role === "owner");
    await supabase.from("venture_memberships").upsert({
      owner_user_id: userId,
      venture_id: record.venture_id,
      user_id: userId,
      email: typeof owner?.email === "string" ? owner.email : "",
      name: typeof owner?.name === "string" ? owner.name : null,
      role: "owner",
      status: "active",
      can_join_standup: true,
      can_edit_board: true,
      can_assign_cards: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_user_id,venture_id,user_id" });
  }

  // P1 #6/#7: (re-)chunk and embed this document for retrieval. Scheduled via after() rather
  // than awaited -- embedding is a Gemini API call, and letting it block this response would
  // make document saves noticeably slower as documents/embedding volume grow (review finding:
  // "design toward" async now, before that's actually a problem, rather than bolting on a
  // queue later under pressure). The document row itself is already committed above by the
  // time this runs; ingestion_status starts 'pending' (set by the DB trigger in
  // 20260822090000_document_ingestion.sql) and callers can poll/observe it settling to
  // ready/failed rather than needing this request to wait for it.
  if (body.resource === "documents") {
    const documentSnapshot = {
      id: String(data.id),
      userId: String(data.user_id),
      ventureId: String(data.venture_id),
      title: String(data.title),
      content: String(data.content),
    };
    after(() => ingestDocument(documentSnapshot));
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

  const access = await resolveVentureAccess(supabase, userId, ventureId);
  if (!access) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (access.role !== "owner" && !access.canEditBoard) {
    return Response.json({ error: "Read-only venture access" }, { status: 403 });
  }
  const { error } = await supabase
    .from(TABLES[resource])
    .delete()
    .eq("id", id)
    .eq("user_id", access.ownerUserId)
    .eq("venture_id", ventureId);
  if (error) return Response.json({ error: "Persistence delete failed" }, { status: 500 });
  return Response.json({ success: true });
}
