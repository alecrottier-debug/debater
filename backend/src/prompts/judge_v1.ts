import { LlmPrompt } from '../llm/llm-adapter.interface.js';
import { StageConfig } from '../stages/stage-plan.types.js';

export const JUDGE_PROMPT_VERSION = 'judge_v1';

export interface JudgeTranscriptEntry {
  stageId: string;
  speaker: string;
  renderedText: string;
  violations: string[];
}

export interface JudgePromptContext {
  motion: string;
  stage: StageConfig;
  personaA: Record<string, unknown>;
  personaB: Record<string, unknown>;
  transcript: JudgeTranscriptEntry[];
}

export function buildJudgePrompt(ctx: JudgePromptContext): LlmPrompt {
  const transcriptText = ctx.transcript
    .map((t) => {
      const violationNote =
        t.violations.length > 0
          ? `\n  [VIOLATIONS: ${t.violations.join(', ')}]`
          : '';
      return `[${t.stageId}] (${t.speaker}): ${t.renderedText}${violationNote}`;
    })
    .join('\n\n');

  const system = `You are an expert debate judge. Evaluate the debate fairly and thoroughly.

You must output valid JSON matching this exact schema:
{
  "winner": "A" | "B" | "TIE",
  "scores": {
    "A": { "clarity": number, "strength": number, "responsiveness": number, "weighing": number },
    "B": { "clarity": number, "strength": number, "responsiveness": number, "weighing": number }
  },
  "ballot": [{ "reason": "string - explain your reasoning", "refs": ["string - stage IDs cited"] }],
  "improvements": {
    "A": ["string - suggestions for Side A"],
    "B": ["string - suggestions for Side B"]
  },
  "bestLines": {
    "A": "string - the most compelling line from Side A",
    "B": "string - the most compelling line from Side B"
  }
}

JUDGING RUBRIC:
- Clarity (1-10): How clearly were arguments presented and structured?
- Strength (1-10): How strong was the evidence and reasoning?
- Responsiveness (1-10): How well did each side address the opponent's arguments?
- Weighing (1-10): How well did each side explain why their arguments matter most?

INSTRUCTIONS:
- Consider the full transcript carefully
- Account for any rule violations when scoring
- Cite specific stage IDs (e.g., "A_OPEN", "B_COUNTER") in your ballot refs
- The winner is the side with the stronger overall performance
- A TIE should only be declared if the debate is genuinely evenly matched

Output ONLY valid JSON. No markdown, no explanation.`;

  const user = `Motion: "${ctx.motion}"

Side A Persona (full):
${JSON.stringify(ctx.personaA, null, 2)}

Side B Persona (full):
${JSON.stringify(ctx.personaB, null, 2)}

Full Debate Transcript:
${transcriptText}

Judge this debate and render your decision.`;

  return { system, user };
}
