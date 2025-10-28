import { NextResponse } from "next/server";
import { consumeResetToken, updatePassword } from "@/lib/server/user-store";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { defaultEmailContext } from "@/lib/email/context";
import { sendPasswordResetSuccessEmail } from "@/lib/email/notifications";

interface Body {
  token: string;
  password: string;
}

export async function POST(request: Request) {
  const { token, password } = (await request.json()) as Partial<Body>;
  if (!token || !password) {
    return NextResponse.json({ message: "Datos incompletos" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ message: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }
  const userId = await consumeResetToken(token);
  if (!userId) {
    return NextResponse.json({ message: "Token inválido o expirado" }, { status: 400 });
  }
  await updatePassword(userId, password);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .maybeSingle();

  const email = profile?.email;
  if (email) {
    const context = defaultEmailContext(request);
    const notify = await sendPasswordResetSuccessEmail(email, {
      email,
      name: profile?.display_name ?? undefined,
      changeDate: new Date().toISOString(),
      loginUrl: context.loginUrl,
      supportEmail: context.supportEmail,
    });

    if (!notify.ok) {
      console.error("[auth.reset] passwordResetSuccess email failed", {
        email,
        status: notify.status,
        error: notify.error,
      });
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
