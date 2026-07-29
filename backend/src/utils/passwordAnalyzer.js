const COMMON_PASSWORDS = new Set([
  '123456', '123456789', '12345678', '12345', '1234567',
  'password', 'password1', 'password123', 'Password1', 'Password1!',
  'qwerty', 'qwerty123', '111111', '123123', 'abc123',
  'letmein', 'welcome', 'welcome1', 'admin', 'admin123',
  'iloveyou', 'monkey', 'dragon', 'football', 'baseball',
  'sunshine', 'princess', 'trustno1', '000000', '1q2w3e4r',
  'qazwsx', 'zaq12wsx', '1qaz2wsx', 'passw0rd', 'p@ssw0rd',
  'changeme', 'letmein123', 'master', 'superman', 'batman'
]);

export function analyzePassword(password, context = {}) {
  const reasons = [];

  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, score: 0, reasons: ['Password is required.'] };
  }

  if (password.length < 10) {
    reasons.push('Password must be at least 10 characters long.');
  }
  if (password.length > 128) {
    reasons.push('Password is unreasonably long (max 128 characters).');
  }

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    reasons.push('This password is far too common and easy to guess.');
  }

  if (/^\d+$/.test(password)) {
    reasons.push('Password cannot be all numbers.');
  }

  if (/^(.)\1+$/.test(password)) {
    reasons.push('Password cannot be a single repeated character.');
  }
  if (isSequential(password)) {
    reasons.push('Password cannot be a simple sequence (e.g. abcdef, 123456).');
  }

  const email = (context.email || '').toLowerCase();
  const localPart = email.split('@')[0];
  const first = (context.firstName || '').toLowerCase();
  const last = (context.lastName || '').toLowerCase();

  if (localPart && localPart.length > 2 && lower.includes(localPart)) {
    reasons.push('Password cannot contain your email address.');
  }
  if (first && first.length > 2 && lower.includes(first)) {
    reasons.push('Password cannot contain your first name.');
  }
  if (last && last.length > 2 && lower.includes(last)) {
    reasons.push('Password cannot contain your last name.');
  }

  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  return {
    valid: reasons.length === 0,
    score,
    reasons,
  };
}

function isSequential(str) {
  const s = str.toLowerCase();
  if (s.length < 4) return false;

  let ascending = true;
  let descending = true;

  for (let i = 1; i < s.length; i++) {
    const diff = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (diff !== 1) ascending = false;
    if (diff !== -1) descending = false;
  }

  return ascending || descending;
}
