/**
 * Shared voice instruction builder for debater and discussion participant prompts.
 *
 * Extracts rich voice calibration data from persona JSON and formats it into
 * explicit, forceful instructions that drive authentic persona voice output.
 */

// ─── Stage classification ────────────────────────────────────────────────

export type DebateStagePhase = 'opening' | 'rebuttal' | 'closing';
export type DiscussionStagePhase = 'first_response' | 'mid_discussion' | 'final';

export type StagePhase = DebateStagePhase | DiscussionStagePhase;

/** Classify a debate stage ID into a phase for voice adaptation. */
export function classifyDebateStage(stageId: string): DebateStagePhase {
  if (stageId.endsWith('_OPEN')) return 'opening';
  if (stageId.endsWith('_CLOSE')) return 'closing';
  return 'rebuttal'; // _REBUTTAL, _COUNTER, _CHALLENGE, etc.
}

/** Classify a discussion stage ID into a phase for voice adaptation. */
export function classifyDiscussionStage(stageId: string): DiscussionStagePhase {
  if (stageId.endsWith('_FINAL')) return 'final';
  if (stageId.endsWith('_RESPOND_1')) return 'first_response';
  return 'mid_discussion';
}

// ─── Voice instruction builder ───────────────────────────────────────────

export interface VoiceInstructionOptions {
  /**
   * 'debate' produces combative framing (opponent, attack, etc.).
   * 'discussion' produces collaborative framing (other guest, exchange, etc.).
   */
  mode: 'debate' | 'discussion';

  /**
   * Current stage phase — controls which stage-specific voice adaptations
   * are injected (e.g. firstAttackPatterns for 'opening', underPressure for 'rebuttal').
   */
  stagePhase: StagePhase;
}

/**
 * Extract voice calibration data from a persona JSON object and format it as
 * forceful, explicit system-prompt instructions.
 *
 * Pulls from:
 *   rhetoric.*  — sentence rhythm, vocabulary register, emotional valence,
 *                 signature phrases, rhetorical moves, argument structure,
 *                 qualifier usage, metaphor domains
 *   voiceCalibration.* — real quotes, sentence patterns, verbal tics,
 *                         response openers, transition phrases, emphasis markers,
 *                         under-pressure / when-agreeing / when-dismissing patterns,
 *                         distinctive vocabulary, register mixing
 *   epistemology.citationStyle — how they cite evidence
 *   epistemology.disagreementResponse — how they handle disagreement
 *   positions.firstAttackPatterns — how they open attacks
 *   vulnerabilities.blindSpots — areas of potential weakness
 */
