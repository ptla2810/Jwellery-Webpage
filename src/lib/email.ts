import "server-only";
import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string };

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

export function emailConfigured() {
  return !!process.env.SMTP_HOST;
}

export async function sendEmail(mail: Mail): Promise<void> {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[email:dev] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`);
    } else {
      console.warn(`[email] SMTP not configured; email "${mail.subject}" was not sent`);
    }
    return;
  }
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  try {
    await transport.sendMail({ from: process.env.EMAIL_FROM, ...mail });
  } catch (err) {
    console.error("[email] send failed:", (err as Error).message);
  }
}
