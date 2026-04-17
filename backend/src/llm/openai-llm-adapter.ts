import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  LlmAdapter,
  LlmPrompt,
  NarrativeStreamHandler,
} from './llm-adapter.interface.js';
import {
  DebaterOutput,
  DebaterOutputSchema,
  ModeratorOutput,
  ModeratorOutputSchema,
  JudgeOutput,
  JudgeOutputSchema,
  CrossExOutput,
  CrossExOutputSchema,
  DiscussionWrapOutput,
  DiscussionWrapOutputSchema,
} from './llm-schemas.js';

const MAX_RETRIES = 2;
/** Per-request timeout. Generous because reasoning models stream tokens slowly. */
const REQUEST_TIMEOUT_MS = 90_000;
/** Initial backoff between retries; doubles each attempt with jitter. */
const RETRY_BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  async generateModeratorTurn(
    prompt: LlmPrompt,
    onNarrative?: NarrativeStreamHandler,
  ): Promise<ModeratorOutput> {
    return this.callWithSchema(
      prompt,
      ModeratorOutputSchema,
      'moderator',
      onNarrative,
    );
  }

  async generateDebaterTurn(
    prompt: LlmPrompt,
    speaker: 'A' | 'B',
    onNarrative?: NarrativeStreamHandler,
  ): Promise<DebaterOutput> {
    return this.callWithSchema(
      prompt,
      DebaterOutputSchema,
      `debater-${speaker}`,
      onNarrative,
    );
  }

  async generateJudgeDecision(prompt: LlmPrompt): Promise<JudgeOutput> {
    return this.callWithSchema(prompt, JudgeOutputSchema, 'judge');
  }

  async generateCrossExTurn(
    prompt: LlmPrompt,
    speaker: 'A' | 'B',
  ): Promise<CrossExOutput> {
    return this.callWithSchema(
      prompt,
      CrossExOutputSchema,
      `crossex-${speaker}`,
    );
  }

  async generateDiscussionWrap(
    prompt: LlmPrompt,
    onNarrative?: NarrativeStreamHandler,
  ): Promise<DiscussionWrapOutput> {
    return this.callWithSchema(
      prompt,
      DiscussionWrapOutputSchema,
      'discussion-wrap',
      onNarrative,
    );
  }

  async generateText(prompt: LlmPrompt): Promise<string> {
    return this.fetchCompletion(prompt, false);
  }

  /**
   * Stream the assistant's text token-by-token. Each call to `onChunk` receives
   * the newly-arrived characters (delta), not the cumulative buffer. Returns
   * the full assembled text once the stream finishes.
   */
  private async streamGenerateText(
    prompt: LlmPrompt,
    onChunk: (delta: string) => void,
  ): Promise<string> {
    return this.fetchCompletion(prompt, true, onChunk);
  }

  private async fetchCompletion(
    prompt: LlmPrompt,
    stream: false,
  ): Promise<string>;
  private async fetchCompletion(
    prompt: LlmPrompt,
    stream: true,
    onChunk: (delta: string) => void,
  ): Promise<string>;
  private async fetchCompletion(
    prompt: LlmPrompt,
    stream: boolean,
    onChunk?: (delta: string) => void,
  ): Promise<string> {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      ...(stream ? { stream: true } : {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error).name === 'AbortError') {
        throw new Error(
          `LLM API request timed out after ${REQUEST_TIMEOUT_MS}ms`,
        );
      }
      throw err;
    }

    if (!res.ok) {
      clearTimeout(timeout);
      const errText = await res.text();
      throw new Error(`LLM API error (${res.status}): ${errText}`);
    }

    if (!stream) {
      clearTimeout(timeout);
      const data = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices[0].message.content;
    }

    if (!res.body) {
      clearTimeout(timeout);
      throw new Error('Streaming requested but response has no body');
    }

    // Parse OpenAI's SSE chunks: lines beginning with "data: " containing
    // either JSON deltas or the terminator "[DONE]".
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let assembled = '';
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assembled += delta;
              onChunk?.(delta);
            }
          } catch {
            // Ignore malformed lines (heartbeats, comments, partial payloads
            // straddling chunk boundaries — those land in `buffer`).
          }
        }
      }
    } finally {
      clearTimeout(timeout);
      reader.releaseLock();
    }
    return assembled;
  }

  private async callWithSchema<T>(
    prompt: LlmPrompt,
    schema: z.ZodType<T>,
    label: string,
    onNarrative?: NarrativeStreamHandler,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const raw = onNarrative
          ? await this.streamWithNarrativeExtraction(prompt, onNarrative)
          : await this.generateText(prompt);
        return this.parseJsonWithSchema(raw, schema);
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(
          `[${label}] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${lastError.message}`,
        );
        if (attempt < MAX_RETRIES) {
          // Exponential backoff with ±25% jitter to avoid synchronized retries.
          const base = RETRY_BASE_DELAY_MS * 2 ** attempt;
          const jitter = base * (0.75 + Math.random() * 0.5);
          await sleep(Math.round(jitter));
        }
      }
    }

    throw new Error(
      `[${label}] All ${MAX_RETRIES + 1} attempts failed. Last error: ${lastError?.message}`,
    );
  }

  /**
   * Stream the model output and call `onNarrative` with the cumulative content
   * of the JSON `narrative` field as it grows. Other fields are ignored during
   * streaming — the full JSON is parsed at the end.
   */
  private async streamWithNarrativeExtraction(
    prompt: LlmPrompt,
    onNarrative: NarrativeStreamHandler,
  ): Promise<string> {
    let buffer = '';
    let lastEmitted = '';
    return this.streamGenerateText(prompt, (delta) => {
      buffer += delta;
      const narrative = extractNarrative(buffer);
      if (narrative !== null && narrative !== lastEmitted) {
        lastEmitted = narrative;
        onNarrative(narrative);
      }
    });
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

/**
 * Extract the in-progress `narrative` string from a partial JSON buffer.
 *
 * Strategy: skip optional leading code-fence, find the first `"narrative"` key,
 * walk past `:` and the opening `"`, then read characters honoring backslash
 * escapes until we hit an unescaped closing `"` (field complete) or run out
 * of buffer (still streaming). We deliberately don't use partial-json's full
 * parser here: the model can emit other very large fields (e.g. `analysis`)
 * before `narrative` reaches us as a parsed value, and we only care about the
 * narrative anyway.
 */
function extractNarrative(buffer: string): string | null {
  let body = buffer;
  if (body.startsWith('```')) {
    body = body.replace(/^```(?:json)?\s*/, '');
  }
  const keyMatch = /"narrative"\s*:\s*"/.exec(body);
  if (!keyMatch) return null;
  const start = keyMatch.index + keyMatch[0].length;
  let i = start;
  let escaped = false;
  let result = '';
  while (i < body.length) {
    const ch = body[i];
    if (escaped) {
      // Preserve common escape semantics so the user sees clean text.
      switch (ch) {
        case 'n':
          result += '\n';
          break;
        case 't':
          result += '\t';
          break;
        case 'r':
          result += '\r';
          break;
        case '"':
        case '\\':
        case '/':
          result += ch;
          break;
        default:
          result += ch;
      }
      escaped = false;
      i++;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      i++;
      continue;
    }
    if (ch === '"') {
      // Closing quote — narrative field complete.
      return result;
    }
    result += ch;
    i++;
  }
  // Stream still in flight — return what we have so far.
  return result;
}

