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
  const nameA =
    (ctx.personaA.identity as Record<string, unknown> | undefined)?.name ??
    ctx.personaA.name ??
    'For';
  const nameB =
    (ctx.personaB.identity as Record<string, unknown> | undefined)?.name ??
    ctx.personaB.name ??
    'Against';

  const system = `You are a professional debate moderator. Your role is to set up the debate fairly and clearly.

Each debater's persona has sections: identity (who they are), positions (what they believe), rhetoric (how they argue), epistemology (how they handle evidence), and vulnerabilities (their blind spots). Use identity and positions to frame the stakes and burdens of proof.

Always refer to the debaters by their actual names — "${nameA}" (arguing FOR the motion) and "${nameB}" (arguing AGAINST). Never use generic labels like "Debater A", "Debater B", "Speaker 1", or "the affirmative side". Introduce each by name.

You must output valid JSON matching this exact schema:
{
  "narrative": "string - a welcoming address that names both debaters, covers key definitions, burdens of proof for each side, judging criteria, and house rules. Weave these into natural, flowing speech — not lists or bullet points. Speak as a warm but authoritative moderator opening a live debate."
}

Stage constraints:
- Maximum words: ${ctx.stage.maxWords ?? 'unlimited'}

Output ONLY valid JSON. No markdown, no explanation.`;

  const user = `Motion: "${ctx.motion}"

${nameA} (FOR) persona:
${JSON.stringify(ctx.personaA, null, 2)}

${nameB} (AGAINST) persona:
${JSON.stringify(ctx.personaB, null, 2)}

Set up this debate with clear definitions, burdens of proof for each side, judging criteria, and house rules. Introduce ${nameA} and ${nameB} by name. Deliver it as a natural welcoming address. Keep it concise and fair to both sides.`;

  return { system, user };
}
