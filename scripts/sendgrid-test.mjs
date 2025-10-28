import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
import sgMail from "@sendgrid/mail";

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("Missing SENDGRID_API_KEY");
}

if (!process.env.SENDGRID_FROM) {
  throw new Error("Missing SENDGRID_FROM");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const to = process.env.SENDGRID_TEST_TO || process.env.SUPPORT_EMAIL || process.env.SENDGRID_FROM;

const msg = {
  to,
  from: {
    email: process.env.SENDGRID_FROM,
    name: process.env.SENDGRID_FROM_NAME || "Ministerio Maná",
  },
  subject: "SendGrid test desde script",
  text: "Si lees esto, la clave SendGrid funciona.",
  html: "<p><strong>Si lees esto, la clave SendGrid funciona.</strong></p>",
};

try {
  const [response] = await sgMail.send(msg);
  console.log("Status:", response.statusCode);
} catch (error) {
  console.error("Error enviando:", error);
  if (error.response) {
    console.error(error.response.body);
  }
  process.exit(1);
}
