import { LlmPrompt } from '../llm/llm-adapter.interface.js';
import { StageConfig } from '../stages/stage-plan.types.js';

export const DISCUSSION_MODERATOR_PROMPT_VERSION = 'discussion_moderator_v1';

export interface DiscussionModeratorPromptContext {
  topic: string;
  stage: StageConfig;
  personaA: Record<string, unknown>;
  personaB: Record<string, unknown>;
  moderatorPersona: Record<string, unknown>;
  confrontationLevel: number;
  transcript: Array<{ stageId: string; speaker: string; renderedText: string }>;
}

type StageType = 'intro' | 'question' | 'synthesis' | 'wrap';

function getStageType(stageId: string): StageType {
  if (stageId === 'MOD_INTRO') return 'intro';
  if (stageId === 'MOD_SYNTHESIS') return 'synthesis';
  if (stageId === 'MOD_WRAP') return 'wrap';
  return 'question';
}

function buildModeratorIdentity(persona: Record<string, unknown>): string {
  const identity = persona.identity as Record<string, unknown> | undefined;
  const style = persona.interviewStyle as Record<string, unknown> | undefined;
  const rhetoric = persona.rhetoric as Record<string, unknown> | undefined;

  const parts: string[] = [];

  if (identity) {
    parts.push(`You are ${identity.name}, ${identity.tagline}.`);
    const bio = identity.biography as Record<string, unknown> | undefined;
    if (bio?.summary) parts.push(bio.summary as string);
  }

  if (style) {
    parts.push(`\nInterview approach: ${style.approach}`);
    parts.push(`Tone: ${style.tone}`);
    if (style.pacing) parts.push(`Pacing: ${style.pacing}`);
  }

  if (rhetoric) {
    const phrases = rhetoric.signaturePhrases as string[] | undefined;
    if (phrases?.length) {
      parts.push(`\nSignature phrases you may use: ${phrases.join('; ')}`);
    }
    if (rhetoric.sentenceRhythm) parts.push(`Sentence rhythm: ${rhetoric.sentenceRhythm}`);
    if (rhetoric.humorUsage) parts.push(`Humor: ${rhetoric.humorUsage}`);
  }

  return parts.join('\n');
}

function buildConfrontationGuidance(
  persona: Record<string, unknown>,
  level: number,
): string {
  const profile = persona.confrontationProfile as Record<string, unknown> | undefined;
  if (!profile) return `Confrontation level: ${level}/5.`;

  const levelKey = `level${level}` as string;
  const levelProfile = profile[levelKey] as Record<string, unknown> | undefined;

  if (!levelProfile) return `Confrontation level: ${level}/5.`;

  const parts = [
    `CONFRONTATION LEVEL: ${level}/5`,
    `Demeanor: ${levelProfile.demeanor}`,
    `Question style: ${levelProfile.questionStyle}`,
    `Interruption frequency: ${levelProfile.interruptionFrequency}`,
    `Response to evasion: ${levelProfile.responseToEvasion}`,
    `Overall goal: ${levelProfile.overallGoal}`,
  ];

  return parts.join('\n');
}

function buildSignatureMoves(persona: Record<string, unknown>, level: number): string {
  const moves = persona.signatureMoves as Array<{
    name: string;
    description: string;
    confrontationThreshold: number;
  }> | undefined;

  if (!moves?.length) return '';

  const available = moves.filter((m) => m.confrontationThreshold <= level);
  if (!available.length) return '';

  return (
    '\nSignature moves available at this confrontation level:\n' +
    available.map((m) => `- ${m.name}: ${m.description}`).join('\n')
  );
}

function buildStageInstructions(stageType: StageType, stage: StageConfig): string {
  switch (stageType) {
    case 'intro':
      return `This is the INTRODUCTION. Introduce the topic and both guests. Explain why this topic matters right now. Set the tone for the discussion. End by transitioning naturally into the first question.

Output JSON: { "narrative": "your introduction as flowing prose" }`;

    case 'question':
      return `This is a QUESTION stage. Read the transcript carefully. Build on what the guests have said. Push deeper into interesting threads, challenge assumptions, or redirect to unexplored angles. Ask ONE clear, pointed question.

Stage: ${stage.label} (${stage.id})
${stage.id === 'MOD_Q3' ? 'This should be your SHARPEST, most provocative question — the one that forces both guests to confront the hardest aspect of the topic.' : ''}

Output JSON: { "narrative": "your question/commentary as flowing prose, ending with a clear question" }`;

    case 'synthesis':
      return `This is the SYNTHESIS stage. Identify the key themes that have emerged, where the guests agree, where they disagree, and what remains unresolved. Then ask a final reflective question that invites both guests to share their closing thought.

Output JSON: { "narrative": "your synthesis as flowing prose, ending with a reflective question" }`;

    case 'wrap':
      return `This is the WRAP-UP. Summarize the entire discussion: key takeaways, areas of agreement, areas of disagreement, and open questions that remain.

Output JSON:
{
  "narrative": "your wrap-up summary as flowing prose",
  "keyTakeaways": ["string array of 3-5 key takeaways"],
  "areasOfAgreement": ["string array of points both guests agreed on"],
  "areasOfDisagreement": ["string array of points where guests diverged"],
  "openQuestions": ["string array of unresolved questions for the audience"]
}`;
  }
}

export function buildDiscussionModeratorPrompt(
  ctx: DiscussionModeratorPromptContext,
): LlmPrompt {
  const stageType = getStageType(ctx.stage.id);
  const guestAName = (ctx.personaA.identity as Record<string, unknown> | undefined)?.name ?? 'Guest A';
  const guestBName = (ctx.personaB.identity as Record<string, unknown> | undefined)?.name ?? 'Guest B';

  const transcriptText =
    ctx.transcript.length > 0
      ? ctx.transcript
          .map((t) => `[${t.stageId}] (${t.speaker}): ${t.renderedText}`)
          .join('\n\n')
      : '(No prior turns yet)';

  const system = `${buildModeratorIdentity(ctx.moderatorPersona)}

${buildConfrontationGuidance(ctx.moderatorPersona, ctx.confrontationLevel)}
${buildSignatureMoves(ctx.moderatorPersona, ctx.confrontationLevel)}

You are moderating a DISCUSSION (not a formal debate). There are no sides, no winner. Your goal is to draw out insight, nuance, and genuine exchange between the guests. Guide, probe, and challenge — but the guests are not opponents, they are conversation partners.

CRITICAL — YOUR OWN LANGUAGE VARIETY: Read your prior turns in the transcript. You MUST NOT reuse the same question structures, transitions, or framing devices. Each question should feel genuinely different — vary between direct challenges, hypothetical scenarios, personal questions, devil's advocate positions, and asking guests to respond to each other's specific points.

PUSH FOR EVOLUTION: If a guest is repeating themselves, circling back to the same point, or using the same rhetorical device repeatedly, CALL IT OUT and redirect. Good moderators don't let guests stay comfortable. Push them into new territory: "You've made that point — but what about...?" or "Setting that aside, I'm more interested in..."

${buildStageInstructions(stageType, ctx.stage)}

Stage constraints:
- Maximum words: ${ctx.stage.maxWords ?? 'unlimited'}

Output ONLY valid JSON. No markdown, no explanation.`;

  const user = `Topic: "${ctx.topic}"

Guest A: ${guestAName}
${JSON.stringify(ctx.personaA, null, 2)}

Guest B: ${guestBName}
${JSON.stringify(ctx.personaB, null, 2)}

Transcript so far:
${transcriptText}`;

  return { system, user };
}
