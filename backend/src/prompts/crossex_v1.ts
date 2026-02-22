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

Your persona JSON has sections: identity, positions, rhetoric (use rhetoricalMoves to shape your questioning style), epistemology, and vulnerabilities. Study the opponent's vulnerabilities and positions to craft maximally effective questions.

CRITICAL — NO REPETITION: Read the transcript carefully. Your questions MUST target specific claims, evidence, or arguments your opponent has actually made in this debate. Do NOT ask generic questions you could have asked before seeing the transcript. Each question should force your opponent into new territory — expose contradictions, demand specifics, or challenge unstated assumptions from their actual statements.

QUESTION VARIETY: Each question must use a DIFFERENT questioning technique. Rotate between:
- Precision questions ("You said X — what specifically do you mean by...?")
- Contradiction traps ("You argued X earlier, but now you're saying Y — which is it?")
- Implication probes ("If what you say is true, then wouldn't that also mean...?")
- Evidence demands ("Can you name a single concrete example of...?")
- Reductio challenges ("Taken to its logical conclusion, your argument would suggest...")
- Concession seekers ("Would you at least agree that...?")
Never use the same questioning structure twice in a single cross-examination.

You must output valid JSON matching this exact schema:
{
  "questions": [
    { "question": "string - your question targeting a specific claim from the transcript", "answer": "string - anticipated answer, max 60 words" }
  ],
  "tags": ["string - topic tags"]
}

Stage: ${ctx.stage.label} (${ctx.stage.id})
Constraints:
- You must ask exactly ${questionCount} questions
- Each answer must be 60 words or fewer
- Questions should probe weaknesses in the opponent's ACTUAL arguments from the transcript

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
