import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Header,
  Res,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { DebatesService } from './debates.service.js';
import type { CreateDebateDto, StreamEvent } from './debates.service.js';

@Controller('debates')
export class DebatesController {
  constructor(private readonly debatesService: DebatesService) {}

  @Get()
  findAll() {
    return this.debatesService.findAll();
  }

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

  /**
   * SSE counterpart to POST /:id/next. Streams the next stage's narrative
   * field as the LLM emits it, then a final `done` event with the full debate.
   * Each SSE message has `type` set to one of: stage | narrative | done | error.
   */
  @Sse(':id/next/stream')
  advanceStageStream(@Param('id') id: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let cancelled = false;
      const emit = (event: StreamEvent) => {
        if (cancelled) return;
        subscriber.next({ type: event.type, data: event });
      };

      this.debatesService
        .advanceStageStream(id, emit)
        .then(() => {
          if (!cancelled) subscriber.complete();
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : String(err);
          // The service already emits 'error' on LLM failures; this catches
          // pre-flight rejections (debate completed/in error/etc.).
          subscriber.next({
            type: 'error',
            data: { type: 'error', message },
          });
          subscriber.complete();
        });

      return () => {
        cancelled = true;
      };
    });
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
