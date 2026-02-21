import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('PERPLEXITY_API_KEY', '');
  }

  async research(
    subject: string,
    context?: string,
  ): Promise<{ rawResponse: PerplexityResponse; summary: string; query: string }> {
    const query = this.buildQuery(subject, context);

    this.logger.log(`Researching subject: "${subject}"`);

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
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
      this.logger.error(
        `Perplexity API error: ${response.status} ${response.statusText} - ${errorBody}`,
      );
      throw new Error(
        `Perplexity API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const rawResponse = (await response.json()) as PerplexityResponse;
    const summary =
      rawResponse.choices?.[0]?.message?.content ?? 'No summary available';

    this.logger.log(`Research complete for "${subject}" (${rawResponse.usage?.total_tokens ?? 0} tokens)`);

    return { rawResponse, summary, query };
  }

  private buildQuery(subject: string, context?: string): string {
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
}