export function buildVoiceInstructions(
  persona: Record<string, unknown>,
  opts: VoiceInstructionOptions,
): string {
  const identity = persona.identity as Record<string, unknown> | undefined;
  const rhetoric = persona.rhetoric as Record<string, unknown> | undefined;
  const voice = persona.voiceCalibration as Record<string, unknown> | undefined;
  const epistemology = persona.epistemology as Record<string, unknown> | undefined;
  const positions = persona.positions as Record<string, unknown> | undefined;
  const vulnerabilities = persona.vulnerabilities as Record<string, unknown> | undefined;

  const name = (identity?.name ?? 'this persona') as string;

  const parts: string[] = [];

  // ── 1. Core voice identity from rhetoric ──────────────────────────────

  if (rhetoric) {
    if (rhetoric.sentenceRhythm)
      parts.push(`YOUR SENTENCE RHYTHM: ${rhetoric.sentenceRhythm}`);
    if (rhetoric.vocabularyRegister)
      parts.push(`YOUR VOCABULARY REGISTER: ${rhetoric.vocabularyRegister}`);
    if (rhetoric.emotionalValence)
      parts.push(`YOUR EMOTIONAL RANGE: ${rhetoric.emotionalValence}`);

    // Signature phrases
    const phrases = rhetoric.signaturePhrases as string[] | undefined;
    if (phrases?.length)
      parts.push(
        `PHRASES YOU USE (vary — don't overuse any single one): ${phrases.slice(0, 6).join(' | ')}`,
      );

    // Rhetorical moves
    const moves = rhetoric.rhetoricalMoves as string[] | undefined;
    if (moves?.length)
      parts.push(
        `YOUR RHETORICAL TOOLKIT (rotate between these):\n${moves.map((m) => `  - ${m}`).join('\n')}`,
      );

    // NEW: Argument structure — how this person builds arguments
    const argStructure = rhetoric.argumentStructure as string[] | undefined;
    if (argStructure?.length)
      parts.push(
        `HOW YOU BUILD ARGUMENTS (follow this structure):\n${argStructure.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`,
      );

    // NEW: Qualifier usage — how they hedge or don't
    if (rhetoric.qualifierUsage)
      parts.push(`YOUR QUALIFIER PATTERNS: ${rhetoric.qualifierUsage}`);

    // NEW: Metaphor domains — where they draw imagery from
    const metaphors = rhetoric.metaphorDomains as string[] | undefined;
    if (metaphors?.length)
      parts.push(
        `METAPHOR DOMAINS — Draw imagery and analogies from these worlds:\n${metaphors.map((m) => `  - ${m}`).join('\n')}`,
      );
  }

  // ── 2. Voice calibration — real speech patterns ───────────────────────

  if (voice) {
    // Real quotes as voice anchor
    const quotes = voice.realQuotes as string[] | undefined;
    if (quotes?.length) {
      parts.push(
        `VOICE CALIBRATION — These are real quotes from ${name}. Study the rhythm, word choice, and tone. Your output must sound like it belongs alongside these:\n${quotes.slice(0, 5).map((q) => `  "${q}"`).join('\n')}`,
      );
    }

    // Sentence patterns
    if (voice.sentencePatterns)
      parts.push(
        `HOW ${name.toUpperCase()} BUILDS SENTENCES — Match these patterns precisely:\n${voice.sentencePatterns}`,
      );

    // Verbal tics
    if (voice.verbalTics)
      parts.push(`VERBAL HABITS (use naturally — these make you sound real): ${voice.verbalTics}`);

    // Response openers
    const openers = voice.responseOpeners as string[] | undefined;
    if (openers?.length)
      parts.push(
        `HOW YOU START RESPONSES (rotate — never open the same way twice): ${openers.join(' / ')}`,
      );

    // NEW: Transition phrases
    const transitions = voice.transitionPhrases as string[] | undefined;
    if (transitions?.length)
      parts.push(
        `YOUR TRANSITION PHRASES (use these to connect ideas — rotate, don't repeat): ${transitions.join(' / ')}`,
      );

    // NEW: Emphasis markers
    const emphasis = voice.emphasisMarkers as string[] | undefined;
    if (emphasis?.length)
      parts.push(
        `HOW YOU EMPHASIZE KEY POINTS: ${emphasis.join(' / ')}`,
      );

    // Pressure response
    if (voice.underPressure)
      parts.push(`WHEN CHALLENGED OR UNDER PRESSURE: ${voice.underPressure}`);

    // NEW: When agreeing (especially useful in discussion mode)
    if (voice.whenAgreeing)
      parts.push(
        opts.mode === 'discussion'
          ? `HOW YOU AGREE OR BUILD ON OTHERS' POINTS: ${voice.whenAgreeing}`
          : `WHEN CONCEDING A POINT: ${voice.whenAgreeing}`,
      );

    // When dismissing
    if (voice.whenDismissing)
      parts.push(`WHEN DISMISSING: ${voice.whenDismissing}`);

    // Distinctive vocabulary
    const vocab = voice.distinctiveVocabulary as string[] | undefined;
    if (vocab?.length)
      parts.push(
        `WORDS YOU REACH FOR — Sprinkle these naturally through your speech: ${vocab.slice(0, 12).join(', ')}`,
      );

    // Register mixing
    if (voice.registerMixing)
      parts.push(`REGISTER MIXING: ${voice.registerMixing}`);
  }

  // ── 3. Epistemological voice — how they cite and handle disagreement ──

  if (epistemology) {
    // NEW: Citation style
    if (epistemology.citationStyle)
      parts.push(
        `HOW YOU CITE EVIDENCE AND SOURCES: ${epistemology.citationStyle}`,
      );

    // NEW: Disagreement response (more relevant in rebuttal stages)
    if (epistemology.disagreementResponse)
      parts.push(
        opts.mode === 'debate'
          ? `HOW YOU HANDLE DISAGREEMENT: ${epistemology.disagreementResponse}`
          : `HOW YOU ENGAGE WITH DIFFERENT VIEWS: ${epistemology.disagreementResponse}`,
      );
  }

  // ── 4. Conversational profile — how this person actually behaves in discussions ──

  const convo = persona.conversationalProfile as Record<string, string> | undefined;
  if (convo && opts.mode === 'discussion') {
    parts.push('');
    parts.push('=== HOW YOU ACTUALLY TALK IN CONVERSATIONS ===');
    parts.push('These are the MOST IMPORTANT voice instructions. They override everything else.');
    parts.push('');
    if (convo.responseLength) parts.push(`RESPONSE LENGTH: ${convo.responseLength}. Match this precisely — do NOT pad your response to fill the word limit if this person would naturally be briefer.`);
    if (convo.listeningStyle) parts.push(`LISTENING & ENGAGEMENT: ${convo.listeningStyle}`);
    if (convo.agreementStyle) parts.push(`WHEN YOU AGREE: ${convo.agreementStyle}`);
    if (convo.disagreementStyle) parts.push(`WHEN YOU DISAGREE: ${convo.disagreementStyle}`);
    if (convo.energyLevel) parts.push(`YOUR ENERGY: ${convo.energyLevel}`);
    if (convo.tangentTendency) parts.push(`TOPIC DISCIPLINE: ${convo.tangentTendency}`);
    if (convo.humorInConversation) parts.push(`HUMOR: ${convo.humorInConversation}`);
    if (convo.silenceComfort) parts.push(`PACING: ${convo.silenceComfort}`);
    if (convo.questionAsking) parts.push(`QUESTIONS: ${convo.questionAsking}`);
    if (convo.realWorldAnchoring) parts.push(`GROUNDING: ${convo.realWorldAnchoring}`);
    if (convo.interruptionPattern) parts.push(`INTERJECTION STYLE: ${convo.interruptionPattern}`);
  }

  // ── 5. Stage-specific voice adaptation ────────────────────────────────

  const stageAdaptation = buildStageAdaptation(
    name,
    opts,
    positions,
    voice,
    epistemology,
    rhetoric,
    vulnerabilities,
  );
  if (stageAdaptation) parts.push(stageAdaptation);

  // ── 6. Assemble ───────────────────────────────────────────────────────

  if (parts.length === 0) return '';
  return (
    '\n\u2550\u2550\u2550 VOICE INSTRUCTIONS \u2014 You ARE ' +
    name +
    '. Every word must sound like it came from this person\u2019s mouth. \u2550\u2550\u2550\n' +
    parts.join('\n\n')
  );
}

