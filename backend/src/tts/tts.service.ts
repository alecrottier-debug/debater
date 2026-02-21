import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const VOICE_MAP: Record<string, string> = {
  A: 'echo',
  B: 'nova',
  MOD: 'alloy',
  JUDGE: 'fable',
};

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('LLM_API_KEY', '');
    this.baseUrl = this.config.get<string>(
      'LLM_BASE_URL',
      'https://api.openai.com/v1',
    );
  }

  async synthesize(text: string, speaker: string): Promise<Buffer> {
    const voice = VOICE_MAP[speaker] ?? 'alloy';

    const res = await fetch(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice,
        input: text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`TTS API error (${res.status}): ${errText}`);
      throw new Error(`TTS API error (${res.status}): ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
