import { Controller, Post, Body, Res, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { TtsService } from './tts.service.js';

@Controller('api/tts')
export class TtsController {
  constructor(private readonly tts: TtsService) {}

  @Post()
  async synthesize(
    @Body() body: { text: string; speaker: string },
    @Res() res: Response,
  ) {
    if (!body.text || !body.speaker) {
      throw new HttpException(
        'text and speaker are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const audio = await this.tts.synthesize(body.text, body.speaker);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audio.length.toString(),
    });
    res.send(audio);
  }
}
