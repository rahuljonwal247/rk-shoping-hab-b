// src/utils/email.ts
import sgMail from '@sendgrid/mail';
import { env } from '../config/env';
import { logger } from '../config/logger';

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!env.SENDGRID_API_KEY) {
    logger.warn(`[Email skipped - no SENDGRID_API_KEY] To: ${options.to}, Subject: ${options.subject}`);
    return;
  }

  try {
    await sgMail.send({
      from: { email: env.EMAIL_FROM, name: 'E-Commerce Platform' },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info(`Email sent to ${options.to}`);
  } catch (err) {
    logger.error(`Failed to send email to ${options.to}:`, err);
    throw err;
  }
}

export function orderConfirmationEmail(orderNumber: string, items: any[], total: number): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Confirmation</h2>
      <p>Your order <strong>#${orderNumber}</strong> has been placed successfully!</p>
      <h3>Items:</h3>
      <ul>${items.map(i => `<li>${i.name} x${i.quantity} - $${i.price}</li>`).join('')}</ul>
      <p><strong>Total: $${total.toFixed(2)}</strong></p>
      <p>You will receive shipping updates via email.</p>
    </div>
  `;
}
