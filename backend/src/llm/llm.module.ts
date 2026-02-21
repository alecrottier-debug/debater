import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_ADAPTER } from './llm-adapter.interface.js';
import { OpenAiLlmAdapter } from './openai-llm-adapter.js';
import { MockLlmAdapter } from './mock-llm-adapter.js';

@Global()
@Module({
  providers: [
    {
      provide: LLM_ADAPTER,
      useFactory: (config: ConfigService) => {
        const useMock = config.get<string>('USE_MOCK_LLM', 'false');
        if (useMock === 'true') {
          return new MockLlmAdapter();
        }
        return new OpenAiLlmAdapter(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [LLM_ADAPTER],
})
export class LlmModule {}
