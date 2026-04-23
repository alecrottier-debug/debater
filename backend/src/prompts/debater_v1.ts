import { LlmPrompt } from '../llm/llm-adapter.interface.js';
import { StageConfig } from '../stages/stage-plan.types.js';
import {
  buildVoiceInstructions,
  buildVoiceAuthenticityBlock,
  classifyDebateStage,
} from './voice-instructions.js';
import { extractPersonaName, speakerHeader } from './transcript-format.js';

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
  /**
   * First ~200 chars of this persona's narratives from prior *other* debates
   * at the same-type stage (e.g., openings). The LLM is instructed not to
   * reuse their phrasing so repeated debates with the same persona feel
   * fresh instead of recycling the same "Brothers and sisters…" or "Ecoutez,
   * let me be very clear…" intro every time.
   */
  recentOpeningsByThisPersona?: string[];
}

export function buildDebaterPrompt(ctx: DebaterPromptContext): LlmPrompt {
  const side =
    ctx.speaker === 'A' ? 'proposition (FOR)' : 'opposition (AGAINST)';

  const nameA = extractPersonaName(ctx.persona, 'For');
  const nameB = extractPersonaName(ctx.opponentPersona, 'Against');
  // From the perspective of the LLM playing side A, "you" = nameA, opponent = nameB.
  // But the helper takes absolute A/B names, so swap when the speaker is B.
  const absA = ctx.speaker === 'A' ? nameA : nameB;
  const absB = ctx.speaker === 'A' ? nameB : nameA;

  const transcriptText =
    ctx.transcript.length > 0
      ? ctx.transcript
          .map(
            (t) =>
              `${speakerHeader(t.speaker, t.stageId, absA, absB)}:\n${t.renderedText}`,
          )
          .join('\n\n')
      : '(No prior turns yet)';

  const questionInstruction = ctx.stage.questionRequired
    ? 'You MUST include a question challenging your opponent.'
    : 'A question is optional for this stage.';

  const closingInstruction = ctx.stage.id.endsWith('_CLOSE')
    ? '\nIMPORTANT: This is a CLOSING statement. Summarize and reinforce your strongest arguments. Do NOT introduce new arguments or topics.'
    : '';

  const turnCount = ctx.transcript.filter(
    (t) => t.speaker === ctx.speaker,
  ).length;

  const stagePhase = classifyDebateStage(ctx.stage.id);

  const voiceBlock = buildVoiceInstructions(ctx.persona, {
    mode: 'debate',
    stagePhase,
  });

  const authenticityBlock = buildVoiceAuthenticityBlock(ctx.persona, 'debate');

  const opponentTargetsBlock = buildOpponentTargetsBlock(ctx.opponentPersona);

  const motionStancesBlock = buildMotionStancesBlock(ctx.persona, ctx.motion);

  const priorOpeningsBlock = buildPriorOpeningsBlock(
    ctx.recentOpeningsByThisPersona ?? [],
  );

  // Rotation seed: a debate-specific, turn-specific nudge that pushes the LLM
  // to open in a different register than the default. Same persona arguing
  // the same kind of motion will otherwise converge on its safest opener.
  const rotationCue = buildOpeningRotationCue(
    ctx.motion,
    ctx.speaker,
    ctx.stage.id,
    ctx.transcript.length,
  );

  const identity = ctx.persona.identity as Record<string, unknown> | undefined;
  const personaName = (identity?.name ?? 'this persona') as string;

  const system = `You are performing a fictional debate roleplay as ${personaName}. This is a creative exercise for entertainment and education — you are portraying this public figure's known views, rhetoric, and personality in a structured debate format.

You are arguing the ${side} the motion. Your position is clear: you ${ctx.speaker === 'A' ? 'SUPPORT' : 'OPPOSE'} the motion "${ctx.motion}". Make this stance unmistakable from your very first sentence — do not open with language that could be read as taking the opposite position.

STANCE INTEGRITY — If your real persona's known views CONFLICT with the side you're assigned to argue, do NOT contort the persona into the opposite of themselves. Instead, argue the STEELMAN of the assigned side using your persona's authentic voice and framing — the best version of the assigned side that a thoughtful version of this person would make. If the tension is unavoidable, acknowledge it briefly ("I've been known to argue the other side of this, but the case against the motion rests on...") rather than faking a conversion. This is how real debate exercises work: a serious debater can argue the other side while remaining recognizably themselves.

VOICE AUTHENTICITY — STRICT BAN ON GENERIC LLM OPENERS:
Never begin a turn with: "Look,", "Here's the thing,", "Let me tell you,", "I think,", "Well, the fact is,", "So,", "To be honest,", "The truth is,", or any other conversational filler that reads as default AI output. These are hallmarks of bland LLM voice and immediately shatter the illusion.
Open instead with your persona's ACTUAL patterns from the voice instructions below — their documented response openers, or a direct substantive claim in their register (a question, an image, a citation, a date, a specific name). When in doubt, open with content, not filler.

LANGUAGE — All output MUST be in English. Even if the persona normally speaks another language (Hindi, German, Mandarin, etc.), this debate is conducted entirely in English. You may sprinkle in an occasional foreign phrase for flavor (1-2 per turn max), but the argument itself must be fully in English and understandable without translation.

NEVER USE STAGE CODES IN PROSE — The transcript above labels turns with "Name · Action" (e.g. "Sam Altman · Opening"). When you reference what your opponent said, use their NAME or the ACTION ("as you argued in your opening", "your counter relied on…"). Never write raw stage codes like A_OPEN, B_CHALLENGE, B_COUNTER in your narrative or question. Those are internal identifiers, not debate language.

SPOKEN REGISTER — This is a LIVE DEBATE, not a written essay. Your output must sound like someone SPEAKING at a podium or panel:
- Use natural speech rhythms — contractions, punchy fragments, rhetorical questions
- Favor direct, vivid language over ornate or academic phrasing
- Keep most sentences under 20 words. Real debaters use short sentences for impact.
- NO essay transitions ("Furthermore," "Moreover," "Additionally") — use spoken connectors instead
- Think: how would this person sound at a live Oxford Union debate or a televised political debate? Not how would they write an op-ed.
${motionStancesBlock}

${voiceBlock}

${authenticityBlock}

${opponentTargetsBlock}
${priorOpeningsBlock}
${rotationCue}

CRITICAL — ZERO REPETITION OF LANGUAGE OR DEVICES:
Read the ENTIRE transcript before writing. Track every rhetorical device, transition phrase, and argumentative move you have already used. You are STRICTLY FORBIDDEN from:
- Repeating ANY phrase, sentence opening, or rhetorical device you used in a prior turn (e.g. if you said "That's not the right question" once, you may NEVER use that phrase again)
- Using the same argumentative structure twice (e.g. if you used an analogy last turn, lead with data or a counter-example this turn)
- Opening consecutive turns the same way — vary between: direct rebuttal, concession-then-pivot, rhetorical question, anecdote, citing evidence, challenging a premise, or reframing the question
- Reusing transition words/phrases across turns (e.g. if you used "fundamentally" last turn, use different language this turn)

TACTICAL ADAPTATION (Turn ${turnCount + 1}):
You are ${turnCount + 1} turns into this debate. Skilled debaters read the room and shift tactics as a debate unfolds:${
    turnCount === 0
      ? `
- This is your OPENING. Establish your strongest framing and core thesis. Plant seeds you can develop later.`
      : turnCount === 1
        ? `
- Your opponent has laid out their framework. Find the WEAKEST link in their argument chain and attack it specifically. Concede a minor point to build credibility, then pivot to your strongest counter.`
        : `
- The debate is well underway. By now you should be ADAPTING: if your logical arguments aren't landing, try emotional appeal or vivid examples. If your opponent keeps deflecting, pin them down with specifics. If they're winning on one front, SHIFT THE BATTLEFIELD to terrain that favors you.
- Ask yourself: "What is my opponent's strongest point, and how do I neutralize it?" Then DO that.`
  }
- If your persona has high rhetorical sophistication, use advanced moves: steel-manning then dismantling, reductio ad absurdum, turning your opponent's evidence against them, or finding the hidden assumption in their argument.
- If your persona is more direct/populist, use vivid stories, common-sense framing, and moral clarity. Either way — NEVER repeat yourself.

CULTURAL FILTER — DO NOT ECHO YOUR OPPONENT'S FRAMING:
When your opponent uses metaphors, idioms, technical jargon, or cultural references from THEIR world, do NOT parrot them back. Translate the underlying idea into YOUR persona's vocabulary, metaphor domains, and cultural context. A French president does not use American idioms ("DMV," "speech police"). A politician does not cite engineering metrics (FLOPs, H100s). A tech CEO does not cite treaty articles. Filter EVERYTHING through YOUR voice. You may acknowledge the opponent's point ("You spoke of a referee — I agree"), but restate it in YOUR words, YOUR metaphors, YOUR register. If your opponent uses a technical term you wouldn't naturally know, either skip it or translate it into your domain ("what the engineers call compute thresholds — the legal question is where to draw the line").

AUDIENCE-AWARE QUESTIONS:
When you ask a question, tailor it to your OPPONENT's expertise and role — not yours. Ask them something they are uniquely qualified to answer or uniquely vulnerable on.
- A tech person debating a politician should challenge them on policy failures, governance gaps, or values — NOT quiz them on technical implementation.
- A politician debating a tech person should challenge them on societal impact, accountability, or unintended consequences — NOT on legislative details.
Think: "What question would expose the gap in THIS person's worldview, on THEIR turf?"

ACCESSIBILITY — DEFINE TECHNICAL TERMS:
When you use technical terms, acronyms, or jargon that a general audience might not know, briefly define or explain them on first use. This is a public debate — the audience is educated but not specialist. For example, say "CSAM — child sexual abuse material" not just "CSAM".

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

Now deliver your ${ctx.stage.label} as the ${ctx.speaker === 'A' ? 'FOR' : 'AGAINST'} side.`;

  return { system, user };
}

