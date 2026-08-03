const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev';

  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is NOT set in environment variables.');
    throw new Error('RESEND_API_KEY is not set in environment variables.');
  }

  console.log(`[email] Sending to: ${to}`);
  console.log(`[email] From: ${from}`);
  console.log(`[email] RESEND_API_KEY: ${apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (loaded)` : 'undefined'}`);

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  const result = await response.json();
  console.log('[email] Resend status:', response.status);
  console.log('[email] Resend result:', JSON.stringify(result));

  if (!response.ok) {
    throw new Error(`Resend API error (${response.status}): ${JSON.stringify(result)}`);
  }

  return result;
}

export async function sendVerificationCodeEmail(to, code) {
  return sendEmail({
    to,
    subject: 'Verify your Nexnetra account',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Use the code below to activate your Nexnetra account. This code expires in 15 minutes.</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p style="color: #666; font-size: 13px;">
          If you didn't create a Nexnetra account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to, code) {
  return sendEmail({
    to,
    subject: 'Reset your Nexnetra password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Use the code below to reset your Nexnetra password. This code expires in 15 minutes.</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p style="color: #666; font-size: 13px;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
