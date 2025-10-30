import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { consumeResetToken, updatePassword } from "@/lib/server/user-store";
import { defaultEmailContext } from "@/lib/email/context";
import { sendPasswordResetSuccessEmail } from "@/lib/email/notifications";
import { getClientIp } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

type Payload = {
  token?: string;
  access_token?: string;
  password?: string;
};

const WEAK_PASSWORD_ERROR = { message: "La nueva contraseña debe tener al menos 10 caracteres con letras y números." };
const INVALID_TOKEN_ERROR = { message: "Token inválido o expirado" };

function isStrongPassword(password: unknown): password is string {
  return (
    typeof password === "string" &&
    password.length >= 10 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

async function parseBody(request: Request): Promise<{ token?: string; password?: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await request.json().catch(() => ({}))) as Payload | undefined;
    return { token: json?.token ?? json?.access_token, password: json?.password };
  }
  // Fallback: attempt to parse raw text as JSON, otherwise read from query string.
  const raw = await request.text();
  if (raw) {
    try {
      const json = JSON.parse(raw) as Payload;
      return { token: json?.token ?? json?.access_token, password: json?.password };
    } catch {
      // ignore parsing error
    }
  }
  const url = new URL(request.url);
  return { token: url.searchParams.get("token") ?? undefined, password: undefined };
}

export async function POST(request: Request) {
  const { token, password } = await parseBody(request);
  const requestId = randomUUID();
  const responseHeaders = { "x-request-id": requestId };

  console.info("[auth.reset.v2] start", { requestId });

  if (!token || typeof password !== "string") {
    console.warn("[auth.reset.v2] invalid payload", {
      requestId,
      hasToken: Boolean(token),
      hasPassword: typeof password === "string",
    });
    return NextResponse.json({ message: "Datos incompletos" }, { status: 400, headers: responseHeaders });
  }

  const safePassword = password!;

  const ip = getClientIp(request);
  if (!rateLimit(`reset-final:${ip}`, 5, 60_000)) {
    return NextResponse.json({ message: "Intenta de nuevo en un minuto." }, { status: 429, headers: responseHeaders });
  }

  if (!isStrongPassword(safePassword)) {
    console.warn("[auth.reset.v2] weak password", { requestId });
    return NextResponse.json(WEAK_PASSWORD_ERROR, { status: 400, headers: responseHeaders });
  }

  const userId = await consumeResetToken(token);
  if (!userId) {
    console.warn("[auth.reset.v2] invalid or expired custom token", { requestId });
    return NextResponse.json(INVALID_TOKEN_ERROR, { status: 400, headers: responseHeaders });
  }

  try {
    await updatePassword(userId, safePassword);
  } catch (error) {
    console.error("[auth.reset.v2] update password failed", {
      requestId,
      userId,
      error: (error as Error).message,
    });
    return NextResponse.json({ message: "No pudimos actualizar la contraseña. Intenta más tarde." }, { status: 500, headers: responseHeaders });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .maybeSingle();

  const email = profile?.email ?? null;
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
      console.error("[auth.reset.v2] password reset email failed", {
        requestId,
        email,
        status: notify.status,
        error: notify.error,
      });
    }
  }

  console.info("[auth.reset.v2] password updated", { requestId, userId });
  return NextResponse.json({ ok: true }, { status: 200, headers: responseHeaders });
}
