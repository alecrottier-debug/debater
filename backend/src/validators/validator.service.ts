import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { StageConfig } from '../stages/stage-plan.types.js';
import { DebaterOutput, CrossExOutput } from '../llm/llm-schemas.js';
import { LLM_ADAPTER } from '../llm/llm-adapter.interface.js';
import type { LlmAdapter } from '../llm/llm-adapter.interface.js';

export type Violation =
  | 'WORD_LIMIT'
  | 'MISSING_FIELD'
  | 'NEW_ARGUMENT_CLOSING'
  | 'CROSSEX_QUESTION_COUNT'
  | 'CROSSEX_ANSWER_LENGTH'
  | 'MISSING_CALLBACKS';

export interface ValidationResult {
  violations: Violation[];
  details: string[];
}

@Injectable()
export class ValidatorService {
  private readonly logger = new Logger(ValidatorService.name);

  constructor(
    @Optional() @Inject(LLM_ADAPTER) private readonly llm?: LlmAdapter,
  ) {}

  /**
   * Validate a debater turn payload against stage constraints.
   */
  validateDebaterTurn(
    payload: DebaterOutput,
    stage: StageConfig,
    priorNarratives: string[],
  ): ValidationResult {
    const violations: Violation[] = [];
    const details: string[] = [];

    // Word count check
    const wordCount = this.countWords(this.renderDebaterText(payload));
    if (stage.maxWords !== null && wordCount > stage.maxWords) {
      violations.push('WORD_LIMIT');
      details.push(
        `Word count ${wordCount} exceeds limit of ${stage.maxWords}`,
      );
    }

    // Question required check
    if (stage.questionRequired && (!payload.question || payload.question.trim() === '')) {
      violations.push('MISSING_FIELD');
      details.push('Question is required for this stage but was empty or missing');
    }

    // Closing new-argument heuristic (synchronous fallback)
    if (this.isClosingStage(stage.id)) {
      const newArgViolation = this.checkClosingNewArguments(
        payload.narrative,
        priorNarratives,
      );
      if (newArgViolation) {
        violations.push('NEW_ARGUMENT_CLOSING');
        details.push(newArgViolation);
      }
    }

    if (violations.length > 0) {
      this.logger.warn(
        `Validation violations on stage ${stage.id}: ${violations.join(', ')}`,
      );
    }

    return { violations, details };
  }

  /**
   * Async validation for closing stages that uses the LLM-based classifier
   * when available, falling back to the heuristic.
   */
  async validateDebaterTurnAsync(
    payload: DebaterOutput,
    stage: StageConfig,
    priorNarratives: string[],
  ): Promise<ValidationResult> {
    // Start with synchronous validation (everything except closing check)
    const violations: Violation[] = [];
    const details: string[] = [];

    // Word count check
    const wordCount = this.countWords(this.renderDebaterText(payload));
    if (stage.maxWords !== null && wordCount > stage.maxWords) {
      violations.push('WORD_LIMIT');
      details.push(
        `Word count ${wordCount} exceeds limit of ${stage.maxWords}`,
      );
    }

    // Question required check
    if (stage.questionRequired && (!payload.question || payload.question.trim() === '')) {
      violations.push('MISSING_FIELD');
      details.push('Question is required for this stage but was empty or missing');
    }

    // Closing new-argument: use LLM classifier if available
    if (this.isClosingStage(stage.id)) {
      const llmResult = await this.classifyClosingNewArguments(
        payload.narrative,
        priorNarratives,
      );
      if (llmResult) {
        violations.push('NEW_ARGUMENT_CLOSING');
        details.push(llmResult);
      }
    }

    if (violations.length > 0) {
      this.logger.warn(
        `Validation violations on stage ${stage.id}: ${violations.join(', ')}`,
      );
    }

    return { violations, details };
  }

  /**
   * LLM-based closing new argument classifier.
   * Falls back to heuristic if LLM is not available or fails.
   */
  async classifyClosingNewArguments(
    closingNarrative: string,
    priorNarratives: string[],
  ): Promise<string | null> {
    if (!this.llm) {
      // Fallback to heuristic
      return this.checkClosingNewArguments(closingNarrative, priorNarratives);
    }

    try {
      const priorText = priorNarratives.map((l, i) => `[Prior ${i + 1}]: ${l}`).join('\n');

      const prompt = {
        system: `You are a debate rule classifier. Determine if a closing statement introduces genuinely NEW arguments that were not previously raised, or if it merely reframes, summarizes, or extends existing arguments.

Respond with EXACTLY one of:
- "PASS" if the closing only summarizes, reframes, or extends prior arguments
- "FAIL: <brief explanation>" if genuinely new substantive arguments are introduced

A closing may use new *words* or *phrasing* without introducing new arguments. Focus on whether new substantive claims, topics, or lines of reasoning are being introduced for the first time.`,
        user: `Prior arguments from this speaker:
${priorText}

Closing statement:
${closingNarrative}

Is this closing introducing genuinely new arguments?`,
      };

      const response = await this.llm.generateText(prompt);
      const trimmed = response.trim();

      if (trimmed.startsWith('FAIL')) {
        const explanation = trimmed.replace(/^FAIL:\s*/, '');
        return `LLM classifier: ${explanation}`;
      }

      return null; // PASS
    } catch (err) {
      this.logger.warn(
        `LLM closing classifier failed, falling back to heuristic: ${(err as Error).message}`,
      );
      return this.checkClosingNewArguments(closingNarrative, priorNarratives);
    }
  }

