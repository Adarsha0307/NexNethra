import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504, 529]);
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function askOpenRouter(prompt, systemInstruction, jsonMode = false) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const payload = {
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    messages
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5175',
          'X-Title': 'Nexnetra'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `OpenRouter API returned error status: ${response.status} ${errorText}`;
        console.error(`[openrouter] Attempt ${attempt + 1}:`, lastError);

        const retryAfter = response.headers.get('Retry-After');
        if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
          const waitMs = retryAfter
            ? Number(retryAfter) * 1000
            : (attempt + 1) * 2000;
          console.log(`[openrouter] Retrying in ${waitMs}ms...`);
          await sleep(waitMs);
          continue;
        }
        return null;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      return text ? text.trim() : null;
    } catch (error) {
      lastError = `Network error calling OpenRouter: ${error.message}`;
      console.error(`[openrouter] Attempt ${attempt + 1}:`, lastError);
      if (attempt < MAX_RETRIES) {
        const waitMs = (attempt + 1) * 1000;
        console.log(`[openrouter] Retrying in ${waitMs}ms...`);
        await sleep(waitMs);
        continue;
      }
    }
  }

  console.error('[openrouter] All retry attempts failed:', lastError);
  return null;
}
