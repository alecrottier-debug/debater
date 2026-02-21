import { ConfigService } from '@nestjs/config';
import { PersonaSynthesisService } from './persona-synthesis.service';

describe('PersonaSynthesisService', () => {
  let service: PersonaSynthesisService;
  let configService: ConfigService;

  const validPersona = {
    name: 'Elon Musk',
    tagline: 'Move fast, break things, build the future',
    style: 'Bold, first-principles reasoning with provocative analogies',
    priorities: ['AI safety', 'Space colonization', 'Free speech'],
    background:
      'Tech entrepreneur and CEO of multiple companies. Known for contrarian positions.',
    tone: 'Direct, sometimes combative, with dry humor and Twitter-style brevity',
  };

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('test-openai-key'),
    } as unknown as ConfigService;

    service = new PersonaSynthesisService(configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('synthesizes a persona from dossier summary', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'chatcmpl-123',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify(validPersona),
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      }),
    } as Response);

    const result = await service.synthesize(
      'Research summary about Elon Musk...',
      'Elon Musk',
    );

    expect(result).toEqual(validPersona);
  });

  it('sends correct headers and model to OpenAI', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'chatcmpl-123',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: JSON.stringify(validPersona) },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      }),
    } as Response);

    await service.synthesize('dossier summary', 'Subject');

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((options?.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-openai-key',
    );

    const body = JSON.parse(options?.body as string);
    expect(body.model).toBe('gpt-5-mini');
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('includes name override in prompt when provided', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'chatcmpl-123',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: JSON.stringify(validPersona) },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      }),
    } as Response);

    await service.synthesize('dossier summary', 'Subject', 'Custom Name');

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.messages[1].content).toContain('Custom Name');
  });

  it('retries on invalid JSON and succeeds on second attempt', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'chatcmpl-1',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'not valid json' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'chatcmpl-2',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: JSON.stringify(validPersona) },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 },
        }),
      } as Response);

    const result = await service.synthesize('summary', 'Subject');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual(validPersona);
  });

  it('retries on schema validation failure', async () => {
    const invalidPersona = { name: 'Test' }; // missing required fields

    jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'chatcmpl-1',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: JSON.stringify(invalidPersona) },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'chatcmpl-2',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: JSON.stringify(validPersona) },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 },
        }),
      } as Response);

    const result = await service.synthesize('summary', 'Subject');
    expect(result).toEqual(validPersona);
  });

  it('throws after exhausting all retries', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'chatcmpl-fail',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'bad output' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 },
      }),
    } as Response);

    await expect(
      service.synthesize('summary', 'Subject'),
    ).rejects.toThrow('Failed to synthesize persona after 3 attempts');
  });

  it('throws on OpenAI API error', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Rate limited',
    } as Response);

    await expect(
      service.synthesize('summary', 'Subject'),
    ).rejects.toThrow('Failed to synthesize persona after 3 attempts');
  });
});
