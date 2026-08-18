import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  createVentureInviteToken,
  hashInviteToken,
  verifyVentureInviteToken,
} from "@/lib/collaboration/inviteTokens";
import { escapeHtml } from "@/lib/collaboration/email";
import type { Venture, VentureInvitation, VentureMember, VentureMemberRole } from "@/lib/store/ventureStore";
import { defaultPermissionsForRole } from "@/lib/venture/members";

const INVITABLE_ROLES: VentureMemberRole[] = ["cofounder", "member", "advisor", "external"];

function inviteSecret() {
  const secret = process.env.INVITE_TOKEN_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function resendConfig() {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resendKey || !from) return null;
  return { resendKey, from };
}

function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function withInvitation(workspace: Venture, invitation: VentureInvitation, member: VentureMember): Venture {
  const invitations = workspace.invitations || [];
  const members = workspace.members || [];
  return {
    ...workspace,
    invitations: [...invitations.filter((item) => item.id !== invitation.id), invitation],
    members: [
      ...members.filter((item) => item.id !== member.id && item.email.toLowerCase() !== member.email.toLowerCase()),
      member,
    ],
  };
}

async function getOwnerWorkspace(ownerUserId: string, ventureId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { supabase: null, row: null };
  const { data } = await supabase
    .from("founder_ventures")
    .select("*")
    .eq("user_id", ownerUserId)
    .eq("venture_id", ventureId)
    .maybeSingle();
  return { supabase, row: data as { workspace?: Venture } | null };
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const secret = inviteSecret();
  const emailConfig = resendConfig();
  if (!secret || !emailConfig) {
    return Response.json({
      error: "Invitations are not configured",
      code: "INVITATIONS_NOT_CONFIGURED",
    }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const ventureId = typeof body?.ventureId === "string" ? body.ventureId : "";
  const email = validEmail(body?.email) ? body.email.trim().toLowerCase() : "";
  const role = INVITABLE_ROLES.includes(body?.role as VentureMemberRole)
    ? body?.role as VentureMemberRole
    : "member";
  if (!ventureId || ventureId.length > 160 || !email) {
    return Response.json({ error: "A valid venture and email are required" }, { status: 400 });
  }

  const { supabase, row } = await getOwnerWorkspace(userId, ventureId);
  if (!supabase) return Response.json({ error: "Persistence is not configured" }, { status: 503 });
  if (!row?.workspace) return Response.json({ error: "Only the venture owner can send invitations" }, { status: 403 });

  const { data: existing } = await supabase
    .from("venture_invitations")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("venture_id", ventureId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) return Response.json({ error: "This person already has a pending invitation" }, { status: 409 });

  const defaults = defaultPermissionsForRole(role);
  const permissions = {
    canJoinStandup: typeof body?.canJoinStandup === "boolean" ? body.canJoinStandup : defaults.canJoinStandup,
    canEditBoard: typeof body?.canEditBoard === "boolean" ? body.canEditBoard : defaults.canEditBoard,
    canAssignCards: typeof body?.canAssignCards === "boolean" ? body.canAssignCards : defaults.canAssignCards,
  };
  const invitationId = randomUUID();
  const invitedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const token = createVentureInviteToken({ invitationId, ventureId, ownerUserId: userId, email, expiresAt }, secret);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  const invitation: VentureInvitation = {
    id: invitationId,
    ventureId,
    email,
    name: name || undefined,
    role,
    status: "pending",
    ...permissions,
    invitedAt,
    expiresAt,
    invitedByUserId: userId,
  };
  const member: VentureMember = {
    id: `invite:${invitationId}`,
    ventureId,
    email,
    name: name || undefined,
    role,
    status: "invited",
    ...permissions,
    invitedAt,
  };

  const { error: insertError } = await supabase.from("venture_invitations").insert({
    id: invitationId,
    owner_user_id: userId,
    venture_id: ventureId,
    invited_by_user_id: userId,
    email,
    name: name || null,
    role,
    status: "pending",
    can_join_standup: permissions.canJoinStandup,
    can_edit_board: permissions.canEditBoard,
    can_assign_cards: permissions.canAssignCards,
    token_hash: hashInviteToken(token),
    expires_at: expiresAt,
    created_at: invitedAt,
  });
  if (insertError) return Response.json({ error: "Could not create invitation" }, { status: 500 });

  const workspace = withInvitation(row.workspace, invitation, member);
  await supabase
    .from("founder_ventures")
    .update({ workspace, updated_at: invitedAt })
    .eq("user_id", userId)
    .eq("venture_id", ventureId);

  const clerk = await clerkClient();
  const inviter = await clerk.users.getUser(userId);
  const inviterName = inviter.fullName || inviter.firstName || "A FounderAlly member";
  const inviteUrl = `${process.env.APP_URL || request.nextUrl.origin}/invite/${encodeURIComponent(token)}`;
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${emailConfig.resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `venture-invite-${invitationId}`,
    },
    body: JSON.stringify({
      from: emailConfig.from,
      to: [email],
      subject: `Join ${row.workspace.name} on FounderAlly`,
      text: `${inviterName} invited you to collaborate on ${row.workspace.name}. Accept your invitation: ${inviteUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2>Join ${escapeHtml(row.workspace.name)} on FounderAlly</h2><p>${escapeHtml(inviterName)} invited you to work with the venture team and its AI Business Analyst.</p><p><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#155eef;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Accept invitation</a></p><p style="color:#667085;font-size:13px">This secure invitation expires in 7 days.</p></div>`,
    }),
  });
  const resendPayload = await resendResponse.json().catch(() => ({})) as { id?: string };
  if (!resendResponse.ok) {
    await supabase.from("venture_invitations").update({ status: "failed" }).eq("id", invitationId);
    const failedWorkspace = withInvitation(workspace, { ...invitation, status: "failed" }, member);
    await supabase.from("founder_ventures").update({ workspace: failedWorkspace }).eq("user_id", userId).eq("venture_id", ventureId);
    return Response.json({ error: "Resend could not deliver the invitation" }, { status: 502 });
  }
  await supabase.from("venture_invitations").update({ resend_email_id: resendPayload.id || null }).eq("id", invitationId);
  return Response.json({ invitation, member, workspace });
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in to accept this invitation" }, { status: 401 });
  const secret = inviteSecret();
  if (!secret) return Response.json({ error: "Invitations are not configured" }, { status: 503 });
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const payload = verifyVentureInviteToken(token, secret);
  if (!payload) return Response.json({ error: "This invitation is invalid or expired" }, { status: 400 });
  const { supabase, row } = await getOwnerWorkspace(payload.ownerUserId, payload.ventureId);
  if (!supabase || !row?.workspace) return Response.json({ error: "Venture not found" }, { status: 404 });
  const { data: invite } = await supabase
    .from("venture_invitations")
    .select("*")
    .eq("id", payload.invitationId)
    .eq("token_hash", hashInviteToken(token))
    .eq("status", "pending")
    .maybeSingle();
  if (!invite || Date.parse(invite.expires_at) <= Date.now()) {
    return Response.json({ error: "This invitation is no longer active" }, { status: 410 });
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const userEmails = user.emailAddresses.map((address) => address.emailAddress.toLowerCase());
  if (!userEmails.includes(payload.email.toLowerCase())) {
    return Response.json({ error: `Sign in with ${payload.email} to accept this invitation` }, { status: 403 });
  }
  const joinedAt = new Date().toISOString();
  const member: VentureMember = {
    id: `member:${userId}`,
    ventureId: payload.ventureId,
    userId,
    email: payload.email.toLowerCase(),
    name: invite.name || user.fullName || user.firstName || undefined,
    role: invite.role,
    status: "active",
    canJoinStandup: invite.can_join_standup,
    canEditBoard: invite.can_edit_board,
    canAssignCards: invite.can_assign_cards,
    invitedAt: invite.created_at,
    joinedAt,
  };
  const acceptedInvitation: VentureInvitation = {
    id: invite.id,
    ventureId: invite.venture_id,
    email: invite.email,
    name: invite.name || undefined,
    role: invite.role,
    status: "accepted",
    canJoinStandup: invite.can_join_standup,
    canEditBoard: invite.can_edit_board,
    canAssignCards: invite.can_assign_cards,
    invitedAt: invite.created_at,
    expiresAt: invite.expires_at,
    invitedByUserId: invite.invited_by_user_id,
  };
  const workspace = withInvitation(row.workspace, acceptedInvitation, member);
  const { error: memberError } = await supabase.from("venture_memberships").upsert({
    owner_user_id: payload.ownerUserId,
    venture_id: payload.ventureId,
    user_id: userId,
    email: member.email,
    name: member.name || null,
    role: member.role,
    status: "active",
    can_join_standup: member.canJoinStandup,
    can_edit_board: member.canEditBoard,
    can_assign_cards: member.canAssignCards,
    updated_at: joinedAt,
  }, { onConflict: "owner_user_id,venture_id,user_id" });
  if (memberError) return Response.json({ error: "Could not join venture" }, { status: 500 });
  await supabase.from("venture_invitations").update({
    status: "accepted",
    accepted_at: joinedAt,
    accepted_by_user_id: userId,
  }).eq("id", invite.id);
  await supabase.from("founder_ventures").update({ workspace, updated_at: joinedAt })
    .eq("user_id", payload.ownerUserId).eq("venture_id", payload.ventureId);
  return Response.json({ member, workspace });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const secret = inviteSecret();
  if (token) {
    if (!secret) return Response.json({ error: "Invitations are not configured" }, { status: 503 });
    const payload = verifyVentureInviteToken(token, secret);
    if (!payload) return Response.json({ error: "This invitation is invalid or expired" }, { status: 400 });
    const { supabase, row } = await getOwnerWorkspace(payload.ownerUserId, payload.ventureId);
    if (!supabase || !row?.workspace) return Response.json({ error: "Venture not found" }, { status: 404 });
    const { data: invite } = await supabase.from("venture_invitations").select("status,role,name,expires_at")
      .eq("id", payload.invitationId).maybeSingle();
    if (!invite) return Response.json({ error: "Invitation not found" }, { status: 404 });
    return Response.json({
      ventureName: row.workspace.name,
      role: invite.role,
      name: invite.name,
      status: invite.status,
      expiresAt: invite.expires_at,
      invitedEmail: payload.email.replace(/^(.{2}).*(@.*)$/, "$1***$2"),
    });
  }
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const ventureId = request.nextUrl.searchParams.get("ventureId") || "";
  const { supabase, row } = await getOwnerWorkspace(userId, ventureId);
  if (!supabase || !row?.workspace) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({ members: row.workspace.members || [], invitations: row.workspace.invitations || [] });
}
