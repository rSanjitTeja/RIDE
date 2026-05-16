import type { SlmSettings } from '../types';

export const DEFAULT_SLM_SYSTEM_PROMPT = `You are a security policy enforcement agent embedded in an AI coding assistant.

Your job: analyze the developer's prompt BEFORE it is sent to the main AI model, and check if it contains any of the following sensitive information that should NOT leave the organization:

1. Real client or customer names, emails, addresses, phone numbers, or contact details
2. Passwords, API keys, tokens, secrets, private keys, or authentication credentials
3. Credit card numbers, bank account numbers, IBAN codes, or financial account data
4. Social Security Numbers (SSN), Aadhaar numbers, or government-issued ID numbers
5. Medical records, patient data, or healthcare information (PHI/PII)
6. Internal company confidential business data unrelated to coding (e.g., sales figures, HR data, legal documents)

Code, file paths, variable names, technical concepts, and programming questions are ALWAYS safe.

Respond ONLY with valid JSON — no explanations, no markdown, no other text:
{"safe": true, "reason": "No sensitive information detected", "violations": []}

If unsafe:
{"safe": false, "reason": "Brief explanation of what was found", "violations": ["type1", "type2"]}`;

export interface SlmCheckResult {
  safe: boolean;
  reason: string;
  violations: string[];
  skipped?: boolean;   // true if Ollama is unreachable (fail-open)
  latencyMs?: number;
}

export async function checkPromptWithSlm(
  prompt: string,
  slm: SlmSettings
): Promise<SlmCheckResult> {
  const start = Date.now();

  const fullPrompt = `${slm.systemPrompt}\n\nPrompt to analyze:\n---\n${prompt}\n---\n\nRespond with JSON only:`;

  try {
    const controller = new AbortController();
    // 30 second timeout — local models can take 15-20s on CPUs
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${slm.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: slm.model,
        prompt: fullPrompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.0,   // Deterministic for security checks
          num_predict: 200,   // Keep response short
        },
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('[SLM Guard] Ollama responded with error, failing open:', response.status);
      return { safe: true, reason: 'SLM unreachable (fail-open)', violations: [], skipped: true, latencyMs: Date.now() - start };
    }

    const data = await response.json();
    const raw: string = data.response || '';

    // Extract JSON from the response (model may add extra text)
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[SLM Guard] Could not parse JSON from response:', raw);
        return { safe: true, reason: 'Parse error (fail-open)', violations: [], skipped: true, latencyMs: Date.now() - start };
      }
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e: any) {
        console.warn('[SLM Guard] JSON parse failed on extracted regex:', e.message);
        return { safe: true, reason: 'Parse error (fail-open)', violations: [], skipped: true, latencyMs: Date.now() - start };
      }
    }

    return {
      safe: !!parsed.safe,
      reason: parsed.reason || '',
      violations: Array.isArray(parsed.violations) ? parsed.violations : [],
      latencyMs: Date.now() - start,
    };

  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn('[SLM Guard] Timeout — failing open');
    } else {
      console.warn('[SLM Guard] Error:', e.message);
    }
    // Fail open: if Ollama is not running (e.g., in production), skip the SLM check
    return {
      safe: true,
      reason: 'Ollama not reachable — SLM check skipped',
      violations: [],
      skipped: true,
      latencyMs: Date.now() - start,
    };
  }
}

/** Quick liveness ping to Ollama endpoint */
export async function pingOllama(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
