import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Sku = "agenda" | "retos" | "combo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sku = searchParams.get("sku") as Sku | null;
  const country = (searchParams.get("country") || "US").toUpperCase();
  if (!sku) return NextResponse.json({ message: "sku requerido" }, { status: 400 });

  const { data: overrides } = await supabaseAdmin
    .from("prices")
    .select("provider")
    .eq("product", sku)
    .eq("country", country)
    .eq("active", true)
    .maybeSingle();

  const provider = overrides?.provider ?? (country === "CO" ? "wompi" : "stripe");

  const { data: row } = await supabaseAdmin
    .from("prices")
    .select("*")
    .eq("product", sku)
    .eq("provider", provider)
    .eq("country", country)
    .eq("active", true)
    .maybeSingle();

  const fallback = await supabaseAdmin
    .from("prices")
    .select("*")
    .eq("product", sku)
    .eq("provider", provider)
    .eq("country", "DEFAULT")
    .eq("active", true)
    .maybeSingle();

  const price = row ?? fallback.data ?? null;
  if (!price?.external_id) return NextResponse.json({ message: "precio no configurado" }, { status: 400 });

  return NextResponse.json({ provider, url: price.external_id });
}
