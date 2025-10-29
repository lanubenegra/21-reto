import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

export async function createUser(
  name: string,
  email: string,
  password: string,
  options?: { redirectTo?: string }
) {
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
    email_confirm: false,
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

  let verificationUrl: string | null = null;
  try {
    const response = options?.redirectTo
      ? await supabaseAdmin.auth.admin.generateLink({
          type: "signup",
          email: normalizedEmail,
          password,
          options: { redirectTo: options.redirectTo },
        })
      : await supabaseAdmin.auth.admin.generateLink({
          type: "signup",
          email: normalizedEmail,
          password,
        });
    if (response.error) {
      console.error("[auth] generate verify link error", response.error.message);
    } else {
      verificationUrl = response.data?.properties?.action_link ?? null;
    }
  } catch (error) {
    console.error("[auth] generate verify link exception", error);
  }

  return {
    id: user.id,
    name: displayName,
    email: normalizedEmail,
    createdAt: user.created_at ?? new Date().toISOString(),
    verificationUrl,
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

  const confirmedAt =
    authRes.data.user.email_confirmed_at ??
    authRes.data.user.confirmed_at ??
    null;
  if (!confirmedAt) {
    // Supabase permitió el login aunque no esté verificado; cerramos sesión y negamos.
    await supabaseAnon.auth.signOut();
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

export async function getAuthUserWithProfileByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, email, created_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!profile?.id) {
    return null;
  }

  const { data: authData, error } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (error || !authData?.user) {
    return null;
  }

  return {
    auth: authData.user,
    profile: profile as ProfileRow,
  };
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
  return { token, expiresAt: Date.now() + RESET_TOKEN_TTL_MS };
}

export async function updatePassword(userId: string, newPassword: string) {
  await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });

  const { data: credential } = await supabaseAdmin
    .from("user_credentials")
    .select("password_version")
    .eq("user_id", userId)
    .maybeSingle();

  const newHash = await bcrypt.hash(newPassword, 12);
  const nextVersion = (credential?.password_version ?? 0) + 1;

  await supabaseAdmin.from("user_credentials").upsert({
    user_id: userId,
    password_hash: newHash,
    password_version: nextVersion,
    updated_at: new Date().toISOString(),
  });
}

export type { StoredUser };
