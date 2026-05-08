import type { AppSettings } from '../types';

export interface FirewallResult {
  passed: boolean;
  blockedBy?: string;
  sanitizedText: string;
}

const DEFAULT_RULES = {
  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phones: /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  creditCards: /(?:\d[ -]*?){13,16}/g, // simplistic
  apiKeys: /(sk-[a-zA-Z0-9]{32,}|AIza[0-9A-Za-z-_]{35})/g,
  ssn: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g
};

export const runFirewall = (text: string, settings: AppSettings['firewall']): FirewallResult => {
  if (!settings.enabled) {
    return { passed: true, sanitizedText: text };
  }

  let sanitizedText = text;

  // Check default rules
  for (const [ruleName, regex] of Object.entries(DEFAULT_RULES)) {
    if (settings.rules[ruleName as keyof typeof settings.rules]) {
      if (regex.test(sanitizedText)) {
        if (settings.mode === 'block') {
          return { passed: false, blockedBy: ruleName, sanitizedText: text };
        } else {
          sanitizedText = sanitizedText.replace(regex, '[REDACTED]');
        }
      }
    }
  }

  // Check custom rules
  for (const customRule of settings.customRules) {
    if (!customRule.trim()) continue;
    try {
      const regex = new RegExp(customRule, 'g');
      if (regex.test(sanitizedText)) {
        if (settings.mode === 'block') {
          return { passed: false, blockedBy: `Custom Rule (${customRule})`, sanitizedText: text };
        } else {
          sanitizedText = sanitizedText.replace(regex, '[REDACTED]');
        }
      }
    } catch (e) {
      console.warn('Invalid custom regex rule', customRule);
    }
  }

  return { passed: true, sanitizedText };
};
