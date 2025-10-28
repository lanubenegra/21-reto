import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/sendgrid";

export const dynamic = "force-dynamic";

const REQUIRED_KEYS = [
  "SENDGRID_API_KEY",
  "SENDGRID_FROM",
  "SENDGRID_FROM_NAME",
  "SENDGRID_TEMPLATE_VERIFY_EMAIL",
  "SENDGRID_TEMPLATE_RESET_PASSWORD",
  "SENDGRID_TEMPLATE_PASSWORD_CHANGED",
  "NEXT_PUBLIC_BASE_URL",
  "SUPPORT_EMAIL",
];

function hasEnv(key: string) {
  return process.env[key] ? "✓" : "—";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = url.searchParams.get("to") ?? "";
  const mode = (url.searchParams.get("mode") ?? "check").toLowerCase();

  const summary = Object.fromEntries(REQUIRED_KEYS.map((key) => [key, hasEnv(key)]));

  if (mode === "check" || !to) {
    return NextResponse.json({
      ok: true,
      summary,
      note: "Añade ?mode=send&to=correo o ?mode=send-fallback&to=correo para probar el envío.",
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    });
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: "invalid_to" }, { status: 400 });
  }

  if (mode === "send") {
    const templateId = process.env.SENDGRID_TEMPLATE_VERIFY_EMAIL;
    if (!templateId) {
      return NextResponse.json(
        { error: "missing_template", detail: "SENDGRID_TEMPLATE_VERIFY_EMAIL no está configurado." },
        { status: 400 },
      );
    }

    const result = await sendEmail({
      to,
      templateId,
      dynamicTemplateData: {
        verify_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/auth/signin`,
        site_url: process.env.NEXT_PUBLIC_BASE_URL ?? "",
        support_email: process.env.SUPPORT_EMAIL ?? "",
        year: new Date().getFullYear(),
        tag: "diag-send",
      },
      tag: "diag-send",
      subject: "Diagnóstico SendGrid (plantilla)",
    });

    return NextResponse.json({ sent: result, summary });
  }

  if (mode === "send-fallback") {
    const result = await sendEmail({
      to,
      subject: "Diagnóstico SendGrid (fallback)",
      text: "Esto es un envío de prueba sin plantilla, enviado directamente con fetch.",
      tag: "diag-send-fallback",
    });
    return NextResponse.json({ sent: result, summary });
  }

  return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
}
