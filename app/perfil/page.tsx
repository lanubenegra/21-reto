import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import authOptions from "@/auth.config";
import { supabaseServer } from "@/lib/supabase/server";
import ProfileClient from "./ProfileClient";

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin?mode=login");
  }

  const supabase = await supabaseServer();
  const userId = session.user?.id;
  if (!userId) {
    redirect("/auth/signin?mode=login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, country, whatsapp, timezone, photo_url, role, created_at, email")
    .eq("id", userId)
    .maybeSingle();

  const email = session.user.email ?? profile?.email ?? "";

  const { data: entitlementsData } = await supabase
    .from("entitlements")
    .select("product, active, created_at")
    .or(`user_id.eq.${userId},email.eq.${email}`)
    .order("product");

  const entitlements = (entitlementsData ?? []).map((item) => ({
    product: item.product,
    active: item.active,
    created_at: item.created_at,
  }));

  return (
    <main className="min-h-[calc(100vh-120px)] bg-mana-surface/50 px-4 py-10">
      <ProfileClient profile={profile ?? null} email={email} entitlements={entitlements} />
    </main>
  );
}
