import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { synthesizePersona, type SynthesizedPersona, type PersonaV2 } from './lib/synthesis-client.js';

export type { SynthesizedPersona, PersonaV2 };

@Injectable()
export class PersonaSynthesisService {
  private readonly logger = new Logger(PersonaSynthesisService.name);
  private readonly apiKey: string;
  private readonly maxRetries = 2;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY', '');
  }

  async synthesize(
    dossierSummary: string,
    subject: string,
    nameOverride?: string,
  ): Promise<PersonaV2 | SynthesizedPersona> {
    this.logger.log(`Synthesizing persona for "${subject}"`);

    const result = await synthesizePersona(dossierSummary, subject, nameOverride, {
      apiKey: this.apiKey,
      maxRetries: this.maxRetries,
    });

    this.logger.log(`Successfully synthesized persona for "${subject}"`);

    return result;
  }
}
