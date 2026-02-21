import { Module } from '@nestjs/common';
import { TtsService } from './tts.service.js';
import { TtsController } from './tts.controller.js';

@Module({
  controllers: [TtsController],
  providers: [TtsService],
  exports: [TtsService],
})
export class TtsModule {}
