import { Module } from '@nestjs/common';
import { PersonasController } from './personas.controller.js';
import { PersonasService } from './personas.service.js';
import { PerplexityService } from './perplexity.service.js';
import { PersonaSynthesisService } from './persona-synthesis.service.js';

@Module({
  controllers: [PersonasController],
  providers: [PersonasService, PerplexityService, PersonaSynthesisService],
  exports: [PersonasService],
})
export class PersonasModule {}
