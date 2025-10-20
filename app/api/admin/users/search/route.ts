import { NextResponse } from "next/server";

import { assertRole, requireSession } from "@/lib/auth-roles";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await requireSession();
  assertRole(session, ["support", "admin", "superadmin"]);

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (!query) {
    return NextResponse.json({ profiles: [], entitlements: [], orders: [] });
  }

  const [profilesRes, entitlementsRes, ordersRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, email, display_name, country, role, whatsapp, created_at")
      .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`),
    supabaseAdmin
      .from("entitlements")
      .select("*")
      .ilike("email", `%${query}%`),
    supabaseAdmin
      .from("orders")
      .select("*")
      .ilike("email", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    profiles: profilesRes.data ?? [],
    entitlements: entitlementsRes.data ?? [],
    orders: ordersRes.data ?? [],
  });
}
