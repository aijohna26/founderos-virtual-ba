"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, Loader2, ShieldCheck, Users } from "lucide-react";

interface InviteDetails {
  ventureName: string;
  role: string;
  name?: string;
  status: string;
  expiresAt: string;
  invitedEmail: string;
}

export default function VentureInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const token = params.token;
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/venture-invitations?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Invitation unavailable");
        if (active) setDetails(payload);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Invitation unavailable");
      });
    return () => { active = false; };
  }, [token]);

  const acceptInvite = async () => {
    setAccepting(true);
    setError("");
    try {
      const response = await fetch("/api/venture-invitations", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not accept invitation");
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not accept invitation");
      setAccepting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#eef2f6] px-4 py-12 flex items-center justify-center text-slate-900">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)]">
        <div className="bg-slate-950 px-7 py-7 text-white relative overflow-hidden">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border-[22px] border-blue-500/20" />
          <div className="relative flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-950/40">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">Venture invitation</p>
              <h1 className="mt-1 text-xl font-black">Join the working room</h1>
            </div>
          </div>
        </div>

        <div className="p-7 space-y-6">
          {!details && !error && (
            <div className="py-10 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Verifying secure invitation…
            </div>
          )}

          {details && (
            <>
              <div>
                <p className="text-sm text-slate-500">You have been invited to collaborate on</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{details.ventureName}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Role</p>
                  <p className="mt-1 text-sm font-bold capitalize text-slate-800">{details.role}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Invited account</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{details.invitedEmail}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                This signed link is tied to the invited email and expires automatically.
              </div>

              {details.status === "accepted" ? (
                <Link href="/dashboard" className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Open venture
                </Link>
              ) : !isLoaded ? null : isSignedIn ? (
                <button
                  onClick={acceptInvite}
                  disabled={accepting}
                  className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Accept and join venture
                </button>
              ) : (
                <Link
                  href={`/sign-in?redirect_url=${encodeURIComponent(`/invite/${token}`)}`}
                  className="block w-full rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
                >
                  Sign in to accept
                </Link>
              )}
            </>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div>
          )}
        </div>
      </div>
    </main>
  );
}

