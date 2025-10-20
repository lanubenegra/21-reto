import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env for Supabase");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const userId = process.argv[2];
const newPassword = process.argv[3];

if (!userId || !newPassword) {
  console.error("Usage: node scripts/set-password.mjs <userId> <newPassword>");
  process.exit(1);
}

const run = async () => {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await supabase
    .from("user_credentials")
    .upsert({
      user_id: userId,
      password_hash: hashed,
      password_version: 0,
      updated_at: new Date().toISOString(),
    });
  console.log("Password updated for", data.user?.email ?? userId);
};

run();
