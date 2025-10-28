export type SendInput = {
  to: string;
  subject?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
  text?: string;
  html?: string;
  tag?: string;
};

export type SendEmailResult =
  | { ok: true; status: number; requestId: string }
  | { ok: false; status: number; error: string; requestId: string };

function reqId() {
  return `sg-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export async function sendEmail(input: SendInput): Promise<SendEmailResult> {
  if (process.env.SENDGRID_DISABLED === "1") {
    return { ok: true, status: 202, requestId: "sg-disabled" };
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM;
  const fromName = process.env.SENDGRID_FROM_NAME || "Ministerio Maná";

  if (!apiKey || !from) {
    console.error("[email] missing SENDGRID_API_KEY or SENDGRID_FROM", {
      hasKey: !!apiKey,
      hasFrom: !!from,
      to: input.to,
      templateId: input.templateId,
    });
    return { ok: false, status: 500, error: "missing_env", requestId: "sg-missing" };
  }

  const requestId = reqId();
  const personalization: Record<string, unknown> = {
    to: [{ email: input.to }],
  };

  if (input.subject) {
    personalization.subject = input.subject;
  }

  if (input.dynamicTemplateData) {
    personalization.dynamic_template_data = input.dynamicTemplateData;
  }

  const body: Record<string, unknown> = {
    from: { email: from, name: fromName },
    personalizations: [personalization],
  };

  if (input.templateId) {
    body.template_id = input.templateId;
  } else if (input.html || input.text) {
    const content: Array<{ type: string; value: string }> = [];
    if (input.html) content.push({ type: "text/html", value: input.html });
    if (input.text) content.push({ type: "text/plain", value: input.text });
    body.content = content;
    if (input.subject) {
      body.subject = input.subject;
    }
  } else {
    body.subject = input.subject ?? "Notificación Devocional Maná";
    body.content = [
      {
        type: "text/plain",
        value: "Notificación sin contenido. Revisa el panel de administración para más detalles.",
      },
    ];
  }

  if (input.tag) {
    body.categories = [input.tag];
  }

  if (process.env.SENDGRID_SANDBOX === "1") {
    body.mail_settings = {
      sandbox_mode: { enable: true },
    };
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 202) {
      console.info(`[email:${requestId}] 202 Accepted`, {
        to: input.to,
        templateId: input.templateId ?? "raw",
      });
      return { ok: true, status: 202, requestId };
    }

    const text = await response.text().catch(() => "");
    console.error(`[email:${requestId}] failed`, {
      to: input.to,
      templateId: input.templateId ?? "raw",
      status: response.status,
      body: text.slice(0, 500),
    });
    return {
      ok: false,
      status: response.status,
      error: text || "sendgrid_error",
      requestId,
    };
  } catch (error) {
    console.error(`[email:${requestId}] exception`, {
      to: input.to,
      templateId: input.templateId ?? "raw",
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
      requestId,
    };
  }
}
