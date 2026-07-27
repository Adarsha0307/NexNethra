const BRANDS = [
  { name: 'Google', domains: ['google.com','googleapis.com','gmail.com','youtube.com','blogger.com','android.com'] },
  { name: 'Facebook', domains: ['facebook.com','fb.com','fbcdn.net','messenger.com','meta.com'] },
  { name: 'Microsoft', domains: ['microsoft.com','live.com','outlook.com','office.com','office365.com','azure.com','msn.com','bing.com','windows.com','linkedin.com'] },
  { name: 'Apple', domains: ['apple.com','icloud.com','me.com','mac.com'] },
  { name: 'Amazon', domains: ['amazon.com','amazonaws.com','aws.amazon.com','primevideo.com','audible.com'] },
  { name: 'PayPal', domains: ['paypal.com','paypalobjects.com'] },
  { name: 'Netflix', domains: ['netflix.com','nflximg.com','nflxvideo.net'] },
  { name: 'Twitter', domains: ['twitter.com','t.co','x.com'] },
  { name: 'Instagram', domains: ['instagram.com','cdninstagram.com'] },
  { name: 'LinkedIn', domains: ['linkedin.com','licdn.com'] },
  { name: 'GitHub', domains: ['github.com','githubusercontent.com'] },
  { name: 'WhatsApp', domains: ['whatsapp.com','whatsapp.net'] },
  { name: 'Telegram', domains: ['telegram.org','t.me'] },
  { name: 'Discord', domains: ['discord.com','discordapp.com','discord.gg','discordapp.net'] },
  { name: 'Slack', domains: ['slack.com','slack-edge.com'] },
  { name: 'Dropbox', domains: ['dropbox.com','dropboxstatic.com'] },
  { name: 'Adobe', domains: ['adobe.com','adobestock.com'] },
  { name: 'Yahoo', domains: ['yahoo.com','yahoogroups.com','yimg.com'] },
  { name: 'eBay', domains: ['ebay.com','ebayimg.com','ebaystatic.com'] },
  { name: 'Bank of America', domains: ['bankofamerica.com','bofa.com'] },
  { name: 'Chase', domains: ['chase.com','jpmorgan.com'] },
  { name: 'Wells Fargo', domains: ['wellsfargo.com'] },
  { name: 'Coinbase', domains: ['coinbase.com','coinbaseprime.com'] },
  { name: 'Binance', domains: ['binance.com','binance.us'] },
];

export function detectBrandImpersonation(hostname, registrableDomain) {
  if (!hostname || !registrableDomain) return [];
  const findings = [];
  const lowerHost = hostname.toLowerCase();
  const lowerReg = registrableDomain.toLowerCase();
  const hostnameWords = lowerHost.split(/[.-]/).filter(Boolean);

  for (const brand of BRANDS) {
    if (brand.domains.some(d => lowerReg === d)) continue;
    const brandNameInPath = hostnameWords.some(word => word === brand.name.toLowerCase() || brand.name.split(' ').some(part => part.toLowerCase() === word));
    if (brandNameInPath) findings.push({ severity: 'high', category: 'brand_impersonation', title: `Possible ${brand.name} Impersonation`, description: `Hostname contains "${brand.name}" but the registered domain "${registrableDomain}" does not match ${brand.name}'s official domains.`, brand: brand.name });
  }
  return findings;
}
