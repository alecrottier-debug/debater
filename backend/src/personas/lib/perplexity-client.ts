export interface PerplexityResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ResearchOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface ResearchResult {
  rawResponse: PerplexityResponse;
  summary: string;
  query: string;
}

function buildQuery(subject: string, context?: string): string {
  let query =
    `Research the debate style, key positions, rhetorical approach, ` +
    `background, and notable arguments of: ${subject}. ` +
    `Include information about their communication style, ` +
    `typical arguments they make, their priorities and values, ` +
    `and any distinctive debate tactics they use.`;

  if (context) {
    query += ` Additional context: ${context}`;
  }

  return query;
}

export async function researchSubject(
  subject: string,
  context: string | undefined,
  options: ResearchOptions,
): Promise<ResearchResult> {
  const baseUrl = options.baseUrl ?? 'https://api.perplexity.ai/chat/completions';
  const query = buildQuery(subject, context);

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content:
            'You are a research assistant helping build a debater persona profile. ' +
            'Provide comprehensive, well-organized research focusing on debate style, ' +
            'key positions, rhetorical approach, background, and notable arguments. ' +
            'Be thorough but concise.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Perplexity API request failed: ${response.status} ${response.statusText} - ${errorBody}`,
    );
  }

  const rawResponse = (await response.json()) as PerplexityResponse;
  const summary =
    rawResponse.choices?.[0]?.message?.content ?? 'No summary available';

  return { rawResponse, summary, query };
}
