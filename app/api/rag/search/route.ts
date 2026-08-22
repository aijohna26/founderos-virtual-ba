import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveVentureAccess } from "@/lib/venture/access";
import { searchDocumentChunks } from "@/lib/rag/retrieval";
import { logAIOperationServer } from "@/lib/agent/aiOperationsLogServer";

// P1 #7/#8: venture-scoped company-knowledge search, callable from the browser -- the one
// piece of RAG retrieval that a server component can't just call directly, since Gemini Live
// runs as a persistent client-side session (lib/agent/geminiLiveService.ts) that executes its
// own tool calls. Exists purely so the Live path's search_company_knowledge tool has
// something authenticated to fetch(); the text chat path calls searchDocumentChunks()
// directly in-process (see lib/rag/companyKnowledgeContext.ts) and never hits this route.
//
// Protected by proxy.ts's blanket auth.protect() like every other non-public route, plus its
// own venture-membership check below -- a signed-in user still can't search a venture they
// don't belong to.
export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { ventureId?: unknown; query?: unknown } | null;
  const ventureId = typeof body?.ventureId === "string" ? body.ventureId : null;
  const query = typeof body?.query === "string" ? body.query : null;
  if (!ventureId || !query || ventureId.length > 160 || query.length > 2000) {
    return NextResponse.json({ error: "ventureId and query are required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const access = await resolveVentureAccess(admin, userId, ventureId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Scoped to the venture *owner's* id, matching how every other resource in this app is
  // stored (see app/api/persistence/route.ts) -- documents belong to the venture's owner
  // account, not to whichever collaborator happens to be asking.
  const startedAt = Date.now();
  const result = await searchDocumentChunks({ userId: access.ownerUserId, ventureId, query });
  const latencyMs = Date.now() - startedAt;

  // P0 #3: same retrieval-health visibility as the text path (see
  // lib/rag/companyKnowledgeContext.ts) -- Live's tool-based retrieval would otherwise be
  // completely invisible to AI Ops, since it never goes through that module.
  void logAIOperationServer({
    userId,
    ventureId,
    ceremony: "daily_standup",
    geminiModel: "gemini-embedding-2",
    toolRequested: "rag_retrieval",
    toolArguments: { queryLength: query.length, source: "live" },
    toolResult: { status: result.status, chunkCount: result.chunks.length, error: result.error },
    reasoningCategory: "de_risking",
    latencyMs,
    success: result.status === "success" || result.status === "no_match",
  });

  return NextResponse.json({
    status: result.status,
    sources: result.chunks.map((chunk) => ({
      documentId: chunk.documentId,
      title: chunk.title,
      section: chunk.section,
      content: chunk.content,
      similarity: chunk.similarity,
    })),
  });
}
