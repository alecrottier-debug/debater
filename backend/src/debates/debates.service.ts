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

/** Helper to deep-clone an object into a Prisma-compatible JSON value. */
function toJson(value: unknown): any {
  return JSON.parse(JSON.stringify(value));
}

export interface CreateDebateDto {
  motion: string;
  mode: string;
  personaAId: string;
  personaBId: string;
}

@Injectable()
export class DebatesService {
  private readonly logger = new Logger(DebatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stagePlan: StagePlanService,
    private readonly validator: ValidatorService,
    @Inject(LLM_ADAPTER) private readonly llm: LlmAdapter,
  ) {}

  async create(dto: CreateDebateDto) {
    // Validate mode exists
    this.stagePlan.getPlan(dto.mode);

    // Validate personas exist
    const [personaA, personaB] = await Promise.all([
      this.prisma.persona.findUnique({ where: { id: dto.personaAId } }),
      this.prisma.persona.findUnique({ where: { id: dto.personaBId } }),
    ]);

    if (!personaA) throw new NotFoundException(`Persona A not found: ${dto.personaAId}`);
    if (!personaB) throw new NotFoundException(`Persona B not found: ${dto.personaBId}`);

    return this.prisma.debate.create({
      data: {
        motion: dto.motion,
        mode: dto.mode,
        personaAId: dto.personaAId,
        personaBId: dto.personaBId,
        stageIndex: 0,
        status: 'pending',
      },
      include: {
        personaA: true,
        personaB: true,
      },
    });
  }

  async findOne(id: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id },
      include: {
        personaA: true,
        personaB: true,
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
    });
  }

  async exportMarkdown(debateId: string): Promise<string> {
    const debate = await this.findOne(debateId);
    const lines: string[] = [];

    // Header
    lines.push(`# Debate: ${debate.motion}`);
    lines.push('');
    lines.push(`**Mode:** ${debate.mode}`);
    lines.push(`**Side A:** ${debate.personaA.name}`);
    lines.push(`**Side B:** ${debate.personaB.name}`);
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

    // Judge Decision
    if (debate.judgeDecision) {
      const decision = debate.judgeDecision;
      const scores = decision.scores as Record<string, Record<string, number>>;
      const ballot = decision.ballot as Array<{ reason: string; refs: string[] }>;
      const bestLines = decision.bestLines as Record<string, string>;

      lines.push('---');
      lines.push('');
      lines.push('## Judge Decision');
      lines.push('');
      lines.push(`**Winner:** ${decision.winner}`);
      lines.push('');

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

    const stage = this.stagePlan.getStageByIndex(debate.mode, debate.stageIndex);
    const personaAJson = debate.personaA.personaJson as Record<string, unknown>;
    const personaBJson = debate.personaB.personaJson as Record<string, unknown>;

    const existingTurns = debate.turns;

    if (stage.speaker === 'MOD') {
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

    // Advance stage index and update status
    const nextIndex = debate.stageIndex + 1;
    const isCompleted = stage.speaker === 'JUDGE';

    await this.prisma.debate.update({
      where: { id: debateId },
      data: {
        stageIndex: nextIndex,
        status: isCompleted ? 'completed' : 'in_progress',
      },
    });

    return this.findOne(debateId);
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

    // Collect prior leads for this speaker (for closing validation)
    const priorLeads = existingTurns
      .filter((t) => t.speaker === speaker)
      .map((t) => {
        const payload = t.payload as Record<string, unknown> | null;
        return (payload?.lead as string) ?? '';
      })
      .filter((l) => l.length > 0);

    // Use async validation for closing stages (LLM classifier), sync for others
    const validation = this.validator.isClosingStage(stage.id)
      ? await this.validator.validateDebaterTurnAsync(output, stage, priorLeads)
      : this.validator.validateDebaterTurn(output, stage, priorLeads);

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

    // Persist JudgeDecision
    await this.prisma.judgeDecision.create({
      data: {
        debateId: debate.id,
        winner: output.winner,
        scores: toJson(output.scores),
        ballot: toJson(output.ballot),
        bestLines: toJson(output.bestLines),
      },
    });

    return turn;
  }

  private renderModeratorText(output: ModeratorOutput): string {
    const parts: string[] = [];
    if (output.definitions.length > 0) {
      parts.push('Definitions: ' + output.definitions.join('; '));
    }
    if (output.burdens.length > 0) {
      parts.push('Burdens: ' + output.burdens.join('; '));
    }
    if (output.judging_criteria.length > 0) {
      parts.push('Judging Criteria: ' + output.judging_criteria.join('; '));
    }
    if (output.house_rules.length > 0) {
      parts.push('House Rules: ' + output.house_rules.join('; '));
    }
    return parts.join('\n');
  }

  private renderJudgeText(output: JudgeOutput): string {
    const parts: string[] = [];
    parts.push(`Winner: ${output.winner}`);
    parts.push(
      `Scores - A: clarity=${output.scores.A.clarity} strength=${output.scores.A.strength} responsiveness=${output.scores.A.responsiveness} weighing=${output.scores.A.weighing}`,
    );
    parts.push(
      `Scores - B: clarity=${output.scores.B.clarity} strength=${output.scores.B.strength} responsiveness=${output.scores.B.responsiveness} weighing=${output.scores.B.weighing}`,
    );
    for (const entry of output.ballot) {
      parts.push(`Ballot: ${entry.reason} [refs: ${entry.refs.join(', ')}]`);
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
