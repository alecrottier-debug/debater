import { Injectable } from '@nestjs/common';
import { StagePlan, StageConfig } from './stage-plan.types.js';
import { QUICK_STAGE_PLAN } from './quick-stage-plan.js';
import { PRO_STAGE_PLAN } from './pro-stage-plan.js';

const STAGE_PLANS: Record<string, StagePlan> = {
  quick: QUICK_STAGE_PLAN,
  pro: PRO_STAGE_PLAN,
};

@Injectable()
export class StagePlanService {
  getPlan(mode: string): StagePlan {
    const plan = STAGE_PLANS[mode];
    if (!plan) {
      throw new Error(`Unknown debate mode: "${mode}"`);
    }
    return plan;
  }

  getStageByIndex(mode: string, stageIndex: number): StageConfig {
    const plan = this.getPlan(mode);
    if (stageIndex < 0 || stageIndex >= plan.stages.length) {
      throw new Error(
        `Stage index ${stageIndex} out of range for mode "${mode}" (0..${plan.stages.length - 1})`,
      );
    }
    return plan.stages[stageIndex];
  }

  getStageCount(mode: string): number {
    return this.getPlan(mode).stages.length;
  }

  getAvailableModes(): string[] {
    return Object.keys(STAGE_PLANS);
  }
}
