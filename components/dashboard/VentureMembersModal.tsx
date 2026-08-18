"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Check, Loader2, Mail, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import type { Venture, VentureMemberRole } from "@/lib/store/ventureStore";
import { VentureStore } from "@/lib/store/ventureStore";
import { defaultPermissionsForRole, memberDisplayName, memberInitials } from "@/lib/venture/members";

interface VentureMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  venture: Venture;
  onUpdateVenture?: (venture: Venture) => void;
}

const ROLE_LABELS: Record<VentureMemberRole, string> = {
  owner: "Owner",
  cofounder: "Co-founder",
  member: "Team member",
  advisor: "Advisor",
  external: "External collaborator",
};

export function VentureMembersModal({ isOpen, onClose, venture, onUpdateVenture }: VentureMembersModalProps) {
  const { userId } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<VentureMemberRole>("member");
  const [permissions, setPermissions] = useState(defaultPermissionsForRole("member"));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const members = useMemo(() => (venture.members || []).filter((member) => member.status !== "removed"), [venture.members]);
  const currentMember = members.find((member) => member.userId === userId)
    || (venture.ownerUserId === userId ? members.find((member) => member.role === "owner") : undefined);
  const canInvite = currentMember?.role === "owner";

  if (!isOpen) return null;

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError("");
    setSent(false);
    try {
      const response = await fetch("/api/venture-invitations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ventureId: venture.id, name, email, role, ...permissions }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not send invitation");
      const updated = payload.workspace as Venture;
      VentureStore.updateVenture(updated);
      onUpdateVenture?.(updated);
      setSent(true);
      setName("");
      setEmail("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="grid max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl md:grid-cols-[0.92fr_1.08fr]">
        <section className="overflow-y-auto border-b border-slate-200 bg-slate-950 p-6 text-white md:border-b-0 md:border-r md:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">Venture team</p>
              <h2 className="mt-1 text-xl font-black">{venture.name}</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">People who can own work, join stand-ups and collaborate with the BA.</p>
            </div>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden" aria-label="Close members">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 space-y-2.5">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${member.status === "active" ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                  {memberInitials(member)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{memberDisplayName(member)}</p>
                  <p className="truncate text-[10px] text-slate-400">{member.email || ROLE_LABELS[member.role]}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-wider text-blue-300">{ROLE_LABELS[member.role]}</p>
                  <p className={`mt-0.5 text-[9px] font-bold ${member.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>{member.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><UserPlus className="h-4 w-4" /></div>
              <div>
                <h3 className="text-lg font-black text-slate-950">Invite someone</h3>
                <p className="text-xs text-slate-500">Secure link via Resend · expires in 7 days</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close members">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!canInvite ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-relaxed text-amber-900">
              Only the venture owner can send invitations. You can still see the team and participate according to your access.
            </div>
          ) : (
            <form onSubmit={sendInvite} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Name
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
                </label>
                <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Role
                  <select value={role} onChange={(event) => {
                    const nextRole = event.target.value as VentureMemberRole;
                    setRole(nextRole);
                    setPermissions(defaultPermissionsForRole(nextRole));
                  }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-900 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="cofounder">Co-founder</option>
                    <option value="member">Team member</option>
                    <option value="advisor">Advisor</option>
                    <option value="external">External collaborator</option>
                  </select>
                </label>
              </div>
              <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Email address
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alex@startup.com" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold normal-case tracking-normal text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Access</p>
                {([
                  ["canJoinStandup", "Join stand-ups"],
                  ["canEditBoard", "Edit the board"],
                  ["canAssignCards", "Assign cards"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    {label}
                    <input type="checkbox" checked={permissions[key]} onChange={(event) => setPermissions((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                  </label>
                ))}
              </div>

              {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
              {sent && <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><Check className="h-3.5 w-3.5" /> Invitation sent and added to the team list.</p>}

              <button disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Send secure invitation
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
