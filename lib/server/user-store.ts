import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeEmail } from "@/lib/email";
import { emptyUserState } from "@/lib/user-state";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

type StoredUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type ProfileRow = {
  id: string;
  display_name?: string | null;
  email: string;
  created_at?: string | null;
};

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

function mapProfileToStoredUser(profile: ProfileRow): StoredUser {
  return {
    id: profile.id,
    name: profile.display_name ?? profile.email,
    email: profile.email,
    createdAt: profile.created_at ?? new Date().toISOString(),
  };
}

export async function createUser(name: string, email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Correo inválido.");
  }

  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error("Ya existe una cuenta con este correo electrónico.");
  }

  const createRes = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createRes.error) {
    throw new Error(createRes.error.message);
  }

  const user = createRes.data.user;
  if (!user) {
    throw new Error("No se pudo crear el usuario en Supabase.");
  }

  const displayName = name.trim() || normalizedEmail;

  await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: normalizedEmail,
        display_name: displayName,
        role: "user",
      },
      { onConflict: "id" },
    );

  await supabaseAdmin.from("user_state").upsert({
    user_id: user.id,
    email: normalizedEmail,
    state: JSON.parse(JSON.stringify(emptyUserState())),
    updated_at: new Date().toISOString(),
  });

  return {
    id: user.id,
    name: displayName,
    email: normalizedEmail,
    createdAt: user.created_at ?? new Date().toISOString(),
  };
}

export async function verifyUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const authRes = await supabaseAnon.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (authRes.error || !authRes.data.user) {
    return null;
  }

  const userId = authRes.data.user.id;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, email, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profile) {
    return mapProfileToStoredUser(profile as ProfileRow);
  }

  return {
    id: userId,
    name: authRes.data.user.user_metadata?.name ?? normalizedEmail,
    email: normalizedEmail,
    createdAt: authRes.data.user.created_at ?? new Date().toISOString(),
  };
}

export async function getUserById(id: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, email, created_at")
    .eq("id", id)
    .maybeSingle();

  return profile ? mapProfileToStoredUser(profile as ProfileRow) : null;
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, email, created_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  return profile ? mapProfileToStoredUser(profile as ProfileRow) : null;
}

export async function createResetToken(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!profile?.id) {
    return null;
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await supabaseAdmin
    .from("password_resets")
    .insert({
      user_id: profile.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used: false,
    });

  return { token, expiresAt: Date.now() + RESET_TOKEN_TTL_MS };
}

export async function consumeResetToken(token: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date().toISOString();

  const { data: record } = await supabaseAdmin
    .from("password_resets")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .eq("used", false)
    .gt("expires_at", now)
    .maybeSingle();

  if (!record?.id || !record.user_id) {
    return null;
  }

  await supabaseAdmin
    .from("password_resets")
    .update({ used: true })
    .eq("id", record.id);

  return record.user_id as string;
}

export async function updatePassword(userId: string, newPassword: string) {
  await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
}

export type { StoredUser };
