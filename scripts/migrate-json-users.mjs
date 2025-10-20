import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function randomPassword() {
  const raw = crypto.randomBytes(12).toString("base64url");
  return `${raw}Aa1!`;
}

async function loadJsonUsers() {
  const filePath = path.join(rootDir, "data", "users.json");
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.users)) {
      return [];
    }
    return parsed.users;
  } catch (error) {
    console.error("Unable to read data/users.json:", error.message);
    return [];
  }
}

async function migrateUser(user) {
  const email = normalizeEmail(user.email);
  if (!email) {
    console.warn("Skipping user without email:", user);
    return;
}
  const name = user.name || email;
  const passwordHash = user.passwordHash;

  if (!passwordHash) {
    console.warn(`Skipping ${email}: missing password hash.`);
    return;
  }

  const { data: existing } = await supabase.auth.admin.listUsers({ email });
  let authUser = existing?.users?.[0] ?? null;

  if (!authUser) {
    const tempPassword = randomPassword();
    const createRes = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createRes.error || !createRes.data.user) {
      console.error(`Failed to create auth user for ${email}:`, createRes.error?.message);
      return;
    }
    authUser = createRes.data.user;
    console.log(`Created auth user for ${email}`);
  } else {
    console.log(`Auth user already exists for ${email}, reusing id ${authUser.id}`);
  }

  const userId = authUser.id;

  await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        display_name: name,
        role: "user",
      },
      { onConflict: "id" },
    );

  await supabase.from("user_credentials").upsert({
    user_id: userId,
    password_hash: passwordHash,
    password_version: user.password_version ?? 0,
    updated_at: new Date().toISOString(),
  });

  await supabase.from("entitlements").update({ user_id: userId }).eq("email", email);
  await supabase.from("orders").update({ user_id: userId }).eq("email", email);

  console.log(`Migrated user ${email} -> ${userId}`);
}

async function run() {
  const users = await loadJsonUsers();
  if (!users.length) {
    console.log("No users found in JSON; nothing to migrate.");
    return;
  }

  for (const user of users) {
    try {
      await migrateUser(user);
    } catch (error) {
      console.error(`Migration failed for ${user.email}:`, error);
    }
  }

  console.log("Migration complete.");
}

run().catch((error) => {
  console.error("Migration aborted:", error);
  process.exit(1);
});
