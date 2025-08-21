import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, html: string) {
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({ to, from: process.env.SENDGRID_FROM!, subject, html });
      return;
    } catch (e) {
      console.error("SendGrid error", e);
    }
  }
  if (process.env.SMTP_HOST && process.env.FROM_EMAIL) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      await transporter.sendMail({ from: process.env.FROM_EMAIL, to, subject, html });
      return;
    } catch (e) {
      console.error("SMTP error", e);
    }
  }
  console.warn("No email provider configured; skipping email.");
}
