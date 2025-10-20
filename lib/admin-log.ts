import { supabaseAdmin } from "./supabase-admin";

type Target = { email?: string; userId?: string };

export async function logAdminAction(
  actorId: string,
  action: string,
  payload: unknown,
  target?: Target,
  req?: Request
) {
  const ip = req?.headers.get("x-forwarded-for") ?? "";
  const ua = req?.headers.get("user-agent") ?? "";
  await supabaseAdmin.from("admin_actions").insert({
    actor_id: actorId,
    action,
    target_email: target?.email ?? null,
    target_user_id: target?.userId ?? null,
    payload,
    ip,
    user_agent: ua,
  });
}
