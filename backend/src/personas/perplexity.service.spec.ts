import { ConfigService } from '@nestjs/config';
import { PerplexityService } from './perplexity.service';

describe('PerplexityService', () => {
  let service: PerplexityService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    } as unknown as ConfigService;

    service = new PerplexityService(configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calls Perplexity API with correct payload and returns parsed result', async () => {
    const mockResponse = {
      id: 'resp-123',
      model: 'sonar',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Research summary here' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 50, completion_tokens: 200, total_tokens: 250 },
    };

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await service.research('Elon Musk on AI regulation');

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.perplexity.ai/chat/completions');
    expect(options?.method).toBe('POST');
    expect((options?.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-api-key',
    );

    const body = JSON.parse(options?.body as string);
    expect(body.model).toBe('sonar');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[1].content).toContain('Elon Musk on AI regulation');

    expect(result.rawResponse).toEqual(mockResponse);
    expect(result.summary).toBe('Research summary here');
    expect(result.query).toContain('Elon Musk on AI regulation');
  });

  it('includes context in the query when provided', async () => {
    const mockResponse = {
      id: 'resp-456',
      model: 'sonar',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Summary' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 60, completion_tokens: 100, total_tokens: 160 },
    };

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    await service.research('labor union organizer', 'Focus on healthcare debates');

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.messages[1].content).toContain('labor union organizer');
    expect(body.messages[1].content).toContain(
      'Focus on healthcare debates',
    );
  });

  it('throws on API error', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid API key',
    } as Response);

    await expect(service.research('test subject')).rejects.toThrow(
      'Perplexity API request failed: 401 Unauthorized',
    );
  });
});
