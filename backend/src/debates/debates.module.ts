import { Module } from '@nestjs/common';
import { DebatesController } from './debates.controller.js';
import { DebatesService } from './debates.service.js';
import { StagesModule } from '../stages/stages.module.js';
import { ValidatorsModule } from '../validators/validators.module.js';

@Module({
  imports: [StagesModule, ValidatorsModule],
  controllers: [DebatesController],
  providers: [DebatesService],
  exports: [DebatesService],
})
export class DebatesModule {}
