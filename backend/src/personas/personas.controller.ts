import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PersonasService } from './personas.service.js';
import { ResearchDto } from './dto/research.dto.js';
import { SynthesizeDto } from './dto/synthesize.dto.js';

@Controller('personas')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Get()
  findAll(@Query('templates') templates?: string) {
    if (templates === 'true') {
      return this.personasService.findAllTemplates();
    }
    return this.personasService.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      tagline: string;
      personaJson: object;
      isTemplate?: boolean;
    },
  ) {
    return this.personasService.createPersona(body);
  }

  @Post('research')
  research(@Body() body: ResearchDto) {
    return this.personasService.research(body.subject, body.context);
  }

  @Post('synthesize')
  synthesize(@Body() body: SynthesizeDto) {
    return this.personasService.synthesize(body.dossierId, body.name);
  }
}
