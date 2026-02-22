import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StagePlanService } from '../stages/stage-plan.service.js';
import { ValidatorService } from '../validators/validator.service.js';
import { LLM_ADAPTER } from '../llm/llm-adapter.interface.js';
import type { LlmAdapter, LlmPrompt } from '../llm/llm-adapter.interface.js';
import type { StageConfig } from '../stages/stage-plan.types.js';
import type { DebaterOutput, ModeratorOutput, JudgeOutput } from '../llm/llm-schemas.js';
import {
  buildModeratorPrompt,
  MODERATOR_PROMPT_VERSION,
} from '../prompts/moderator_v1.js';
import {
  buildDebaterPrompt,
  DEBATER_PROMPT_VERSION,
} from '../prompts/debater_v1.js';
import type { TranscriptEntry } from '../prompts/debater_v1.js';
import {
  buildJudgePrompt,
  JUDGE_PROMPT_VERSION,
} from '../prompts/judge_v1.js';
import type { JudgeTranscriptEntry } from '../prompts/judge_v1.js';
import {
  buildCrossExPrompt,
  CROSSEX_PROMPT_VERSION,
} from '../prompts/crossex_v1.js';
import {
  buildDiscussionModeratorPrompt,
  DISCUSSION_MODERATOR_PROMPT_VERSION,
} from '../prompts/discussion_moderator_v1.js';
import {
  buildDiscussionParticipantPrompt,
  DISCUSSION_PARTICIPANT_PROMPT_VERSION,
} from '../prompts/discussion_participant_v1.js';
import type { DiscussionWrapOutput } from '../llm/llm-schemas.js';

/** Helper to deep-clone an object into a Prisma-compatible JSON value. */
function toJson(value: unknown): any {
  return JSON.parse(JSON.stringify(value));
}

export interface CreateDebateDto {
  motion: string;
  mode: string;
  personaAId: string;
  personaBId: string;
  moderatorPersonaId?: string;
  confrontationLevel?: number;
}

/** Maximum age of a prefetch cache entry before it is evicted (10 minutes). */
const PREFETCH_TTL_MS = 10 * 60 * 1000;
/** Maximum number of entries in the prefetch cache to prevent memory leaks. */
const PREFETCH_MAX_ENTRIES = 50;

interface PrefetchEntry {
  promise: Promise<void>;
  createdAt: number;
}

@Injectable()
export class DebatesService {
  private readonly logger = new Logger(DebatesService.name);

