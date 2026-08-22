import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveVentureAccess } from "@/lib/venture/access";
import { searchDocumentChunks } from "@/lib/rag/retrieval";
import { logRagRetrieval } from "@/lib/rag/ragTelemetry";
import { classifyContextNeeds } from "@/lib/agent/contextClassifier";
import { DEFAULT_MIN_SIMILARITY, OPTIONAL_TIER_MIN_SIMILARITY } from "@/lib/config/ragConfig";

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

  // P1 #5: unlike the text path, Live's model already decided to call this tool -- there's no
  // "skip" here, that decision is the model's to make. But the same optional/required
  // similarity bar still applies: a query that only tangentially reads as needing company
  // evidence requires a stronger match to actually return anything, same reasoning as
  // lib/rag/companyKnowledgeContext.ts.
  const tier = classifyContextNeeds(query).documentRetrieval;
  const minSimilarity = tier === "optional" ? OPTIONAL_TIER_MIN_SIMILARITY : DEFAULT_MIN_SIMILARITY;

  // Scoped to the venture *owner's* id, matching how every other resource in this app is
  // stored (see app/api/persistence/route.ts) -- documents belong to the venture's owner
  // account, not to whichever collaborator happens to be asking.
  const startedAt = Date.now();
  const result = await searchDocumentChunks({ userId: access.ownerUserId, ventureId, query, minSimilarity });
  const latencyMs = Date.now() - startedAt;

  // P0 #3 + P1 #4: same retrieval-health/telemetry visibility as the text path (see
  // lib/rag/companyKnowledgeContext.ts) -- Live's tool-based retrieval would otherwise be
  // completely invisible to AI Ops, since it never goes through that module.
  void logRagRetrieval({
    userId,
    ventureId,
    query,
    source: "live",
    result,
    totalLatencyMs: latencyMs,
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
