import { LlmPrompt } from '../llm/llm-adapter.interface.js';
import { StageConfig } from '../stages/stage-plan.types.js';
import { TranscriptEntry } from './debater_v1.js';

export const CROSSEX_PROMPT_VERSION = 'crossex_v1';

export interface CrossExPromptContext {
  motion: string;
  stage: StageConfig;
  speaker: 'A' | 'B';
  persona: Record<string, unknown>;
  opponentPersona: Record<string, unknown>;
  transcript: TranscriptEntry[];
}

export function buildCrossExPrompt(ctx: CrossExPromptContext): LlmPrompt {
  const side = ctx.speaker === 'A' ? 'proposition (FOR)' : 'opposition (AGAINST)';

  const transcriptText =
    ctx.transcript.length > 0
      ? ctx.transcript
          .map((t) => `[${t.stageId}] (${t.speaker}): ${t.renderedText}`)
          .join('\n\n')
      : '(No prior turns yet)';

  const questionCount = ctx.stage.questionCount || 2;

  const system = `You are a skilled debater conducting cross-examination from the ${side} the motion. Stay in character according to your persona.

You must output valid JSON matching this exact schema:
{
  "questions": [
    { "question": "string - your question", "answer": "string - anticipated answer, max 60 words" }
  ],
  "tags": ["string - topic tags"]
}

Stage: ${ctx.stage.label} (${ctx.stage.id})
Constraints:
- You must ask exactly ${questionCount} questions
- Each answer must be 60 words or fewer
- Questions should probe weaknesses in the opponent's arguments

Output ONLY valid JSON. No markdown, no explanation.`;

  const user = `Motion: "${ctx.motion}"

Your persona:
${JSON.stringify(ctx.persona, null, 2)}

Opponent persona:
${JSON.stringify(ctx.opponentPersona, null, 2)}

Transcript so far:
${transcriptText}

Conduct your cross-examination for Side ${ctx.speaker}.`;

  return { system, user };
}
