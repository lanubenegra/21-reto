import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const uid = (req.headers.get("x-nextauth-uid") || "").trim();
  if (!uid) {
    return NextResponse.json({ role: "user" });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    console.error("[me role] failed to fetch role", error.message);
  }
  return NextResponse.json({ role: data?.role ?? "user" });
}
