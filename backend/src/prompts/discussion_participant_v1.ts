import { LlmPrompt } from '../llm/llm-adapter.interface.js';
import { StageConfig } from '../stages/stage-plan.types.js';
import {
  buildVoiceInstructions,
  buildVoiceAuthenticityBlock,
  classifyDiscussionStage,
} from './voice-instructions.js';

export const DISCUSSION_PARTICIPANT_PROMPT_VERSION = 'discussion_participant_v1';

export interface DiscussionParticipantPromptContext {
  topic: string;
  stage: StageConfig;
  speaker: 'A' | 'B';
  persona: Record<string, unknown>;
  otherPersona: Record<string, unknown>;
  transcript: Array<{ stageId: string; speaker: string; renderedText: string }>;
}

export function buildDiscussionParticipantPrompt(
  ctx: DiscussionParticipantPromptContext,
): LlmPrompt {
  const isFinal = ctx.stage.id.endsWith('_FINAL');

  const transcriptText =
    ctx.transcript.length > 0
      ? ctx.transcript
          .map((t) => `[${t.stageId}] (${t.speaker}): ${t.renderedText}`)
          .join('\n\n')
      : '(No prior turns yet)';

  const finalInstruction = isFinal
    ? '\nIMPORTANT: This is your FINAL thought. Be concise and reflective — distill your most important insight on this topic.'
    : '';

  const turnCount = ctx.transcript.filter((t) => t.speaker === ctx.speaker).length;

  const stagePhase = classifyDiscussionStage(ctx.stage.id);

  const voiceBlock = buildVoiceInstructions(ctx.persona, {
    mode: 'discussion',
    stagePhase,
  });

  const authenticityBlock = buildVoiceAuthenticityBlock(ctx.persona, 'discussion');

  const system = `You are a guest on a moderated discussion show. You are NOT in a debate — there are no sides, no winner. Share your genuine perspective, engage thoughtfully with the other guest's points, and respond to the moderator's questions conversationally.
${voiceBlock}

${authenticityBlock}

ENGAGEMENT: Read the transcript carefully. Respond to the moderator's most recent question. Reference what the other guest said — agree, build on, or respectfully push back. Be genuine, not combative. Bring new angles and fresh thinking with each response.

CRITICAL — ZERO REPETITION OF LANGUAGE OR DEVICES:
Before writing, scan ALL of your prior turns in the transcript. You are STRICTLY FORBIDDEN from:
- Repeating ANY phrase, rhetorical device, or sentence structure you already used (e.g. if you said "That's not the right question" or "The real issue is..." once, NEVER use it again)
- Opening consecutive responses the same way — rotate between: building on the other guest's point, sharing a personal anecdote, challenging an assumption, offering a surprising concession, citing a specific fact, or reframing the moderator's question
- Using the same connective phrases across turns — if you used "Look," or "Here's the thing," in one turn, use completely different language next time
- Falling into verbal tics or catchphrases, even if they're characteristic — a real person varies their language in a live conversation

CONVERSATIONAL EVOLUTION (Turn ${turnCount + 1}):
Real conversations EVOLVE. Your responses should shift as the discussion deepens:${turnCount === 0 ? `
- This is your FIRST response. Establish your perspective clearly. Share what drew you to this topic and what you find most important about it.` : turnCount === 1 ? `
- The conversation is developing. Build on what has been said — find a thread from the other guest that surprised you or challenged your thinking. Show intellectual flexibility.` : `
- The discussion is well underway. By now, you should be going DEEPER, not wider. Pick the most interesting tension or insight from the conversation so far and explore it with specificity. If you've been mostly agreeing, find a genuine point of divergence. If you've been mostly disagreeing, find unexpected common ground. The audience wants to see your thinking DEVELOP in real-time, not hear you restate your opening position.`}
- Adapt your rhetorical approach: if you started with big-picture framing, drill into specifics now. If you led with data, pivot to human stories. If you've been analytical, show passion. Real people shift registers as conversations deepen.

You must output valid JSON matching this exact schema:
{
  "narrative": "string - your response as flowing prose. No bullet points. Write naturally as this persona would speak in a conversational setting.",
  "question": "",
  "callbacks": ["string - references to prior stage IDs you are engaging with"],
  "tags": ["string - topic tags"]
}

Stage: ${ctx.stage.label} (${ctx.stage.id})
Constraints:
- Maximum words: ${ctx.stage.maxWords ?? 'unlimited'}${finalInstruction}

Output ONLY valid JSON. No markdown, no explanation.`;

  const user = `Topic: "${ctx.topic}"

Your persona:
${JSON.stringify(ctx.persona, null, 2)}

Other guest's persona:
${JSON.stringify(ctx.otherPersona, null, 2)}

Transcript so far:
${transcriptText}

Now share your perspective as Guest ${ctx.speaker}.`;

  return { system, user };
}
