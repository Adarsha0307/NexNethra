import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Sends a message to Google Gemini API
 * @param {string} prompt The user prompt
 * @param {string} systemInstruction Optional system instructions to guide the model
 * @param {boolean} jsonMode If true, requests JSON response
 * @returns {Promise<string|null>} The generated text response, or null on failure
 */
export async function askGemini(prompt, systemInstruction, jsonMode = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (jsonMode) {
      payload.generationConfig = {
        responseMimeType: "application/json"
      };
    }

    // Using gemini-1.5-flash as the standard reliable, fast model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API returned error status:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.trim() : null;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}
