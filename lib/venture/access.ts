import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Extracted from app/api/persistence/route.ts (its original, still the primary caller) so
// app/api/rag/search/route.ts can enforce the exact same "does this user actually have
// access to this venture" check rather than duplicating or drifting from it.

export interface VentureAccess {
  ownerUserId: string;
  role: "owner" | "cofounder" | "member" | "advisor" | "external";
  canEditBoard: boolean;
}

export async function resolveVentureAccess(
  supabase: SupabaseClient,
  userId: string,
  ventureId: string,
): Promise<VentureAccess | null> {
  const { data: owned } = await supabase
    .from("founder_ventures")
    .select("user_id")
    .eq("user_id", userId)
    .eq("venture_id", ventureId)
    .maybeSingle();
  if (owned) return { ownerUserId: userId, role: "owner", canEditBoard: true };
  const { data: membership } = await supabase
    .from("venture_memberships")
    .select("owner_user_id,role,can_edit_board")
    .eq("user_id", userId)
    .eq("venture_id", ventureId)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) return null;
  return {
    ownerUserId: membership.owner_user_id,
    role: membership.role,
    canEditBoard: Boolean(membership.can_edit_board),
  };
}