  /**
   * In-memory cache for pre-fetched stage generation promises.
   * Key format: `${debateId}:${stageIndex}`
   * The promise resolves when the turn has been persisted to the DB.
   */
  private readonly prefetchCache = new Map<string, PrefetchEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly stagePlan: StagePlanService,
    private readonly validator: ValidatorService,
    @Inject(LLM_ADAPTER) private readonly llm: LlmAdapter,
  ) {}

  async create(dto: CreateDebateDto) {
    // Validate mode exists
    this.stagePlan.getPlan(dto.mode);
    const isDiscussion = this.stagePlan.isDiscussion(dto.mode);

    // Validate personas exist
    const [personaA, personaB] = await Promise.all([
      this.prisma.persona.findUnique({ where: { id: dto.personaAId } }),
      this.prisma.persona.findUnique({ where: { id: dto.personaBId } }),
    ]);

    if (!personaA) throw new NotFoundException(`Persona A not found: ${dto.personaAId}`);
    if (!personaB) throw new NotFoundException(`Persona B not found: ${dto.personaBId}`);

    // Validate moderator persona if provided
    if (dto.moderatorPersonaId) {
      const modPersona = await this.prisma.persona.findUnique({ where: { id: dto.moderatorPersonaId } });
      if (!modPersona) throw new NotFoundException(`Moderator persona not found: ${dto.moderatorPersonaId}`);
    }

    let personaAId: string;
    let personaBId: string;

    if (isDiscussion) {
      // No FOR/AGAINST alignment for discussions — keep original order
      personaAId = dto.personaAId;
      personaBId = dto.personaBId;
    } else {
      // Align sides for debates
      const { forId, againstId } = await this.alignSides(dto.motion, personaA, personaB);
      personaAId = forId;
      personaBId = againstId;
    }

    return this.prisma.debate.create({
      data: {
        motion: dto.motion,
        mode: dto.mode,
        personaAId,
        personaBId,
        moderatorPersonaId: dto.moderatorPersonaId ?? null,
        confrontationLevel: dto.confrontationLevel ?? 3,
        stageIndex: 0,
        status: 'pending',
      },
      include: {
        personaA: true,
        personaB: true,
        moderatorPersona: true,
      },
    });
  }

  /**
   * Use a quick LLM call to determine which persona should argue FOR (Side A)
   * and which should argue AGAINST (Side B) based on their known stances,
   * priorities, and background.
   */
  private async alignSides(
    motion: string,
    personaA: { id: string; name: string; personaJson: unknown },
    personaB: { id: string; name: string; personaJson: unknown },
  ): Promise<{ forId: string; againstId: string }> {
    const extractStances = (json: unknown): string => {
      const raw = json as Record<string, unknown>;
      const identity = raw.identity as Record<string, unknown> | undefined;
      const positions = raw.positions as Record<string, unknown> | undefined;
      const bio = identity?.biography as Record<string, unknown> | undefined;
      const parts: string[] = [];
      if (bio?.summary) parts.push(`Background: ${bio.summary}`);
      if (positions?.priorities) parts.push(`Priorities: ${(positions.priorities as string[]).join('; ')}`);
      if (positions?.knownStances) {
        const stances = positions.knownStances as Record<string, string>;
        parts.push(`Known stances: ${Object.entries(stances).map(([k, v]) => `${k}: ${v}`).join('; ')}`);
      }
      return parts.join('\n');
    };

    const prompt: LlmPrompt = {
      system: `You are assigning debate sides. Given a motion and two debaters' backgrounds and stances, decide which debater should argue FOR the motion and which should argue AGAINST, based on who more naturally aligns with each side. Reply with ONLY a JSON object: {"for": "A" or "B", "reason": "one sentence"}`,
      user: `Motion: "${motion}"

Debater A — ${personaA.name}:
${extractStances(personaA.personaJson)}

Debater B — ${personaB.name}:
${extractStances(personaB.personaJson)}

Which debater should argue FOR and which AGAINST?`,
    };

    try {
      const raw = await this.llm.generateText(prompt);
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      const result = JSON.parse(cleaned) as { for: string; reason: string };
      const forIsA = result.for === 'A';
      this.logger.log(
        `[Side alignment] ${forIsA ? personaA.name : personaB.name} argues FOR, ` +
        `${forIsA ? personaB.name : personaA.name} argues AGAINST. Reason: ${result.reason}`,
      );
      return {
        forId: forIsA ? personaA.id : personaB.id,
        againstId: forIsA ? personaB.id : personaA.id,
      };
    } catch (err) {
      this.logger.warn(`[Side alignment] Failed, keeping original order: ${(err as Error).message}`);
      return { forId: personaA.id, againstId: personaB.id };
    }
  }

  async findAll() {
    return this.prisma.debate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        personaA: true,
        personaB: true,
        moderatorPersona: true,
        judgeDecision: true,
      },
    });
  }

  async findOne(id: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id },
      include: {
        personaA: true,
        personaB: true,
        moderatorPersona: true,
        turns: { orderBy: { createdAt: 'asc' } },
        judgeDecision: true,
      },
    });

    if (!debate) throw new NotFoundException(`Debate not found: ${id}`);
    return debate;
  }

  async rematch(debateId: string) {
    const debate = await this.findOne(debateId);

    // Create new debate with swapped personas, same motion and mode
    return this.create({
      motion: debate.motion,
      mode: debate.mode,
      personaAId: debate.personaBId,
      personaBId: debate.personaAId,
      moderatorPersonaId: debate.moderatorPersonaId ?? undefined,
      confrontationLevel: debate.confrontationLevel,
    });
  }

  async exportMarkdown(debateId: string): Promise<string> {
    const debate = await this.findOne(debateId);
    const isDiscussion = this.stagePlan.isDiscussion(debate.mode);
    const lines: string[] = [];

    // Header
    lines.push(`# ${isDiscussion ? 'Discussion' : 'Debate'}: ${debate.motion}`);
    lines.push('');
    lines.push(`**Mode:** ${debate.mode}`);
    lines.push(`**${isDiscussion ? 'Guest A' : 'Side A'}:** ${debate.personaA.name}`);
    lines.push(`**${isDiscussion ? 'Guest B' : 'Side B'}:** ${debate.personaB.name}`);
    if ((debate as any).moderatorPersona) {
      lines.push(`**Moderator:** ${(debate as any).moderatorPersona.name}`);
      lines.push(`**Confrontation Level:** ${(debate as any).confrontationLevel}/5`);
    }
    lines.push(`**Status:** ${debate.status}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Transcript by stage
    lines.push('## Transcript');
    lines.push('');

    for (const turn of debate.turns) {
      const speakerLabel = this.getSpeakerLabel(turn.speaker, debate.personaA.name, debate.personaB.name);
      lines.push(`### ${turn.stageId} - ${speakerLabel}`);
      lines.push('');
      lines.push(turn.renderedText);
      lines.push('');

      if (turn.violations.length > 0) {
        lines.push(`> **Violations:** ${turn.violations.join(', ')}`);
        lines.push('');
      }
    }

    // Discussion wrap summary
    if (isDiscussion && debate.status === 'completed') {
      const wrapTurn = debate.turns.find((t) => t.stageId === 'MOD_WRAP');
      if (wrapTurn) {
        const wrapPayload = wrapTurn.payload as Record<string, unknown>;
        lines.push('---');
        lines.push('');
        lines.push('## Discussion Summary');
        lines.push('');
        if (wrapPayload.keyTakeaways) {
          lines.push('### Key Takeaways');
          for (const t of wrapPayload.keyTakeaways as string[]) {
            lines.push(`- ${t}`);
          }
          lines.push('');
        }
        if (wrapPayload.areasOfAgreement) {
          lines.push('### Areas of Agreement');
          for (const a of wrapPayload.areasOfAgreement as string[]) {
            lines.push(`- ${a}`);
          }
          lines.push('');
        }
        if (wrapPayload.areasOfDisagreement) {
          lines.push('### Areas of Disagreement');
          for (const d of wrapPayload.areasOfDisagreement as string[]) {
            lines.push(`- ${d}`);
          }
          lines.push('');
        }
        if (wrapPayload.openQuestions) {
          lines.push('### Open Questions');
          for (const q of wrapPayload.openQuestions as string[]) {
            lines.push(`- ${q}`);
          }
          lines.push('');
        }
      }
    }

    // Judge Decision
    if (!isDiscussion && debate.judgeDecision) {
      const decision = debate.judgeDecision;
      const scores = decision.scores as Record<string, Record<string, number>>;
      const ballot = decision.ballot as Array<{ reason: string; refs: string[] }>;
      const bestLines = decision.bestLines as Record<string, string>;
      const verdict = (decision as any).verdict as string | undefined;
      const closeness = (decision as any).closeness as string | undefined;
      const momentum = (decision as any).momentum as { trajectory: string; description: string } | undefined;
      const analysis = (decision as any).analysis as Record<string, { strengths: string[]; weaknesses: string[]; keyMoment: string; keyMomentRef: string }> | undefined;
      const detailedScores = (decision as any).detailedScores as Record<string, Record<string, number>> | undefined;

      lines.push('---');
      lines.push('');
      lines.push('## Judge Decision');
      lines.push('');
      lines.push(`**Winner:** ${decision.winner}${closeness ? ` (${closeness})` : ''}`);
      lines.push('');

      // Verdict
      if (verdict) {
        lines.push('### Verdict');
        lines.push('');
        lines.push(verdict);
        lines.push('');
      }

      // Scores
      lines.push('### Scores');
      lines.push('');
      lines.push('| Category | Side A | Side B |');
      lines.push('|----------|--------|--------|');
      for (const category of ['clarity', 'strength', 'responsiveness', 'weighing']) {
        const aScore = scores?.A?.[category] ?? '-';
        const bScore = scores?.B?.[category] ?? '-';
        lines.push(`| ${category.charAt(0).toUpperCase() + category.slice(1)} | ${aScore} | ${bScore} |`);
      }
      lines.push('');

      // Detailed Scores
      if (detailedScores) {
        lines.push('### Detailed Scores');
        lines.push('');
        lines.push('| Dimension | Side A | Side B |');
        lines.push('|-----------|--------|--------|');
        const detailedLabels: Record<string, string> = {
          logicalRigor: 'Logical Rigor',
          evidenceQuality: 'Evidence Quality',
          rebuttalEffectiveness: 'Rebuttal Effectiveness',
          argumentNovelty: 'Argument Novelty',
          persuasiveness: 'Persuasiveness',
          voiceAuthenticity: 'Voice Authenticity',
          rhetoricalSkill: 'Rhetorical Skill',
          emotionalResonance: 'Emotional Resonance',
          framingControl: 'Framing Control',
          adaptability: 'Adaptability',
        };
        for (const [key, label] of Object.entries(detailedLabels)) {
          const aScore = detailedScores?.A?.[key] ?? '-';
          const bScore = detailedScores?.B?.[key] ?? '-';
          lines.push(`| ${label} | ${aScore} | ${bScore} |`);
        }
        lines.push('');
      }

      // Momentum
      if (momentum) {
        lines.push('### Momentum');
        lines.push('');
        lines.push(`**${momentum.trajectory}:** ${momentum.description}`);
        lines.push('');
      }

      // Analysis
      if (analysis) {
        for (const side of ['A', 'B'] as const) {
          const sideAnalysis = analysis[side];
          if (sideAnalysis) {
            lines.push(`### Side ${side} Analysis`);
            lines.push('');
            if (sideAnalysis.strengths?.length > 0) {
              lines.push('**Strengths:**');
              for (const s of sideAnalysis.strengths) lines.push(`- ${s}`);
              lines.push('');
            }
            if (sideAnalysis.weaknesses?.length > 0) {
              lines.push('**Weaknesses:**');
              for (const w of sideAnalysis.weaknesses) lines.push(`- ${w}`);
              lines.push('');
            }
            if (sideAnalysis.keyMoment) {
              lines.push(`**Key Moment** (${sideAnalysis.keyMomentRef}): ${sideAnalysis.keyMoment}`);
              lines.push('');
            }
          }
        }
      }

      // Ballot
      if (ballot && ballot.length > 0) {
        lines.push('### Ballot');
        lines.push('');
        for (const entry of ballot) {
          const refs = entry.refs?.length > 0 ? ` *(${entry.refs.join(', ')})*` : '';
          lines.push(`- ${entry.reason}${refs}`);
        }
        lines.push('');
      }

      // Best Lines
      if (bestLines) {
        lines.push('### Best Lines');
        lines.push('');
        if (bestLines.A) {
          lines.push(`**Side A:** "${bestLines.A}"`);
          lines.push('');
        }
        if (bestLines.B) {
          lines.push(`**Side B:** "${bestLines.B}"`);
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }

  private getSpeakerLabel(speaker: string, nameA: string, nameB: string): string {
    switch (speaker) {
      case 'A':
        return `Side A (${nameA})`;
      case 'B':
        return `Side B (${nameB})`;
      case 'MOD':
        return 'Moderator';
      case 'JUDGE':
        return 'Judge';
      default:
        return speaker;
    }
  }

  async advanceStage(debateId: string) {
    const debate = await this.findOne(debateId);

    if (debate.status === 'completed') {
      throw new ConflictException('Debate is already completed');
    }

    if (debate.status === 'error') {
      throw new ConflictException('Debate is in error state');
    }

    const stageCount = this.stagePlan.getStageCount(debate.mode);
    if (debate.stageIndex >= stageCount) {
      throw new ConflictException('All stages have been completed');
    }

    // Check prefetch cache for a pre-generated result
    const cacheKey = `${debateId}:${debate.stageIndex}`;
    const cached = this.prefetchCache.get(cacheKey);

    if (cached) {
      this.prefetchCache.delete(cacheKey);
      const age = Date.now() - cached.createdAt;

      if (age < PREFETCH_TTL_MS) {
        this.logger.log(
          `[Prefetch] Cache HIT for ${cacheKey} (age=${Math.round(age / 1000)}s) — using pre-generated turn`,
        );
        try {
          // Await the promise — the turn is already persisted to DB when it resolves
          await cached.promise;
        } catch (err) {
          // Prefetch failed — fall through to normal generation
          this.logger.warn(
            `[Prefetch] Cached promise for ${cacheKey} rejected, falling back to normal generation: ${(err as Error).message}`,
          );
          await this.generateStage(debate);
        }
      } else {
        this.logger.log(`[Prefetch] Cache entry for ${cacheKey} expired (age=${Math.round(age / 1000)}s), generating normally`);
        await this.generateStage(debate);
      }
    } else {
      await this.generateStage(debate);
    }

    // Advance stage index and update status
    const nextIndex = debate.stageIndex + 1;
    const isCompleted = nextIndex >= this.stagePlan.getStageCount(debate.mode);

    await this.prisma.debate.update({
      where: { id: debateId },
      data: {
        stageIndex: nextIndex,
        status: isCompleted ? 'completed' : 'in_progress',
      },
    });

    // Fire-and-forget: prefetch the next stage if one exists
    if (!isCompleted) {
      this.triggerPrefetch(debateId, nextIndex);
    } else {
      // Debate completed — clear any lingering cache entries for this debate
      this.clearDebateCache(debateId);
    }

    return this.findOne(debateId);
  }

  /**
   * Execute the stage generation logic for the current stage of a debate.
   * Extracted from advanceStage to allow reuse in both normal and prefetch paths.
   */
  private async generateStage(
    debate: Awaited<ReturnType<DebatesService['findOne']>>,
  ) {
    const stage = this.stagePlan.getStageByIndex(debate.mode, debate.stageIndex);
    const personaAJson = debate.personaA.personaJson as Record<string, unknown>;
    const personaBJson = debate.personaB.personaJson as Record<string, unknown>;
    const isDiscussion = this.stagePlan.isDiscussion(debate.mode);

    const existingTurns = debate.turns;

    if (isDiscussion) {
      // Discussion mode routing
      const moderatorPersonaJson = (debate as any).moderatorPersona?.personaJson as Record<string, unknown> | undefined;
      const confrontationLevel = (debate as any).confrontationLevel ?? 3;

      if (stage.id === 'MOD_WRAP') {
        await this.handleDiscussionWrapStage(
          debate, stage, personaAJson, personaBJson,
          moderatorPersonaJson ?? {}, confrontationLevel, existingTurns,
        );
      } else if (stage.speaker === 'MOD') {
        await this.handleDiscussionModeratorStage(
          debate, stage, personaAJson, personaBJson,
          moderatorPersonaJson ?? {}, confrontationLevel, existingTurns,
        );
      } else {
        await this.handleDiscussionParticipantStage(
          debate, stage, personaAJson, personaBJson, existingTurns,
        );
      }
    } else if (stage.speaker === 'MOD') {
      await this.handleModeratorStage(
        debate,
        stage,
        personaAJson,
        personaBJson,
      );
    } else if (stage.speaker === 'JUDGE') {
      await this.handleJudgeStage(
        debate,
        stage,
        personaAJson,
        personaBJson,
        existingTurns,
      );
    } else if (stage.id.includes('CROSSEX')) {
      await this.handleCrossExStage(
        debate,
        stage,
        personaAJson,
        personaBJson,
        existingTurns,
      );
    } else {
      await this.handleDebaterStage(
        debate,
        stage,
        personaAJson,
        personaBJson,
        existingTurns,
      );
    }
  }

  /**
   * Fire-and-forget prefetch of the next stage's LLM generation.
   * Re-fetches the debate from DB to get the latest transcript, then
   * runs the appropriate handler to generate and persist the turn.
   */
  private triggerPrefetch(debateId: string, stageIndex: number): void {
    const cacheKey = `${debateId}:${stageIndex}`;

    // Don't prefetch if there's already an entry for this key
    if (this.prefetchCache.has(cacheKey)) {
      return;
    }

    // Evict stale entries before adding a new one
    this.evictStaleEntries();

    this.logger.log(`[Prefetch] Starting background generation for ${cacheKey}`);

    const promise = (async () => {
      // Re-fetch debate with all turns (including the just-saved one)
      const debate = await this.findOne(debateId);

      // Sanity check: make sure the debate is at the expected stage
      if (debate.stageIndex !== stageIndex) {
        this.logger.warn(
          `[Prefetch] Stage mismatch for ${cacheKey}: expected stageIndex=${stageIndex}, got ${debate.stageIndex}. Skipping.`,
        );
        return;
      }

      if (debate.status === 'completed' || debate.status === 'error') {
        this.logger.warn(`[Prefetch] Debate ${debateId} is ${debate.status}, skipping prefetch.`);
        return;
      }

      await this.generateStage(debate);
      this.logger.log(`[Prefetch] Completed background generation for ${cacheKey}`);
    })().catch((err) => {
      this.logger.warn(
        `[Prefetch] Background generation failed for ${cacheKey}: ${(err as Error).message}`,
      );
      // Remove failed entry from cache so normal generation can proceed
      this.prefetchCache.delete(cacheKey);
      // Re-throw so the cached promise rejects and the awaiter in advanceStage falls back
      throw err;
    });

    this.prefetchCache.set(cacheKey, {
      promise,
      createdAt: Date.now(),
    });
  }

  /**
   * Remove all prefetch cache entries for a given debate.
   */
  private clearDebateCache(debateId: string): void {
    const prefix = `${debateId}:`;
    for (const key of this.prefetchCache.keys()) {
      if (key.startsWith(prefix)) {
        this.prefetchCache.delete(key);
      }
    }
  }

  /**
   * Evict stale entries (older than TTL) and enforce max cache size.
   */
  private evictStaleEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.prefetchCache.entries()) {
      if (now - entry.createdAt > PREFETCH_TTL_MS) {
        this.prefetchCache.delete(key);
        this.logger.debug(`[Prefetch] Evicted stale entry: ${key}`);
      }
    }

    // If still over max, evict oldest entries
    if (this.prefetchCache.size >= PREFETCH_MAX_ENTRIES) {
      const entries = [...this.prefetchCache.entries()]
        .sort((a, b) => a[1].createdAt - b[1].createdAt);
      const toEvict = entries.slice(0, entries.length - PREFETCH_MAX_ENTRIES + 1);
      for (const [key] of toEvict) {
        this.prefetchCache.delete(key);
        this.logger.debug(`[Prefetch] Evicted entry (max size): ${key}`);
      }
    }
  }

  /**
   * Set debate to error state (used when judge output fails repeatedly).
   */
  async setError(debateId: string, message: string) {
    await this.prisma.debate.update({
      where: { id: debateId },
      data: { status: 'error' },
    });
    this.logger.error(`Debate ${debateId} set to error: ${message}`);
  }

  private async handleModeratorStage(
    debate: { id: string; motion: string },
    stage: StageConfig,
    personaAJson: Record<string, unknown>,
    personaBJson: Record<string, unknown>,
  ) {
    const prompt = buildModeratorPrompt({
      motion: debate.motion,
      stage,
      personaA: personaAJson,
      personaB: personaBJson,
    });

    const output: ModeratorOutput = await this.llm.generateModeratorTurn(prompt);

    const renderedText = this.renderModeratorText(output);
    const wordCount = this.countWords(renderedText);

    return this.prisma.turn.create({
      data: {
        debateId: debate.id,
        stageId: stage.id,
        speaker: 'MOD',
        payload: toJson({ ...output, promptVersion: MODERATOR_PROMPT_VERSION }),
        renderedText,
        wordCount,
        violations: [],
      },
    });
  }

  private async handleDebaterStage(
    debate: { id: string; motion: string },
    stage: StageConfig,
    personaAJson: Record<string, unknown>,
    personaBJson: Record<string, unknown>,
    existingTurns: Array<{
      stageId: string;
      speaker: string;
      renderedText: string;
      payload: unknown;
      violations: string[];
    }>,
  ) {
    const speaker = stage.speaker as 'A' | 'B';
    const persona = speaker === 'A' ? personaAJson : personaBJson;
    const opponentPersona = speaker === 'A' ? personaBJson : personaAJson;

    const transcript: TranscriptEntry[] = existingTurns.map((t) => ({
      stageId: t.stageId,
      speaker: t.speaker,
      renderedText: t.renderedText,
    }));

    const prompt = buildDebaterPrompt({
      motion: debate.motion,
      stage,
      speaker,
      persona,
      opponentPersona,
      transcript,
    });

    const output: DebaterOutput = await this.llm.generateDebaterTurn(prompt, speaker);

    const renderedText = this.validator.renderDebaterText(output);
    const wordCount = this.countWords(renderedText);

    // Collect prior narratives for this speaker (for closing validation)
    const priorNarratives = existingTurns
      .filter((t) => t.speaker === speaker)
      .map((t) => {
        const payload = t.payload as Record<string, unknown> | null;
        return (payload?.narrative as string) ?? (payload?.lead as string) ?? '';
      })
      .filter((l) => l.length > 0);

    // Use async validation for closing stages (LLM classifier), sync for others
    const validation = this.validator.isClosingStage(stage.id)
      ? await this.validator.validateDebaterTurnAsync(output, stage, priorNarratives)
      : this.validator.validateDebaterTurn(output, stage, priorNarratives);

    // Rebuttal callback validation (requires at least 2 callbacks referencing opponent stage IDs)
    if (stage.id.includes('REBUTTAL')) {
      const rebuttalValidation = this.validator.validateRebuttalCallbacks(output, stage, 2);
      validation.violations.push(...rebuttalValidation.violations);
      validation.details.push(...rebuttalValidation.details);
    }

    return this.prisma.turn.create({
      data: {
        debateId: debate.id,
        stageId: stage.id,
        speaker,
        payload: toJson({ ...output, promptVersion: DEBATER_PROMPT_VERSION }),
        renderedText,
        wordCount,
        violations: validation.violations,
      },
    });
  }

  private async handleCrossExStage(
    debate: { id: string; motion: string },
    stage: StageConfig,
    personaAJson: Record<string, unknown>,
    personaBJson: Record<string, unknown>,
    existingTurns: Array<{
      stageId: string;
      speaker: string;
      renderedText: string;
    }>,
  ) {
    const speaker = stage.speaker as 'A' | 'B';
    const persona = speaker === 'A' ? personaAJson : personaBJson;
    const opponentPersona = speaker === 'A' ? personaBJson : personaAJson;

    const transcript: TranscriptEntry[] = existingTurns.map((t) => ({
      stageId: t.stageId,
      speaker: t.speaker,
      renderedText: t.renderedText,
    }));

    const prompt = buildCrossExPrompt({
      motion: debate.motion,
      stage,
      speaker,
      persona,
      opponentPersona,
      transcript,
    });

    const output = await this.llm.generateCrossExTurn(prompt, speaker);

    const renderedText = output.questions
      .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
      .join('\n\n');
    const wordCount = this.countWords(renderedText);

    const validation = this.validator.validateCrossExTurn(output, stage);

    return this.prisma.turn.create({
      data: {
        debateId: debate.id,
        stageId: stage.id,
        speaker,
        payload: toJson({ ...output, promptVersion: CROSSEX_PROMPT_VERSION }),
        renderedText,
        wordCount,
        violations: validation.violations,
      },
    });
  }

  private async handleJudgeStage(
    debate: { id: string; motion: string },
    stage: StageConfig,
    personaAJson: Record<string, unknown>,
    personaBJson: Record<string, unknown>,
    existingTurns: Array<{
      stageId: string;
      speaker: string;
      renderedText: string;
      violations: string[];
    }>,
  ) {
    const transcript: JudgeTranscriptEntry[] = existingTurns.map((t) => ({
      stageId: t.stageId,
      speaker: t.speaker,
      renderedText: t.renderedText,
      violations: t.violations,
    }));

    const prompt: LlmPrompt = buildJudgePrompt({
      motion: debate.motion,
      stage,
      personaA: personaAJson,
      personaB: personaBJson,
      transcript,
    });

    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROMPTS === 'true') {
      this.logger.debug(`[JUDGE PROMPT] System:\n${prompt.system}`);
      this.logger.debug(`[JUDGE PROMPT] User:\n${prompt.user}`);
    }

    let output: JudgeOutput;
    try {
      output = await this.llm.generateJudgeDecision(prompt);
    } catch (err) {
      await this.setError(debate.id, `Judge generation failed: ${(err as Error).message}`);
      throw err;
    }

    const renderedText = this.renderJudgeText(output);
    const wordCount = this.countWords(renderedText);

    // Persist Turn
    const turn = await this.prisma.turn.create({
      data: {
        debateId: debate.id,
        stageId: stage.id,
        speaker: 'JUDGE',
        payload: toJson({ ...output, promptVersion: JUDGE_PROMPT_VERSION }),
        renderedText,
        wordCount,
        violations: [],
      },
    });

    // Persist JudgeDecision (with extended fields from judge_v2)
    await this.prisma.judgeDecision.create({
      data: {
        debateId: debate.id,
        winner: output.winner,
        scores: toJson(output.scores),
        ballot: toJson(output.ballot),
        bestLines: toJson(output.bestLines),
        detailedScores: output.detailedScores ? toJson(output.detailedScores) : undefined,
        verdict: output.verdict ?? undefined,
        analysis: output.analysis ? toJson(output.analysis) : undefined,
        momentum: output.momentum ? toJson(output.momentum) : undefined,
        closeness: output.closeness ?? undefined,
      },
    });

    return turn;
  }

  private async handleDiscussionModeratorStage(
    debate: { id: string; motion: string },
    stage: StageConfig,
    personaAJson: Record<string, unknown>,
    personaBJson: Record<string, unknown>,
    moderatorPersonaJson: Record<string, unknown>,
    confrontationLevel: number,
    existingTurns: Array<{ stageId: string; speaker: string; renderedText: string }>,
  ) {
    const prompt = buildDiscussionModeratorPrompt({
      topic: debate.motion,
      stage,
      personaA: personaAJson,
      personaB: personaBJson,
      moderatorPersona: moderatorPersonaJson,
      confrontationLevel,
      transcript: existingTurns.map((t) => ({
        stageId: t.stageId,
        speaker: t.speaker,
        renderedText: t.renderedText,
      })),
    });

    const output = await this.llm.generateModeratorTurn(prompt);
    const renderedText = output.narrative;
    const wordCount = this.countWords(renderedText);

    return this.prisma.turn.create({
      data: {
        debateId: debate.id,
        stageId: stage.id,
        speaker: 'MOD',
        payload: toJson({ ...output, promptVersion: DISCUSSION_MODERATOR_PROMPT_VERSION }),
        renderedText,
        wordCount,
        violations: [],
      },
    });
  }

  private async handleDiscussionParticipantStage(
    debate: { id: string; motion: string },
    stage: StageConfig,
    personaAJson: Record<string, unknown>,
    personaBJson: Record<string, unknown>,
    existingTurns: Array<{
      stageId: string;
      speaker: string;
      renderedText: string;
      payload: unknown;
      violations: string[];
    }>,
  ) {
    const speaker = stage.speaker as 'A' | 'B';
    const persona = speaker === 'A' ? personaAJson : personaBJson;
    const otherPersona = speaker === 'A' ? personaBJson : personaAJson;

    const prompt = buildDiscussionParticipantPrompt({
      topic: debate.motion,
      stage,
      speaker,
      persona,
      otherPersona,
      transcript: existingTurns.map((t) => ({
        stageId: t.stageId,
        speaker: t.speaker,
        renderedText: t.renderedText,
      })),
    });

    const output = await this.llm.generateDebaterTurn(prompt, speaker);
    const renderedText = this.validator.renderDebaterText(output);
    const wordCount = this.countWords(renderedText);

    return this.prisma.turn.create({
      data: {
        debateId: debate.id,
        stageId: stage.id,
        speaker,
        payload: toJson({ ...output, promptVersion: DISCUSSION_PARTICIPANT_PROMPT_VERSION }),
        renderedText,
        wordCount,
        violations: [],
      },
    });
  }

  private async handleDiscussionWrapStage(
    debate: { id: string; motion: string },
    stage: StageConfig,
    personaAJson: Record<string, unknown>,
    personaBJson: Record<string, unknown>,
    moderatorPersonaJson: Record<string, unknown>,
    confrontationLevel: number,
    existingTurns: Array<{ stageId: string; speaker: string; renderedText: string }>,
  ) {
    const prompt = buildDiscussionModeratorPrompt({
      topic: debate.motion,
      stage,
      personaA: personaAJson,
      personaB: personaBJson,
      moderatorPersona: moderatorPersonaJson,
      confrontationLevel,
      transcript: existingTurns.map((t) => ({
        stageId: t.stageId,
        speaker: t.speaker,
        renderedText: t.renderedText,
      })),
    });

    const output: DiscussionWrapOutput = await this.llm.generateDiscussionWrap(prompt);
    const renderedText = output.narrative;
    const wordCount = this.countWords(renderedText);

    return this.prisma.turn.create({
      data: {
        debateId: debate.id,
        stageId: stage.id,
        speaker: 'MOD',
        payload: toJson({ ...output, promptVersion: DISCUSSION_MODERATOR_PROMPT_VERSION }),
        renderedText,
        wordCount,
        violations: [],
      },
    });
  }

  private renderModeratorText(output: ModeratorOutput): string {
    return output.narrative;
  }

  private renderJudgeText(output: JudgeOutput): string {
    const parts: string[] = [];
    parts.push(`Winner: ${output.winner} (${output.closeness})`);
    parts.push('');
    if (output.verdict) {
      parts.push(output.verdict);
      parts.push('');
    }
    parts.push(
      `Scores - A: clarity=${output.scores.A.clarity} strength=${output.scores.A.strength} responsiveness=${output.scores.A.responsiveness} weighing=${output.scores.A.weighing}`,
    );
    parts.push(
      `Scores - B: clarity=${output.scores.B.clarity} strength=${output.scores.B.strength} responsiveness=${output.scores.B.responsiveness} weighing=${output.scores.B.weighing}`,
    );
    parts.push('');
    for (const entry of output.ballot) {
      parts.push(`Ballot: ${entry.reason} [refs: ${entry.refs.join(', ')}]`);
    }
    if (output.momentum) {
      parts.push('');
      parts.push(`Momentum: ${output.momentum.trajectory} — ${output.momentum.description}`);
    }
    return parts.join('\n');
  }

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }
}
