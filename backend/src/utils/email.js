import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

const RESEND_API_URL = 'https://api.resend.com/emails';

function getGmailTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.error('[email] GMAIL_USER or GMAIL_APP_PASSWORD is NOT set in environment variables.');
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set to send emails.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function sendWithGmail({ to, subject, html, text }) {
  const user = process.env.GMAIL_USER;
  const from = process.env.EMAIL_FROM || `Nexnetra <${user}>`;

  console.log(`[email] Sending via Gmail to: ${to}`);
  console.log(`[email] From: ${from}`);

  const transporter = getGmailTransport();
  const result = await transporter.sendMail({ from, to, subject, html, text });

  console.log('[email] Gmail send result:', result.messageId, '| response:', result.response);
  return { id: result.messageId };
}

async function sendWithResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev';

  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is NOT set in environment variables.');
    throw new Error('RESEND_API_KEY is not set in environment variables.');
  }

  console.log(`[email] Sending via Resend to: ${to}`);
  console.log(`[email] From: ${from}`);
  console.log(`[email] RESEND_API_KEY: ${apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (loaded)` : 'undefined'}`);

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  const result = await response.json();
  console.log('[email] Resend status:', response.status);
  console.log('[email] Resend result:', JSON.stringify(result));

  if (!response.ok) {
    throw new Error(`Resend API error (${response.status}): ${JSON.stringify(result)}`);
  }

  return result;
}

async function sendWithSendgrid({ to, subject, html, text }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM || 'Nexnetra <nexnethra@gmail.com>';

  if (!apiKey) {
    console.error('[email] SENDGRID_API_KEY is NOT set in environment variables.');
    throw new Error('SENDGRID_API_KEY is not set in environment variables.');
  }

  console.log(`[email] Sending via SendGrid to: ${to}`);
  console.log(`[email] From: ${from}`);
  console.log(`[email] SENDGRID_API_KEY: ${apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (loaded)` : 'undefined'}`);

  sgMail.setApiKey(apiKey);
  const result = await sgMail.send({
    to,
    from: { email: 'nexnethra@gmail.com', name: 'Nexnetra' },
    subject,
    text,
    html,
  });

  const status = result?.[0]?.statusCode;
  console.log('[email] SendGrid status:', status);
  console.log('[email] SendGrid result:', JSON.stringify(result));

  return { id: String(status) };
}

async function sendEmail(payload) {
  if (process.env.EMAIL_PROVIDER === 'gmail') {
    return sendWithGmail(payload);
  }
  if (process.env.EMAIL_PROVIDER === 'sendgrid') {
    return sendWithSendgrid(payload);
  }
  return sendWithResend(payload);
}

export async function sendVerificationCodeEmail(to, code) {
  return sendEmail({
    to,
    subject: `Your Nexnetra verification code is ${code}`,
    text: `Your Nexnetra verification code is ${code}. It expires in 15 minutes. If you didn't create a Nexnetra account, you can safely ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0; padding:24px; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto;">
          <tr>
            <td style="background-color:#ffffff; border-radius:12px; padding:32px;">
              <p style="margin:0 0 16px; color:#4fd1c5; font-size:12px; font-weight:bold; letter-spacing:2px; text-transform:uppercase;">Nexnetra</p>
              <h1 style="margin:0 0 12px; color:#1a202c; font-size:20px; font-weight:bold;">Verify your email</h1>
              <p style="margin:0 0 24px; color:#4a5568; font-size:14px; line-height:1.6;">
                Use the code below to activate your Nexnetra account. This code expires in 15 minutes.
              </p>
              <p style="margin:0 0 24px; padding:16px; background-color:#f7fafc; border:1px solid #e2e8f0; border-radius:8px; color:#1a202c; font-size:32px; font-weight:bold; letter-spacing:6px; text-align:center;">${code}</p>
              <p style="margin:0; color:#718096; font-size:13px; line-height:1.5;">
                If you didn't create a Nexnetra account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

export async function sendPasswordResetEmail(to, code) {
  return sendEmail({
    to,
    subject: `Your Nexnetra password reset code is ${code}`,
    text: `Your Nexnetra password reset code is ${code}. It expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0; padding:24px; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto;">
          <tr>
            <td style="background-color:#ffffff; border-radius:12px; padding:32px;">
              <p style="margin:0 0 16px; color:#4fd1c5; font-size:12px; font-weight:bold; letter-spacing:2px; text-transform:uppercase;">Nexnetra</p>
              <h1 style="margin:0 0 12px; color:#1a202c; font-size:20px; font-weight:bold;">Reset your password</h1>
              <p style="margin:0 0 24px; color:#4a5568; font-size:14px; line-height:1.6;">
                Use the code below to reset your Nexnetra password. This code expires in 15 minutes.
              </p>
              <p style="margin:0 0 24px; padding:16px; background-color:#f7fafc; border:1px solid #e2e8f0; border-radius:8px; color:#1a202c; font-size:32px; font-weight:bold; letter-spacing:6px; text-align:center;">${code}</p>
              <p style="margin:0; color:#718096; font-size:13px; line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}
