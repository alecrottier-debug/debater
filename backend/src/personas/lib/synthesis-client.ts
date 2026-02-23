import { PersonaV2Schema, PersonaV2, SynthesizedPersonaSchema, SynthesizedPersona } from '../persona-synth.schema.js';

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

export type { SynthesizedPersona, PersonaV2 };

function buildPrompt(
  dossierSummary: string,
  subject: string,
  nameOverride?: string,
): string {
  return `Based on the following research dossier about "${subject}", create a debate persona JSON object using the v2 schema.

${nameOverride ? `Use the name: "${nameOverride}"` : 'Choose an appropriate name for the persona.'}

The JSON must follow this exact structure:
{
  "schemaVersion": 2,
  "identity": {
    "name": "string - display name",
    "tagline": "string - one compelling line capturing their essence",
    "isRealPerson": boolean,
    "biography": {
      "summary": "string - 2-3 sentence background"
    }
  },
  "positions": {
    "priorities": ["string - 3-5 things they care about most"]
  },
  "rhetoric": {
    "style": "string - their debate style",
    "tone": "string - how they speak and argue"
  },
  "epistemology": {},
  "vulnerabilities": {},
  "conversationalProfile": {
    "responseLength": "string - e.g. 'Typically gives brief, punchy responses of 1-3 sentences' or 'Known for extended, detailed explorations that build layered arguments'",
    "listeningStyle": "string - e.g. 'Active listener who builds directly on others' points' or 'Waits then redirects to own framework'",
    "interruptionPattern": "string - e.g. 'Frequently interjects with \"But here's the thing...\"' or 'Rarely interrupts, waits for full turn'",
    "agreementStyle": "string - e.g. 'Quick \"Yeah, exactly\" before pivoting' or 'Generous acknowledgment before adding nuance'",
    "disagreementStyle": "string - e.g. 'Blunt and direct: \"I just don't buy that\"' or 'Diplomatic reframing'",
    "energyLevel": "string - e.g. 'High energy, animated, uses exclamations' or 'Measured, deliberate, low-key'",
    "tangentTendency": "string - e.g. 'Stays tightly on topic' or 'Loves tangents and personal anecdotes'",
    "humorInConversation": "string - e.g. 'Dry wit, deadpan delivery' or 'Rarely jokes in serious discussions'",
    "silenceComfort": "string - e.g. 'Comfortable with pauses, thinks before speaking' or 'Fills every gap immediately'",
    "questionAsking": "string - e.g. 'Frequently turns questions back on others' or 'Prefers to make statements'",
    "realWorldAnchoring": "string - e.g. 'Constantly grounds in specific examples and data' or 'Deals in abstractions and principles'"
  }
}

CONVERSATIONAL PROFILE INSTRUCTIONS:
Analyze how this person ACTUALLY behaves in conversations, interviews, and panel discussions. Study their podcast appearances, interviews, and public conversations. Key questions to answer:
- How long are their typical responses? Are they known for brevity or elaboration?
- Do they tend to build on others' points or redirect to their own agenda?
- How do they agree? How do they disagree?
- What's their energy level in conversation?
- Do they ask questions or make statements?
- Do they use humor? How?
- Are they comfortable with silence or do they fill every gap?
- Do they ground their points in concrete real-world examples, or do they deal in abstractions?

Be SPECIFIC and CONCRETE in each field. Don't use generic descriptions. Base your answers on how this person actually speaks in real conversations, not how they write.

Research dossier:
${dossierSummary}

Respond with ONLY the JSON object, no other text.`;
}

function parseAndValidate(raw: string): PersonaV2 | SynthesizedPersona {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON from OpenAI: ${raw.slice(0, 200)}`);
  }

  // Try v2 first
  const v2Result = PersonaV2Schema.safeParse(parsed);
  if (v2Result.success) {
    return v2Result.data;
  }

  // Fall back to v1
  const v1Result = SynthesizedPersonaSchema.safeParse(parsed);
  if (v1Result.success) {
    return v1Result.data;
  }

  const issues = v2Result.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  throw new Error(`Persona validation failed: ${issues}`);
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
): Promise<PersonaV2 | SynthesizedPersona> {
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
