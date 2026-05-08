export const streamGemini = async (
  prompt: string,
  systemPrompt: string,
  apiKey: string,
  modelName: string,
  onChunk: (text: string) => void
) => {
  const modelStr = modelName || 'gemini-1.5-pro-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelStr}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: { text: systemPrompt }
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Stream not supported");

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        if (dataStr === '[DONE]') continue;
        try {
          const data = JSON.parse(dataStr);
          if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const text = data.candidates[0].content.parts[0].text;
            if (text) onChunk(text);
          }
        } catch (e) {
          console.error("Error parsing SSE chunk", e);
        }
      }
    }
  }
};
