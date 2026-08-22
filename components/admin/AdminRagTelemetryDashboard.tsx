"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Summary {
  totalAttempts: number;
  attemptsBySource: { text: number; live: number; unknown: number };
  successRatePercent: number | null;
  noMatchRatePercent: number | null;
  retrievalErrorRatePercent: number | null;
  embeddingFailureRatePercent: number | null;
  avgLatencyMs: number | null;
  avgChunkCountOnSuccess: number | null;
  avgSimilarityOnSuccess: number | null;
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function formatNumber(value: number | null, digits = 1): string {
  return value === null ? "—" : value.toFixed(digits);
}

export function AdminRagTelemetryDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ventureId, setVentureId] = useState("");

  const refresh = useCallback(async (filterVentureId: string) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filterVentureId) params.set("ventureId", filterVentureId);

    const res = await fetch(`/api/admin/rag-telemetry?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to load RAG telemetry");
      return;
    }
    setSummary(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-black">RAG Telemetry</h2>
        <p className="text-xs text-slate-400 font-medium">
          Retrieval health across the most recent 2,000 document-search attempts (text + Live
          combined) -- see lib/rag/ragTelemetry.ts. &quot;No match&quot; and infrastructure
          failures look identical from `sources: []` alone; this is what tells them apart.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          refresh(ventureId);
        }}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex items-end gap-3"
      >
        <div className="flex-1 max-w-xs">
          <label className="text-[10px] font-bold uppercase text-slate-500">Venture ID</label>
          <input
            value={ventureId}
            onChange={(e) => setVentureId(e.target.value)}
            placeholder="All ventures"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 transition-colors"
        >
          Apply filter
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total attempts</p>
              <p className="mt-1 text-2xl font-black">{summary.totalAttempts}</p>
              <p className="mt-1 text-[10px] text-slate-500">
                {summary.attemptsBySource.text} text · {summary.attemptsBySource.live} Live
                {summary.attemptsBySource.unknown > 0 ? ` · ${summary.attemptsBySource.unknown} unlabeled` : ""}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Success rate</p>
              <p className="mt-1 text-2xl font-black">{formatPercent(summary.successRatePercent)}</p>
              <p className="mt-1 text-[10px] text-slate-500">Found at least one relevant chunk</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">No-match rate</p>
              <p className="mt-1 text-2xl font-black">{formatPercent(summary.noMatchRatePercent)}</p>
              <p className="mt-1 text-[10px] text-slate-500">Retrieval worked, nothing relevant existed</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Avg latency</p>
              <p className="mt-1 text-2xl font-black">{formatNumber(summary.avgLatencyMs, 0)} ms</p>
              <p className="mt-1 text-[10px] text-slate-500">Embedding + vector search combined</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className={`rounded-2xl border p-5 ${
              summary.retrievalErrorRatePercent && summary.retrievalErrorRatePercent > 5
                ? "border-rose-500/40 bg-rose-500/5"
                : "border-slate-800 bg-slate-900"
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Retrieval error rate</p>
              <p className="mt-1 text-2xl font-black">{formatPercent(summary.retrievalErrorRatePercent)}</p>
              <p className="mt-1 text-[10px] text-slate-500">DB/query failures -- evidence may exist but couldn&apos;t be checked</p>
            </div>
            <div className={`rounded-2xl border p-5 ${
              summary.embeddingFailureRatePercent && summary.embeddingFailureRatePercent > 5
                ? "border-rose-500/40 bg-rose-500/5"
                : "border-slate-800 bg-slate-900"
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Embedding failure rate</p>
              <p className="mt-1 text-2xl font-black">{formatPercent(summary.embeddingFailureRatePercent)}</p>
              <p className="mt-1 text-[10px] text-slate-500">No Gemini key, or the embedding call itself failed</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Avg chunks (on success)</p>
              <p className="mt-1 text-2xl font-black">{formatNumber(summary.avgChunkCountOnSuccess)}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Avg top similarity (on success)</p>
              <p className="mt-1 text-2xl font-black">{formatNumber(summary.avgSimilarityOnSuccess, 2)}</p>
            </div>
          </div>

          {summary.totalAttempts === 0 && (
            <p className="text-xs text-slate-500">
              No RAG retrieval attempts logged yet for this filter -- try a broader venture filter, or check that documents have been saved and a research/strategy question has been asked.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
