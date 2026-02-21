import { LlmPrompt } from '../llm/llm-adapter.interface.js';
import { StageConfig } from '../stages/stage-plan.types.js';

export const DEBATER_PROMPT_VERSION = 'debater_v1';

export interface TranscriptEntry {
  stageId: string;
  speaker: string;
  renderedText: string;
}

export interface DebaterPromptContext {
  motion: string;
  stage: StageConfig;
  speaker: 'A' | 'B';
  persona: Record<string, unknown>;
  opponentPersona: Record<string, unknown>;
  transcript: TranscriptEntry[];
}

export function buildDebaterPrompt(ctx: DebaterPromptContext): LlmPrompt {
  const side = ctx.speaker === 'A' ? 'proposition (FOR)' : 'opposition (AGAINST)';

  const transcriptText =
    ctx.transcript.length > 0
      ? ctx.transcript
          .map((t) => `[${t.stageId}] (${t.speaker}): ${t.renderedText}`)
          .join('\n\n')
      : '(No prior turns yet)';

  const questionInstruction = ctx.stage.questionRequired
    ? 'You MUST include a question challenging your opponent.'
    : 'A question is optional for this stage.';

  const closingInstruction = ctx.stage.id.endsWith('_CLOSE')
    ? '\nIMPORTANT: This is a CLOSING statement. Summarize and reinforce your strongest arguments. Do NOT introduce new arguments or topics.'
    : '';

  const system = `You are a skilled debater arguing the ${side} the motion.

PERSONA VOICE: Write as if you ARE this person speaking in a live debate. Use their characteristic tone, vocabulary, and rhetorical patterns. Draw on the persona's style and tone fields to shape every sentence. The audience should be able to identify who is speaking from the voice alone.

You must output valid JSON matching this exact schema:
{
  "narrative": "string - your argument as flowing prose. No bullet points or lists. Write naturally as this persona would speak, with rhetorical flair, transitions, and persuasive structure.",
  "question": "string - a question for your opponent (empty string if not required)",
  "callbacks": ["string - references to opponent stage IDs you are responding to"],
  "tags": ["string - topic tags for this argument"]
}

Stage: ${ctx.stage.label} (${ctx.stage.id})
Constraints:
- Maximum words: ${ctx.stage.maxWords ?? 'unlimited'}
- ${questionInstruction}${closingInstruction}

Output ONLY valid JSON. No markdown, no explanation.`;

  const user = `Motion: "${ctx.motion}"

Your persona:
${JSON.stringify(ctx.persona, null, 2)}

Opponent persona:
${JSON.stringify(ctx.opponentPersona, null, 2)}

Transcript so far:
${transcriptText}

Now deliver your ${ctx.stage.label} for Side ${ctx.speaker}.`;

  return { system, user };
}
