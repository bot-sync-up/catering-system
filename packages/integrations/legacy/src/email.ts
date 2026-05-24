import nodemailer from "nodemailer";

export function createMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });
}

export const FROM_ADDRESS =
  process.env.SMTP_FROM ?? "noreply@aneh-hashoel.org.il";
