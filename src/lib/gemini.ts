import type { Message } from '../types';

/**
 * Streams a response from the Gemini API with full multi-turn conversation history.
 * This is what makes it behave like a real agent — it remembers the whole conversation.
 */
export const streamGemini = async (
  conversationHistory: Message[],  // Full history, not just the latest message
  systemPrompt: string,
  apiKey: string,
  modelName: string,
  onChunk: (text: string) => void
) => {
  const model = modelName || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  // Build the multi-turn contents array
  // Filter out 'system' role messages (those are error messages shown in UI only)
  // and ensure we alternate user/model correctly
  const contents = conversationHistory
    .filter(m => m.role === 'user' || m.role === 'model')
    .filter(m => m.content.trim().length > 0)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
    },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e: any) {
    throw new Error(`Network error: ${e.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `Gemini API Error (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        errorMsg = parsed.error.message;
      }
    } catch {
      errorMsg += `: ${errorText.slice(0, 200)}`;
    }
    throw new Error(errorMsg);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Streaming not supported by this browser');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') continue;
      try {
        const data = JSON.parse(dataStr);
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) onChunk(text);
      } catch {
        // Ignore malformed chunks
      }
    }
  }
};