// ─── Stage-specific adaptation block ─────────────────────────────────────

function buildStageAdaptation(
  name: string,
  opts: VoiceInstructionOptions,
  positions: Record<string, unknown> | undefined,
  voice: Record<string, unknown> | undefined,
  epistemology: Record<string, unknown> | undefined,
  rhetoric: Record<string, unknown> | undefined,
  vulnerabilities: Record<string, unknown> | undefined,
): string {
  const sections: string[] = [];

  if (opts.mode === 'debate') {
    switch (opts.stagePhase as DebateStagePhase) {
      case 'opening': {
        sections.push(`STAGE ADAPTATION — OPENING:`);
        sections.push(
          `This is your opening salvo. Establish dominance and plant your strongest framing.`,
        );
        // Use firstAttackPatterns
        const attackPatterns = positions?.firstAttackPatterns as string[] | undefined;
        if (attackPatterns?.length) {
          sections.push(
            `${name.toUpperCase()}'S OPENING ATTACK PATTERNS — Choose one or combine:\n${attackPatterns.map((p) => `  - ${p}`).join('\n')}`,
          );
        }
        // Use argument structure
        const argStructure = rhetoric?.argumentStructure as string[] | undefined;
        if (argStructure?.length) {
          sections.push(
            `Follow your natural argument structure: begin with step 1 and build toward a memorable close.`,
          );
        }
        break;
      }
      case 'rebuttal': {
        sections.push(`STAGE ADAPTATION — REBUTTAL / COUNTER:`);
        sections.push(
          `You are responding to your opponent's arguments. Find the weakest link and attack it.`,
        );
        // Use disagreement response patterns
        if (epistemology?.disagreementResponse) {
          sections.push(
            `Channel your disagreement style: ${epistemology.disagreementResponse}`,
          );
        }
        // Use under-pressure patterns
        if (voice?.underPressure) {
          sections.push(
            `If your opponent scored a strong point, deploy your under-pressure tactics: ${voice.underPressure}`,
          );
        }
        // Blind spots awareness
        const blindSpots = vulnerabilities?.blindSpots as string[] | undefined;
        if (blindSpots?.length) {
          sections.push(
            `VULNERABILITY AWARENESS — Your opponent may target these weak spots. Be prepared to defend or deflect:\n${blindSpots.slice(0, 3).map((b) => `  - ${b}`).join('\n')}`,
          );
        }
        break;
      }
      case 'closing': {
        sections.push(`STAGE ADAPTATION — CLOSING:`);
        sections.push(
          `This is your final statement. No new arguments — summarize and drive home your strongest points.`,
        );
        // Use emphasis markers for the close
        const emphasis = voice?.emphasisMarkers as string[] | undefined;
        if (emphasis?.length) {
          sections.push(
            `Use your emphasis patterns to land your closing with maximum force: ${emphasis.join(' / ')}`,
          );
        }
        // Emotional escalation
        if (rhetoric?.emotionalValence) {
          sections.push(
            `Closing emotional register: Elevate your emotional intensity for the final statement. ${rhetoric.emotionalValence}`,
          );
        }
        break;
      }
    }
  } else {
    // Discussion mode
    switch (opts.stagePhase as DiscussionStagePhase) {
      case 'first_response': {
        sections.push(`STAGE ADAPTATION — FIRST RESPONSE:`);
        sections.push(
          `This is your first contribution. Establish your perspective clearly and authentically.`,
        );
        // Use argument structure to set up initial framing
        const argStructure = rhetoric?.argumentStructure as string[] | undefined;
        if (argStructure?.length) {
          sections.push(
            `Use your natural argument structure to frame your opening perspective.`,
          );
        }
        break;
      }
      case 'mid_discussion': {
        sections.push(`STAGE ADAPTATION — MID-DISCUSSION:`);
        sections.push(
          `The conversation is developing. Engage with what has been said — agree, build on, or respectfully push back.`,
        );
        // Use whenAgreeing for collaborative engagement
        if (voice?.whenAgreeing) {
          sections.push(
            `When you find common ground, use your natural agreement style: ${voice.whenAgreeing}`,
          );
        }
        // Use disagreement response for pushback
        if (epistemology?.disagreementResponse) {
          sections.push(
            `When you disagree, channel your natural response: ${epistemology.disagreementResponse}`,
          );
        }
        break;
      }
      case 'final': {
        sections.push(`STAGE ADAPTATION — FINAL THOUGHT:`);
        sections.push(
          `This is your last word. Distill your most important insight. Be concise and memorable.`,
        );
        // Use emphasis markers
        const emphasis = voice?.emphasisMarkers as string[] | undefined;
        if (emphasis?.length) {
          sections.push(
            `Land your final point with emphasis: ${emphasis.join(' / ')}`,
          );
        }
        break;
      }
    }
  }

  if (sections.length <= 1) return '';
  return sections.join('\n');
}

