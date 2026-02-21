import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { LlmAdapter, LlmPrompt } from './llm-adapter.interface.js';
import {
  DebaterOutput,
  DebaterOutputSchema,
  ModeratorOutput,
  ModeratorOutputSchema,
  JudgeOutput,
  JudgeOutputSchema,
  CrossExOutput,
  CrossExOutputSchema,
} from './llm-schemas.js';

const MAX_RETRIES = 2;

@Injectable()
export class OpenAiLlmAdapter implements LlmAdapter {
  private readonly logger = new Logger(OpenAiLlmAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('LLM_API_KEY', '');
    this.baseUrl = this.config.get<string>(
      'LLM_BASE_URL',
      'https://api.openai.com/v1',
    );
    this.model = this.config.get<string>('LLM_MODEL', 'gpt-5-mini');
  }

  async generateModeratorTurn(prompt: LlmPrompt): Promise<ModeratorOutput> {
    return this.callWithSchema(prompt, ModeratorOutputSchema, 'moderator');
  }

  async generateDebaterTurn(
    prompt: LlmPrompt,
    speaker: 'A' | 'B',
  ): Promise<DebaterOutput> {
    return this.callWithSchema(prompt, DebaterOutputSchema, `debater-${speaker}`);
  }

  async generateJudgeDecision(prompt: LlmPrompt): Promise<JudgeOutput> {
    return this.callWithSchema(prompt, JudgeOutputSchema, 'judge');
  }

  async generateCrossExTurn(
    prompt: LlmPrompt,
    speaker: 'A' | 'B',
  ): Promise<CrossExOutput> {
    return this.callWithSchema(prompt, CrossExOutputSchema, `crossex-${speaker}`);
  }

  async generateText(prompt: LlmPrompt): Promise<string> {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature: 0.7,
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0].message.content;
  }

  private async callWithSchema<T>(
    prompt: LlmPrompt,
    schema: z.ZodType<T>,
    label: string,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const raw = await this.generateText(prompt);
        return this.parseJsonWithSchema(raw, schema);
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(
          `[${label}] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${lastError.message}`,
        );
      }
    }

    throw new Error(
      `[${label}] All ${MAX_RETRIES + 1} attempts failed. Last error: ${lastError?.message}`,
    );
  }

  private parseJsonWithSchema<T>(raw: string, schema: z.ZodType<T>): T {
    // Strip markdown code fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Invalid JSON: ${cleaned.substring(0, 200)}`);
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Schema validation failed: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      );
    }

    return result.data;
  }
}
