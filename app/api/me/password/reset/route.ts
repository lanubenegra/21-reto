import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { updatePassword } from "@/lib/server/user-store";

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

  if (!isStrongPassword(password)) {
    console.warn("[auth.reset.v2] weak password", { requestId, length: password.length });
    return NextResponse.json(WEAK_PASSWORD_ERROR, { status: 400, headers: responseHeaders });
  }

  // Decode token for diagnostics; do not rely on decoded payload for auth.
  try {
    const decoded = jwt.decode(token) as Record<string, unknown> | null;
    const exp = typeof decoded?.exp === "number" ? decoded.exp * 1000 : null;
    if (exp && exp <= Date.now()) {
      console.warn("[auth.reset.v2] token expired (decoded)", { requestId, exp, now: Date.now() });
      return NextResponse.json(INVALID_TOKEN_ERROR, { status: 400, headers: responseHeaders });
    }
  } catch (error) {
    console.error("[auth.reset.v2] token decode failed", { requestId, error: (error as Error).message });
  }

  // Validate token against Supabase using the service role client.
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const userId = data?.user?.id ?? null;

  if (error || !userId) {
    console.error("[auth.reset.v2] invalid token (auth.getUser)", {
      requestId,
      error: error?.message ?? null,
    });
    return NextResponse.json(INVALID_TOKEN_ERROR, { status: 400, headers: responseHeaders });
  }

  try {
    await updatePassword(userId, password);
  } catch (error) {
    console.error("[auth.reset.v2] update password failed", {
      requestId,
      userId,
      error: (error as Error).message,
    });
    return NextResponse.json({ message: "No pudimos actualizar la contraseña. Intenta más tarde." }, { status: 500, headers: responseHeaders });
  }

  console.info("[auth.reset.v2] password updated", { requestId, userId });
  return NextResponse.json({ ok: true }, { status: 200, headers: responseHeaders });
}
