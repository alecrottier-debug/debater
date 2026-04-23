import { LlmPrompt } from '../llm/llm-adapter.interface.js';
import { StageConfig } from '../stages/stage-plan.types.js';
import { speakerHeader } from './transcript-format.js';

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
    if (rhetoric.sentenceRhythm)
      parts.push(`Sentence rhythm: ${rhetoric.sentenceRhythm}`);
    if (rhetoric.humorUsage) parts.push(`Humor: ${rhetoric.humorUsage}`);
  }

  return parts.join('\n');
}

function buildConfrontationGuidance(
  persona: Record<string, unknown>,
  level: number,
): string {
  const profile = persona.confrontationProfile as
    | Record<string, unknown>
    | undefined;
  if (!profile) return `Confrontation level: ${level}/5.`;

  const levelKey = `level${level}`;
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

function buildSignatureMoves(
  persona: Record<string, unknown>,
  level: number,
): string {
  const moves = persona.signatureMoves as
    | Array<{
        name: string;
        description: string;
        confrontationThreshold: number;
      }>
    | undefined;

  if (!moves?.length) return '';

  const available = moves.filter((m) => m.confrontationThreshold <= level);
  if (!available.length) return '';

  return (
    '\nSignature moves available at this confrontation level:\n' +
    available.map((m) => `- ${m.name}: ${m.description}`).join('\n')
  );
}

function buildStageInstructions(
  stageType: StageType,
  stage: StageConfig,
): string {
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
  const guestAName = String(
    (ctx.personaA.identity as Record<string, unknown> | undefined)?.name ??
      'Guest A',
  );
  const guestBName = String(
    (ctx.personaB.identity as Record<string, unknown> | undefined)?.name ??
      'Guest B',
  );

  const transcriptText =
    ctx.transcript.length > 0
      ? ctx.transcript
          .map(
            (t) =>
              `${speakerHeader(t.speaker, t.stageId, guestAName, guestBName)}:\n${t.renderedText}`,
          )
          .join('\n\n')
      : '(No prior turns yet)';

  const system = `${buildModeratorIdentity(ctx.moderatorPersona)}

${buildConfrontationGuidance(ctx.moderatorPersona, ctx.confrontationLevel)}
${buildSignatureMoves(ctx.moderatorPersona, ctx.confrontationLevel)}

You are moderating a DISCUSSION (not a formal debate). There are no sides, no winner — the two guests may agree, disagree, or land on overlapping-but-not-identical positions. Your job is to draw out what's GENUINELY interesting, nuanced, or contested between them, even when they agree on the headline claim. Guide, probe, and challenge — but the guests are partners in exploring the topic, not opponents.

CRITICAL — YOUR OWN LANGUAGE VARIETY: Read your prior turns in the transcript. You MUST NOT reuse the same question structures, transitions, or framing devices. Each question should feel genuinely different — vary between direct challenges, hypothetical scenarios, personal questions, devil's advocate positions, and asking guests to respond to each other's specific points.

PUT THEM ON THE SPOT WITH THEIR OWN WORDS:
The guest persona JSON below has rich documented history — use it. Specifically:
- \`positions.knownStances\` — public positions they've taken on specific topics. If a guest hedges or softens their view in the discussion, quote their PRIOR documented stance back at them: "On your show last year you said X — has that changed?"
- \`epistemology.mindChanges\` — topics where they've publicly shifted positions. Ask what changed their mind. Or challenge a current claim by pointing at the shift.
- \`epistemology.trackRecord\` — specific predictions, calls, or claims that either landed or didn't. Cite one directly when it's relevant.
- \`vulnerabilities.blindSpots\` — areas they tend to avoid. Steer the conversation there; don't let them detour out.
- \`vulnerabilities.hedgingTopics\` — things they get vague about. Press for specifics.
- \`voiceCalibration.realQuotes\` — actual things they've said. If a quote from here is relevant, ask them to square it with what they're arguing now.

A great moderator reads wide, remembers specifics, and quietly uses them to force honest answers. Don't just ask opinion questions — deploy their OWN history as the pressure point.

DISAGREEMENT WITHOUT SIDES:
If the two guests find themselves agreeing on the broad claim, your job becomes HARDER, not easier. Find the sharpest point of actual divergence — priorities, mechanisms, tradeoffs, timelines, who pays, what counts as success. Surface it: "You both agree X — but I suspect you'd answer differently if I asked who pays for it. Let's test that." Never manufacture conflict, but never let genuine disagreement stay buried either.

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