// ─── Voice authenticity preamble ─────────────────────────────────────────

/**
 * Returns a strongly-worded authenticity instruction block that should be
 * placed in the system prompt after the voice instructions block.
 *
 * Tailored for debate vs. discussion mode.
 */
export function buildVoiceAuthenticityBlock(
  persona: Record<string, unknown>,
  mode: 'debate' | 'discussion',
): string {
  const identity = persona.identity as Record<string, unknown> | undefined;
  const name = (identity?.name ?? 'this persona') as string;
  const rhetoric = persona.rhetoric as Record<string, unknown> | undefined;

  const sentenceRhythm = (rhetoric?.sentenceRhythm ?? '') as string;

  // Detect whether this persona uses short or long sentences for a targeted instruction
  const lengthGuidance = buildSentenceLengthGuidance(sentenceRhythm);

  const modeContext =
    mode === 'debate'
      ? 'debate prose'
      : 'discussion prose';

  if (mode === 'discussion') {
    // Check for conversationalProfile to override sentence length guidance
    const convo = persona.conversationalProfile as Record<string, string> | undefined;
    const responseLengthGuidance = convo?.responseLength
      ? `Match ${name}'s natural response length: ${convo.responseLength}. Do NOT force short responses if they naturally give longer, detailed answers, and do NOT pad responses if they are naturally brief.`
      : `Keep it short and natural. Even if ${name} writes long sentences, people talk in shorter ones. ${lengthGuidance}`;

    const sentenceLengthGuidance = convo?.responseLength
      ? `SENTENCE LENGTH: Match this persona's natural speech patterns. Some people speak in short, punchy sentences. Others build complex, multi-clause thoughts. Follow the persona's sentenceRhythm and conversationalProfile — do NOT force all personas into the same short-sentence pattern.`
      : `SENTENCE LENGTH: Keep it short and natural. Even if ${name} writes long sentences, people talk in shorter ones. ${lengthGuidance}`;

    // Discussion mode: prioritize naturalness over strict pattern-matching
    return `PERSONA VOICE — You are ${name}. The audience should recognize you within the first few words.

BUT: Naturalness ALWAYS wins over pattern-matching in a discussion. Do NOT try to cram in every rhetorical device, signature phrase, or vocal pattern from your persona data. Real people on panels use maybe 10-20% of their full rhetorical toolkit in any given response.

HOW TO SOUND LIKE ${name.toUpperCase()} IN CONVERSATION:
\u2022 WORD CHOICE: Use ${name}'s natural vocabulary — the words they reach for instinctively. But keep it conversational, not performative.
\u2022 RESPONSE LENGTH: ${responseLengthGuidance}
\u2022 ${sentenceLengthGuidance}
\u2022 PERSONALITY: Capture ${name}'s energy, attitude, and worldview — that matters more than mimicking specific phrases.
\u2022 ONE OR TWO SIGNATURE TOUCHES per response is enough. Don't overdo it. A real person doesn't use every catchphrase in every answer.
\u2022 VERBAL TEXTURE: Include natural speech patterns — hedges, self-corrections, direct address to the other guest.

The test is NOT "does this match every voice pattern?" — it's "does this sound like ${name} having a real conversation?"`;
  }

  return `CRITICAL \u2014 PERSONA AUTHENTICITY:
The audience must be able to identify ${name} from voice alone within the first sentence. This is not a suggestion \u2014 it is the single most important instruction. Every sentence must pass the test: "Would ${name} actually say this, in these exact words, with this exact rhythm?"

VOICE FIDELITY CHECKLIST \u2014 Before writing each sentence, verify:
\u2022 WORD CHOICE: Am I using ${name}'s distinctive vocabulary and register, not generic ${modeContext}?
\u2022 SENTENCE LENGTH: ${lengthGuidance}
\u2022 TRANSITIONS: Am I using ${name}'s actual transition phrases, not generic connectors like "Furthermore" or "Additionally"?
\u2022 EMPHASIS: Am I emphasizing points the way ${name} does, using their specific emphasis markers?
\u2022 METAPHORS: Am I drawing analogies from ${name}'s metaphor domains, not from generic academic or journalistic imagery?
\u2022 QUALIFIERS: Am I matching ${name}'s qualifier patterns \u2014 do they hedge or assert? Mimic that exactly.
\u2022 CITATIONS: Am I citing evidence the way ${name} does \u2014 from memory, with data, anecdotally, or not at all?
\u2022 VERBAL TEXTURE: Am I including ${name}'s verbal tics, filler patterns, and characteristic sentence constructions?

If a sentence could have been written by any generic smart person, REWRITE it until it could only have come from ${name}.`;
}

