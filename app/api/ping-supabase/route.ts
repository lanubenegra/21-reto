import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const db = supabaseAdmin();

  try {
    const { error } = await db.from("profiles").select("id").limit(1);
    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({
          ok: true,
          message: "Conexión OK, tabla profiles todavía no existe (ejecuta el SQL).",
        });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Conexión OK y tabla profiles accesible." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
