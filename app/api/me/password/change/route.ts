import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

import { updatePassword } from "@/lib/server/user-store";
import { rateLimit } from "@/lib/server/rate-limit";
import { getClientIp } from "@/lib/server/request";

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

const schema = z.object({
  email: z.string().email(),
  currentPassword: z.string().min(8),
  newPassword: z.string().min(10),
});

export async function POST(request: Request) {
  const payload = schema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ message: "Datos incompletos." }, { status: 400 });
  }

  const { email, currentPassword, newPassword } = payload.data;

  const ip = getClientIp(request);
  if (!rateLimit(`change-password:${ip}:${email}`, 5, 60_000)) {
    return NextResponse.json({ message: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }

  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (error || !data?.user?.id) {
    return NextResponse.json({ message: "Contraseña actual incorrecta." }, { status: 400 });
  }

  try {
    await updatePassword(data.user.id, newPassword);
  } catch (err) {
    console.error("[me.password.change] update failed", err);
    return NextResponse.json({ message: "No pudimos actualizar la contraseña." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
