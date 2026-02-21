import { SynthesizedPersonaSchema, SynthesizedPersona } from '../persona-synth.schema.js';

interface OpenAiResponse {
  id: string;
  choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface SynthesisOptions {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
}

export type { SynthesizedPersona };

function buildPrompt(
  dossierSummary: string,
  subject: string,
  nameOverride?: string,
): string {
  return `Based on the following research dossier about "${subject}", create a debate persona JSON object.

${nameOverride ? `Use the name: "${nameOverride}"` : 'Choose an appropriate name for the persona.'}

The JSON must have exactly these fields:
- "name": string - the persona's display name
- "tagline": string - one compelling line that captures their essence
- "style": string - a description of their debate style (e.g., "aggressive cross-examiner", "calm evidence-based reasoner")
- "priorities": string[] - an array of 3-5 things they care about most
- "background": string - a brief background description (2-3 sentences)
- "tone": string - how they speak and argue (e.g., "direct and confrontational", "measured with dry wit")

Research dossier:
${dossierSummary}

Respond with ONLY the JSON object, no other text.`;
}

function parseAndValidate(raw: string): SynthesizedPersona {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON from OpenAI: ${raw.slice(0, 200)}`);
  }

  const result = SynthesizedPersonaSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Persona validation failed: ${issues}`);
  }

  return result.data;
}

async function callOpenAi(
  dossierSummary: string,
  subject: string,
  nameOverride: string | undefined,
  options: SynthesisOptions,
): Promise<string> {
  const baseUrl = options.baseUrl ?? 'https://api.openai.com/v1/chat/completions';
  const prompt = buildPrompt(dossierSummary, subject, nameOverride);

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at creating debate personas. ' +
            'You output ONLY valid JSON, with no markdown fences or extra text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenAI API request failed: ${response.status} ${response.statusText} - ${errorBody}`,
    );
  }

  const data = (await response.json()) as OpenAiResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenAI returned empty content');
  }

  return content;
}

export async function synthesizePersona(
  dossierSummary: string,
  subject: string,
  nameOverride: string | undefined,
  options: SynthesisOptions,
): Promise<SynthesizedPersona> {
  const maxRetries = options.maxRetries ?? 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await callOpenAi(dossierSummary, subject, nameOverride, options);
      return parseAndValidate(raw);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    `Failed to synthesize persona after ${maxRetries + 1} attempts: ${lastError?.message}`,
  );
}
