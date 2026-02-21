import { Module } from '@nestjs/common';
import { StagePlanService } from './stage-plan.service.js';

@Module({
  providers: [StagePlanService],
  exports: [StagePlanService],
})
export class StagesModule {}
