import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Header,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DebatesService } from './debates.service.js';
import type { CreateDebateDto } from './debates.service.js';

@Controller('debates')
export class DebatesController {
  constructor(private readonly debatesService: DebatesService) {}

  @Post()
  create(@Body() dto: CreateDebateDto) {
    return this.debatesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.debatesService.findOne(id);
  }

  @Post(':id/next')
  advanceStage(@Param('id') id: string) {
    return this.debatesService.advanceStage(id);
  }

  @Post(':id/rematch')
  rematch(@Param('id') id: string) {
    return this.debatesService.rematch(id);
  }

  @Get(':id/export')
  async exportMarkdown(@Param('id') id: string, @Res() res: Response) {
    const markdown = await this.debatesService.exportMarkdown(id);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(markdown);
  }
}
