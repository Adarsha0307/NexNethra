const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set in environment variables.');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }

  return response.json();
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
