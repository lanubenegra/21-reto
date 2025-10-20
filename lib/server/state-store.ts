import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeEmail } from "@/lib/email";
import { emptyUserState, type UserState } from "@/lib/user-state";

type UserStateRow = {
  user_id: string;
  email: string | null;
  state: Record<string, unknown> | null;
  updated_at: string;
};

const TABLE = "user_state";

const serializeState = (state: UserState) => JSON.parse(JSON.stringify(state));

async function fetchStateBy(filter: { user_id?: string; email?: string }) {
  const query = supabaseAdmin.from(TABLE).select("user_id, email, state, updated_at").limit(1);
  if (filter.user_id) {
    query.eq("user_id", filter.user_id);
  }
  if (filter.email) {
    query.eq("email", filter.email);
  }
  const { data } = await query.maybeSingle();
  return (data as UserStateRow | null) ?? null;
}

export async function getUserState(userId: string, email?: string): Promise<UserState> {
  const normalizedEmail = email ? normalizeEmail(email) : undefined;

  const primary = await fetchStateBy({ user_id: userId });
  if (primary?.state) {
    return { ...emptyUserState(), ...(primary.state as Partial<UserState>) };
  }

  if (normalizedEmail) {
    const fallback = await fetchStateBy({ email: normalizedEmail });
    if (fallback?.state) {
      return { ...emptyUserState(), ...(fallback.state as Partial<UserState>) };
    }
  }

  return emptyUserState();
}

export async function setUserState(userId: string, email: string | undefined, state: UserState): Promise<void> {
  const normalizedEmail = email ? normalizeEmail(email) : null;
  const payload = {
    user_id: userId,
    email: normalizedEmail,
    state: serializeState(state),
    updated_at: new Date().toISOString(),
  };

  await supabaseAdmin.from(TABLE).upsert(payload, { onConflict: "user_id" });
}
