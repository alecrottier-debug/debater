import { LlmPrompt } from '../llm/llm-adapter.interface.js';
import { StageConfig } from '../stages/stage-plan.types.js';
import {
  buildVoiceInstructions,
  buildVoiceAuthenticityBlock,
  classifyDebateStage,
} from './voice-instructions.js';

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

  const turnCount = ctx.transcript.filter((t) => t.speaker === ctx.speaker).length;

  const stagePhase = classifyDebateStage(ctx.stage.id);

  const voiceBlock = buildVoiceInstructions(ctx.persona, {
    mode: 'debate',
    stagePhase,
  });

  const authenticityBlock = buildVoiceAuthenticityBlock(ctx.persona, 'debate');

  const system = `You are a skilled debater arguing the ${side} the motion.
${voiceBlock}

${authenticityBlock}

CRITICAL — ZERO REPETITION OF LANGUAGE OR DEVICES:
Read the ENTIRE transcript before writing. Track every rhetorical device, transition phrase, and argumentative move you have already used. You are STRICTLY FORBIDDEN from:
- Repeating ANY phrase, sentence opening, or rhetorical device you used in a prior turn (e.g. if you said "That's not the right question" once, you may NEVER use that phrase again)
- Using the same argumentative structure twice (e.g. if you used an analogy last turn, lead with data or a counter-example this turn)
- Opening consecutive turns the same way — vary between: direct rebuttal, concession-then-pivot, rhetorical question, anecdote, citing evidence, challenging a premise, or reframing the question
- Reusing transition words/phrases across turns (e.g. if you used "fundamentally" last turn, use different language this turn)

TACTICAL ADAPTATION (Turn ${turnCount + 1}):
You are ${turnCount + 1} turns into this debate. Skilled debaters read the room and shift tactics as a debate unfolds:${turnCount === 0 ? `
- This is your OPENING. Establish your strongest framing and core thesis. Plant seeds you can develop later.` : turnCount === 1 ? `
- Your opponent has laid out their framework. Find the WEAKEST link in their argument chain and attack it specifically. Concede a minor point to build credibility, then pivot to your strongest counter.` : `
- The debate is well underway. By now you should be ADAPTING: if your logical arguments aren't landing, try emotional appeal or vivid examples. If your opponent keeps deflecting, pin them down with specifics. If they're winning on one front, SHIFT THE BATTLEFIELD to terrain that favors you.
- Ask yourself: "What is my opponent's strongest point, and how do I neutralize it?" Then DO that.`}
- If your persona has high rhetorical sophistication, use advanced moves: steel-manning then dismantling, reductio ad absurdum, turning your opponent's evidence against them, or finding the hidden assumption in their argument.
- If your persona is more direct/populist, use vivid stories, common-sense framing, and moral clarity. Either way — NEVER repeat yourself.

You must output valid JSON matching this exact schema:
{
  "narrative": "string - your argument as flowing prose. No bullet points or lists. Write naturally as this persona would speak, with rhetorical flair, transitions, and persuasive structure. Directly respond to your opponent's most recent points before introducing new ones.",
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
