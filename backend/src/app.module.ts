import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PersonasModule } from './personas/personas.module.js';
import { StagesModule } from './stages/stages.module.js';
import { LlmModule } from './llm/llm.module.js';
import { ValidatorsModule } from './validators/validators.module.js';
import { DebatesModule } from './debates/debates.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PersonasModule,
    StagesModule,
    LlmModule,
    ValidatorsModule,
    DebatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
