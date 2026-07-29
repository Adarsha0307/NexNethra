export function buildAssistantReply(prompt) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes('phish') || normalized.includes('email')) {
    return {
      title: 'Phishing guidance',
      summary: 'Treat the message as suspicious until verified through a trusted channel.',
      actions: [
        'Do not click links or open attachments.',
        'Report the message to your security team or email provider.',
        'Review account activity and reset credentials if needed.'
      ]
    };
  }

  if (normalized.includes('url') || normalized.includes('link')) {
    return {
      title: 'URL review',
      summary: 'Inspect the domain, check for urgency tactics, and avoid shortened links when possible.',
      actions: [
        'Confirm the sender and destination domain.',
        'Hover or inspect the link before clicking.',
        'Use a safe browser or internal link-checking tool if available.'
      ]
    };
  }

  if (normalized.includes('password')) {
    return {
      title: 'Password hygiene',
      summary: 'A strong password should be long, unique, and stored in a password manager.',
      actions: [
        'Use at least 16 characters with mixed complexity.',
        'Avoid reusing passwords across accounts.',
        'Enable MFA wherever possible.'
      ]
    };
  }

  return {
    title: 'Cybersecurity support',
    summary: 'I can help you assess suspicious messages, links, and weak password habits with practical next steps.',
    actions: [
      'Describe the suspicious message or URL.',
      'Share the context, such as whether it came by email or chat.',
      'Ask for a risk evaluation or response plan.'
    ]
  };
}
