import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';

export async function askNvidia(prompt, systemInstruction, jsonMode = false) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
      model: process.env.NVIDIA_MODEL || DEFAULT_MODEL,
      messages,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    };

    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA API returned error status:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    return text ? text.trim() : null;
  } catch (error) {
    console.error('Error calling NVIDIA API:', error);
    return null;
  }
}
