import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function headersFor(kind: "anon" | "service") {
  const key =
    kind === "service"
      ? process.env.SUPABASE_SERVICE_ROLE!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return { apikey: key, Authorization: `Bearer ${key}` };
}

export async function GET(request: Request) {
  const useService = new URL(request.url).searchParams.get("use") === "service";
  const mode = useService ? "service_role" : "anon/publishable";
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const response = await fetch(`${base}/rest/v1/prices?select=id&limit=1`, {
      headers: headersFor(useService ? "service" : "anon"),
    });
    const body = await response.json().catch(() => ({}));
    return NextResponse.json({ ok: response.ok, status: response.status, by: mode, body });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message, by: mode }, { status: 500 });
  }
}