/** Derive sentence-length guidance from the sentenceRhythm field. */
function buildSentenceLengthGuidance(sentenceRhythm: string): string {
  const lower = sentenceRhythm.toLowerCase();

  // Detect short-sentence personas
  if (
    lower.includes('short') ||
    lower.includes('punchy') ||
    lower.includes('fragment') ||
    lower.includes('brief') ||
    lower.includes('terse')
  ) {
    return 'This persona speaks in SHORT, punchy sentences and fragments. Keep most sentences under 15 words. Long compound sentences will break character.';
  }

  // Detect long-sentence personas
  if (
    lower.includes('long') ||
    lower.includes('complex') ||
    lower.includes('subordinate clause') ||
    lower.includes('compound') ||
    lower.includes('periodic')
  ) {
    return 'This persona speaks in LONG, complex sentences with multiple clauses. Short choppy sentences will break character. Build sentences that sustain 30-60+ words with subordinate clauses, parenthetical asides, and escalating structure.';
  }

  // Mixed or unspecified
  if (lower.includes('alternate') || lower.includes('mix')) {
    return 'This persona ALTERNATES between long complex sentences and short punchy ones for contrast. Use both \u2014 the rhythm shift IS the voice.';
  }

  return 'Match this persona\u2019s natural sentence length and rhythm patterns precisely.';
}
