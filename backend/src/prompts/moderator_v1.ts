import { LlmPrompt } from '../llm/llm-adapter.interface.js';
import { StageConfig } from '../stages/stage-plan.types.js';

export const MODERATOR_PROMPT_VERSION = 'moderator_v1';

export interface ModeratorPromptContext {
  motion: string;
  stage: StageConfig;
  personaA: Record<string, unknown>;
  personaB: Record<string, unknown>;
}

export function buildModeratorPrompt(ctx: ModeratorPromptContext): LlmPrompt {
  const system = `You are a professional debate moderator. Your role is to set up the debate fairly and clearly.

You must output valid JSON matching this exact schema:
{
  "definitions": ["string - key term definitions relevant to the motion"],
  "burdens": ["string - what each side must prove"],
  "judging_criteria": ["string - criteria for evaluating the debate"],
  "house_rules": ["string - rules for the debate"]
}

Stage constraints:
- Maximum words: ${ctx.stage.maxWords ?? 'unlimited'}
- Required bullet points: ${ctx.stage.bullets ? `${ctx.stage.bullets.min}-${ctx.stage.bullets.max}` : 'none'}

Output ONLY valid JSON. No markdown, no explanation.`;

  const user = `Motion: "${ctx.motion}"

Debater A persona:
${JSON.stringify(ctx.personaA, null, 2)}

Debater B persona:
${JSON.stringify(ctx.personaB, null, 2)}

Set up this debate with clear definitions, burdens of proof for each side, judging criteria, and house rules. Keep it concise and fair to both sides.`;

  return { system, user };
}
