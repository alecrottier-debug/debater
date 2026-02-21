import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  researchSubject,
  type PerplexityResponse,
  type ResearchResult,
} from './lib/perplexity-client.js';

export type { PerplexityResponse };

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('PERPLEXITY_API_KEY', '');
  }

  async research(
    subject: string,
    context?: string,
  ): Promise<ResearchResult> {
    this.logger.log(`Researching subject: "${subject}"`);

    const result = await researchSubject(subject, context, {
      apiKey: this.apiKey,
    });

    this.logger.log(
      `Research complete for "${subject}" (${result.rawResponse.usage?.total_tokens ?? 0} tokens)`,
    );

    return result;
  }
}
