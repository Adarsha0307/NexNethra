import { askOpenRouter } from '../utils/openrouter.js';
import { askGemini } from '../utils/gemini.js';
import { scanUrl } from './urlScanner/index.js';

function scoreToLabel(score) {
  if (score >= 80) return 'Low risk';
  if (score >= 50) return 'Medium risk';
  return 'High risk';
}

function cleanJsonResponse(text) {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
  return cleaned.trim();
}

export async function analyzeUrl(url) {
  return scanUrl(url);
}

export async function analyzeEmail(text) {
  const normalized = (text || '').trim();
  
  if (!normalized) {
    return {
      score: 0,
      label: 'No input',
      issues: ['Please provide email content to analyze.'],
      recommendations: ['Paste the email content to review it.']
    };
  }

  // Attempt AI API Analysis first (OpenRouter -> Gemini)
  const systemInstruction = "You are a phishing email threat analyzer. Respond ONLY with a valid JSON object matching this schema: { \"score\": number, \"label\": \"Low risk\" | \"Medium risk\" | \"High risk\", \"issues\": string[], \"recommendations\": string[] }";
  const prompt = `Perform a cybersecurity threat analysis of this email content:
    ---
    ${normalized}
    ---
    Identify phishing patterns, urgency language, deceptive requests, sender/receiver discrepancies, or suspicious links.`;
  
  let rawResult = await askOpenRouter(prompt, systemInstruction, true);
  if (!rawResult) {
    rawResult = await askGemini(prompt, systemInstruction, true);
  }

  const cleaned = cleanJsonResponse(rawResult);
  if (cleaned) {
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.score === 'number' && Array.isArray(parsed.issues)) {
        return {
          score: Math.max(0, Math.min(100, parsed.score)),
          label: parsed.label || scoreToLabel(parsed.score),
          issues: parsed.issues,
          recommendations: parsed.recommendations || ['Be cautious about taking immediate action based on this message.']
        };
      }
    } catch (err) {
      console.error('Failed to parse AI Email analysis response, falling back to heuristics:', err);
    }
  }

  // Local Heuristic Fallback
  const issues = [];
  let score = 85;

  if (/urgent|immediately|act now|verify account|suspended|security alert|action required/i.test(normalized)) {
    issues.push('The message uses high-urgency language typical of phishing campaigns.');
    score -= 20;
  }

  if (/click here|login|password|reset|verify link|billing update/i.test(normalized)) {
    issues.push('The email prompts the user to perform credential-related actions or click external links.');
    score -= 20;
  }

  if (/dear customer|valuable customer|undisclosed-recipients/i.test(normalized)) {
    issues.push('Generic greetings instead of your name are common in mass-phishing campaigns.');
    score -= 10;
  }

  if (/bank|wire transfer|payment|invoice|credit card|crypto/i.test(normalized)) {
    issues.push('The email contains words associated with financial transactions or invoice updates.');
    score -= 10;
  }

  if (/attachment|document|invoice\.pdf|download/i.test(normalized)) {
    issues.push('The message references attachments or document downloads, a common malware delivery vector.');
    score -= 10;
  }

  if (/microsoft|google|apple|amazon|netflix|paypal/i.test(normalized) && /verify|update|confirm|restore/i.test(normalized)) {
    issues.push('The email spoofs a well-known brand requesting account action, a classic phishing tactic.');
    score -= 15;
  }

  if (issues.length === 0) {
    if (Math.random() > 0.4) {
      issues.push('No obvious phishing indicators were detected in the text.');
    } else {
      issues.push('The email content appears benign. Standard caution is still recommended.');
    }
  }

  const noise = Math.floor(Math.random() * 7) - 3;

  return {
    score: Math.max(0, Math.min(100, score + noise)),
    label: scoreToLabel(score + noise),
    issues,
    recommendations: [
      'Verify the sender\'s email address matches the company they claim to represent.',
      'Contact the sender via a known trusted channel, rather than replying.',
      'Avoid clicking links or downloading attachments from unverified senders.'
    ]
  };
}

export async function analyzePassword(password) {
  const normalized = password || '';
  
  if (!normalized) {
    return {
      score: 0,
      label: 'No input',
      issues: ['Please provide a password to analyze.'],
      recommendations: ['Enter a password to measure its strength.']
    };
  }

  // Attempt AI API Analysis first (OpenRouter -> Gemini)
  const systemInstruction = "You are a password security strength analyzer. Respond ONLY with a valid JSON object matching this schema: { \"score\": number, \"label\": \"Low risk\" | \"Medium risk\" | \"High risk\", \"issues\": string[], \"recommendations\": string[] }. Do NOT include the password itself in your analysis response.";
  const prompt = `Perform a strength and safety analysis of this password (evaluating length, character diversity, and vulnerability to common word dictionary attacks): '${normalized}'. Do not show the password itself in your output.`;
  
  let rawResult = await askOpenRouter(prompt, systemInstruction, true);
  if (!rawResult) {
    rawResult = await askGemini(prompt, systemInstruction, true);
  }

  const cleaned = cleanJsonResponse(rawResult);
  if (cleaned) {
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.score === 'number' && Array.isArray(parsed.issues)) {
        return {
          score: Math.max(0, Math.min(100, parsed.score)),
          label: parsed.label || (parsed.score >= 80 ? 'Low risk' : parsed.score >= 50 ? 'Medium risk' : 'High risk'),
          issues: parsed.issues,
          recommendations: parsed.recommendations || ['Use a unique password for each account.']
        };
      }
    } catch (err) {
      console.error('Failed to parse AI Password analysis response, falling back to heuristics:', err);
    }
  }

  // Local Heuristic Fallback
  const issues = [];
  let score = 20; // Weak baseline

  if (normalized.length >= 16) {
    score += 40;
  } else if (normalized.length >= 12) {
    score += 25;
  } else if (normalized.length >= 8) {
    score += 10;
  }

  if (/[A-Z]/.test(normalized) && /[a-z]/.test(normalized)) {
    score += 15;
  } else {
    issues.push('The password lacks case diversity (needs both uppercase and lowercase letters).');
  }

  if (/\d/.test(normalized)) {
    score += 15;
  } else {
    issues.push('The password lacks numbers.');
  }

  if (/[^A-Za-z0-9]/.test(normalized)) {
    score += 15;
  } else {
    issues.push('The password lacks special characters.');
  }

  if (/(password|123456|qwerty|letmein|admin)/i.test(normalized)) {
    issues.push('The password contains common weak/obvious patterns.');
    score -= 30;
  }

  if (normalized.length < 8) {
    issues.push('The password is extremely short (under 8 characters).');
    score -= 20;
  } else if (normalized.length < 12) {
    issues.push('The password is under the recommended 12 characters.');
  }

  if (issues.length === 0) {
    issues.push('No weakness detected. Password meets basic length and complexity criteria.');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    label: score >= 80 ? 'Low risk' : score >= 50 ? 'Medium risk' : 'High risk',
    issues,
    recommendations: [
      'Use a random password generator or passphrase style password.',
      'Enable multi-factor authentication (MFA) on accounts that support it.',
      'Never reuse this password on multiple websites.'
    ]
  };
}