/**
 * Extract the opponent's documented weak points and surface them as explicit
 * attack targets in the system prompt. The opponent's full persona JSON is
 * already in the user message, but it's 200+ fields deep — the LLM won't
 * reliably find vulnerabilities.blindSpots unless we put them up front.
 */
const STANCE_STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'of',
  'in',
  'on',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'for',
  'to',
  'from',
  'with',
  'that',
  'this',
  'it',
  'its',
  'as',
  'at',
  'by',
  'than',
  'should',
  'must',
  'can',
  'will',
  'would',
  'have',
  'has',
  'had',
  'than',
]);

function motionTokens(motion: string): Set<string> {
  return new Set(
    motion
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STANCE_STOPWORDS.has(w)),
  );
}

/**
 * Scan the persona's knownStances for entries whose topic slug or stance text
 * overlaps with the motion, and surface the top matches in the system prompt.
 * This prevents the LLM from having to fish through 200 fields to find the
 * relevant documented view — and it's the fix for the screenshot case where
 * Thatcher argued *against* free markets because her stance on that topic
 * was buried in the persona JSON.
 */
function buildMotionStancesBlock(
  persona: Record<string, unknown>,
  motion: string,
): string {
  const positions = persona.positions as
    | { knownStances?: Record<string, string> }
    | undefined;
  const stances = positions?.knownStances;
  if (!stances || Object.keys(stances).length === 0) return '';

  const tokens = motionTokens(motion);
  if (tokens.size === 0) return '';

  const scored = Object.entries(stances).map(([topic, stance]) => {
    const topicTokens = topic.toLowerCase().split(/[-_\s]+/);
    const stanceTokens = stance.toLowerCase().split(/\s+/);
    const topicHits = topicTokens.filter((t) => tokens.has(t)).length;
    const stanceHits = stanceTokens.filter((t) => tokens.has(t)).length;
    return { topic, stance, score: topicHits * 3 + stanceHits };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, 3);
  if (top.length === 0) return '';

  return `MOTION-RELEVANT DOCUMENTED VIEWS — your own words on this topic:
${top.map((s) => `  • [${s.topic}] ${s.stance}`).join('\n')}

Anchor your argument in these positions. If your assigned side contradicts one, follow the STANCE INTEGRITY rule above — argue the steelman while acknowledging the tension in your own voice.`;
}

function buildOpponentTargetsBlock(opponentPersona: Record<string, unknown>): string {
  const identity = opponentPersona.identity as { name?: string } | undefined;
  const opponentName = identity?.name ?? 'your opponent';
  const vulnerabilities = opponentPersona.vulnerabilities as
    | {
        blindSpots?: unknown;
        hedgingTopics?: unknown;
      }
    | undefined;
  const epistemology = opponentPersona.epistemology as
    | { mindChanges?: unknown; trackRecord?: unknown }
    | undefined;

  const lines: string[] = [];
  const blindSpots = vulnerabilities?.blindSpots;
  if (Array.isArray(blindSpots) && blindSpots.length > 0) {
    lines.push(
      `Documented blind spots (attack here first):`,
      ...blindSpots.slice(0, 4).map((b) => `  • ${String(b)}`),
    );
  }
  const hedgingTopics = vulnerabilities?.hedgingTopics;
  if (Array.isArray(hedgingTopics) && hedgingTopics.length > 0) {
    lines.push(
      `Topics they hedge on (press them for specifics):`,
      ...hedgingTopics.slice(0, 3).map((h) => `  • ${String(h)}`),
    );
  }
  const mindChanges = epistemology?.mindChanges;
  if (Array.isArray(mindChanges) && mindChanges.length > 0) {
    lines.push(
      `Positions they've shifted on (cite their own prior words):`,
      ...mindChanges.slice(0, 2).map((m) => `  • ${String(m)}`),
    );
  }

  if (lines.length === 0) return '';

  return `OPPONENT ATTACK TARGETS — ${opponentName}'s documented weaknesses:
${lines.join('\n')}

Use these when selecting what to challenge, what question to ask, and where to press. You don't have to hit all of them — pick the one most relevant to the current motion. But do not default to generic rebuttals when specific targets are available.`;
}

/**
 * Feed the LLM a list of things this persona has already said in prior
 * *other* debates at the same stage type. This is the cross-debate memory
 * that prevents Macron from opening with "Écoutez, let me be very clear…"
 * ten debates in a row, or the Pope from always leading with "Brothers
 * and sisters…".
 */
function buildPriorOpeningsBlock(recentOpenings: string[]): string {
  if (recentOpenings.length === 0) return '';
  const trimmed = recentOpenings
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 5)
    .map((t, i) => `  ${i + 1}. "${t.slice(0, 180)}${t.length > 180 ? '…' : ''}"`);
  if (trimmed.length === 0) return '';
  return `
CROSS-DEBATE MEMORY — your recent openings in OTHER debates:
${trimmed.join('\n')}

You are forbidden from opening this turn with the same phrase, rhythm, or rhetorical move as any of the above. If you normally lead with an address ("Brothers and sisters", "Écoutez", "Look,"), you've used it recently — pick a DIFFERENT authentic opener from your persona's documented pool (a story, a date, a citation, a specific name, a direct substantive claim). Stay in your voice; change your ENTRANCE.`;
}