  /**
   * Render debater payload to plain text for word counting.
   */
  renderDebaterText(payload: DebaterOutput): string {
    const parts: string[] = [payload.narrative];
    if (payload.question) {
      parts.push(payload.question);
    }
    return parts.join(' ');
  }

  /**
   * Count words in a text string.
   */
  countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }

  /**
   * Determine if a stage ID represents a closing stage.
   */
  isClosingStage(stageId: string): boolean {
    return stageId.endsWith('_CLOSE');
  }

  /**
   * v1 heuristic (fallback): extract nouns (significant words) from prior narratives,
   * flag if closing narrative introduces >2 new topics.
   */
  checkClosingNewArguments(
    closingNarrative: string,
    priorNarratives: string[],
  ): string | null {
    const priorNouns = new Set<string>();
    for (const narrative of priorNarratives) {
      for (const noun of this.extractSignificantWords(narrative)) {
        priorNouns.add(noun);
      }
    }

    const closingNouns = this.extractSignificantWords(closingNarrative);
    const newNouns = closingNouns.filter((n) => !priorNouns.has(n));

    if (newNouns.length > 2) {
      return `Closing introduces ${newNouns.length} new topics: ${newNouns.slice(0, 5).join(', ')}`;
    }

    return null;
  }

  /**
   * Validate a cross-examination turn.
   * - Exactly `questionCount` questions (default 2)
   * - Each answer <= 60 words
   */
  validateCrossExTurn(
    payload: CrossExOutput,
    stage: StageConfig,
  ): ValidationResult {
    const violations: Violation[] = [];
    const details: string[] = [];

    const expectedCount = stage.questionCount || 2;
    if (payload.questions.length !== expectedCount) {
      violations.push('CROSSEX_QUESTION_COUNT');
      details.push(
        `Expected ${expectedCount} questions, got ${payload.questions.length}`,
      );
    }

    for (let i = 0; i < payload.questions.length; i++) {
      const answerWords = this.countWords(payload.questions[i].answer);
      if (answerWords > 60) {
        violations.push('CROSSEX_ANSWER_LENGTH');
        details.push(
          `Answer ${i + 1} has ${answerWords} words, exceeds 60 word limit`,
        );
      }
    }

    if (violations.length > 0) {
      this.logger.warn(
        `Cross-ex validation violations on stage ${stage.id}: ${violations.join(', ')}`,
      );
    }

    return { violations, details };
  }

  /**
   * Validate rebuttal turn has sufficient callbacks referencing opponent stage IDs.
   */
  validateRebuttalCallbacks(
    payload: DebaterOutput,
    stage: StageConfig,
    minCallbacks: number = 2,
  ): ValidationResult {
    const violations: Violation[] = [];
    const details: string[] = [];

    if (payload.callbacks.length < minCallbacks) {
      violations.push('MISSING_CALLBACKS');
      details.push(
        `Rebuttal requires at least ${minCallbacks} callbacks, got ${payload.callbacks.length}`,
      );
    }

    if (violations.length > 0) {
      this.logger.warn(
        `Rebuttal validation violations on stage ${stage.id}: ${violations.join(', ')}`,
      );
    }

    return { violations, details };
  }

  /**
   * Extract significant words (simple noun heuristic):
   * - Lowercase, remove punctuation
   * - Filter out common stop words
   * - Keep words >= 4 characters
   */
  extractSignificantWords(text: string): string[] {
    const stopWords = new Set([
      'the', 'this', 'that', 'with', 'from', 'have', 'been',
      'will', 'would', 'could', 'should', 'their', 'there',
      'they', 'them', 'then', 'than', 'when', 'what', 'which',
      'while', 'where', 'were', 'does', 'done', 'doing',
      'being', 'also', 'more', 'most', 'much', 'many',
      'very', 'just', 'only', 'such', 'some', 'same',
      'other', 'each', 'every', 'both', 'about', 'into',
      'over', 'after', 'before', 'between', 'under', 'again',
      'further', 'once', 'here', 'because', 'against',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w));

    // Deduplicate
    return [...new Set(words)];
  }
}
