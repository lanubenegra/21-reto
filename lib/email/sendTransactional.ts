import { sendEmail } from "./sendgrid";

type DynamicTemplatePayload = {
  to: string;
  templateId: string;
  dynamicTemplateData: Record<string, unknown>;
  subject?: string;
};

export async function sendTemplate({
  to,
  templateId,
  dynamicTemplateData,
  subject,
}: DynamicTemplatePayload) {
  const result = await sendEmail({
    to,
    templateId,
    dynamicTemplateData,
    subject,
  });

  return result.ok;
}