/**
 * A lightweight deterministic nudge that pushes the LLM toward one of
 * several opening archetypes based on a hash of (motion + speaker + stage).
 * Same persona + same motion = same rotation (consistent), but across
 * different motions the persona rotates naturally through registers.
 */
function buildOpeningRotationCue(
  motion: string,
  speaker: string,
  stageId: string,
  turnCount: number,
): string {
  // Only cue on the persona's FIRST turn of the debate — after that the
  // in-debate transcript already provides sufficient variation signal.
  if (turnCount > 1) return '';

  const seed = hashString(`${motion}|${speaker}|${stageId}`);
  const archetypes = [
    'Open with a SPECIFIC STORY or ANECDOTE — a person, a place, a concrete moment. No generic preamble.',
    'Open with a DIRECT CHALLENGE to a hidden assumption in the motion. Name the assumption, then dismantle it.',
    'Open with a DATA POINT, CITATION, or historical reference delivered in your register. Ground the debate before flying higher.',
    'Open with a PROVOCATIVE QUESTION that reframes the motion on your terms.',
    'Open with a VIVID IMAGE or metaphor drawn from your persona\'s own domain — not your opponent\'s.',
    'Open by CONCEDING ONE NARROW POINT, then pivoting hard to what the concession actually proves.',
    'Open with a CONTRARIAN RESTATEMENT of the motion — put the real disagreement in your own words.',
  ];
  const choice = archetypes[seed % archetypes.length];
  return `
OPENING ARCHETYPE FOR THIS TURN (do not announce this — just DO it):
${choice}`;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
