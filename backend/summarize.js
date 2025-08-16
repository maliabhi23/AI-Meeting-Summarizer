import fetch from 'node-fetch';
import { safeTrim } from './utils.js';

// Groq OpenAI-compatible endpoint
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ✅ Updated model (pick one: llama-3.1-70b-chat or llama-3.1-8b-chat)
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

export async function summarizeWithGroq({
  transcript,
  prompt,
  model = DEFAULT_MODEL,
  apiKey
}) {
  const sys = `You are a helpful assistant that produces clear, structured summaries of meetings. 
- Be concise.
- Respect the user's custom instruction.
- Prefer bullet points, headings, and actionable items when relevant.`;

  const userMsg = `Transcript:\n${safeTrim(transcript)}\n\nInstruction:\n${safeTrim(prompt) || 'Summarize the key points, decisions, and action items.'}`;

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userMsg }
      ]
    })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Groq API error (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return content;
}
