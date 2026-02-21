import { Injectable, Logger } from '@nestjs/common';
import { LlmAdapter, LlmPrompt } from './llm-adapter.interface.js';
import {
  DebaterOutput,
  ModeratorOutput,
  JudgeOutput,
  CrossExOutput,
} from './llm-schemas.js';

@Injectable()
export class MockLlmAdapter implements LlmAdapter {
  private readonly logger = new Logger(MockLlmAdapter.name);

  async generateModeratorTurn(_prompt: LlmPrompt): Promise<ModeratorOutput> {
    this.logger.debug('[MOCK] generateModeratorTurn called');
    return {
      narrative:
        'Welcome to today\'s debate. The motion refers to the proposition as stated, and success is measured by overall impact. Side A must prove the motion is beneficial, while Side B must demonstrate the motion causes harm. We will judge on clarity of argumentation, strength of evidence, and responsiveness to your opponent. Please refrain from ad hominem attacks and stay within word limits.',
    };
  }

  async generateDebaterTurn(
    _prompt: LlmPrompt,
    speaker: 'A' | 'B',
  ): Promise<DebaterOutput> {
    this.logger.debug(`[MOCK] generateDebaterTurn called for speaker ${speaker}`);
    return {
      narrative: `This is the main argument for Side ${speaker}. The evidence clearly supports our position, and when we examine the facts carefully, we find that the first supporting point strengthens our case considerably. Furthermore, the second supporting point demonstrates the broader implications of our stance.`,
      question: `What does the opponent say about this key issue?`,
      callbacks: [],
      tags: ['economy', 'policy'],
    };
  }

  async generateJudgeDecision(_prompt: LlmPrompt): Promise<JudgeOutput> {
    this.logger.debug('[MOCK] generateJudgeDecision called');
    return {
      winner: 'A',
      scores: {
        A: { clarity: 8, strength: 7, responsiveness: 8, weighing: 7 },
        B: { clarity: 7, strength: 6, responsiveness: 7, weighing: 6 },
      },
      ballot: [
        {
          reason: 'Side A presented stronger evidence with clearer logic.',
          refs: ['A_OPEN', 'A_CHALLENGE'],
        },
        {
          reason: 'Side B failed to adequately address the core claims.',
          refs: ['B_COUNTER'],
        },
      ],
      improvements: {
        A: ['Could strengthen closing argument.'],
        B: ['Should provide more concrete examples.'],
      },
      bestLines: {
        A: 'This is the most compelling line from Side A.',
        B: 'This is the most compelling line from Side B.',
      },
    };
  }

  async generateCrossExTurn(
    _prompt: LlmPrompt,
    speaker: 'A' | 'B',
  ): Promise<CrossExOutput> {
    this.logger.debug(`[MOCK] generateCrossExTurn called for speaker ${speaker}`);
    return {
      questions: [
        {
          question: `First question from ${speaker}?`,
          answer: `Answer to first question, kept brief.`,
        },
        {
          question: `Second question from ${speaker}?`,
          answer: `Answer to second question, kept brief.`,
        },
      ],
      tags: ['evidence', 'logic'],
    };
  }

  async generateText(_prompt: LlmPrompt): Promise<string> {
    this.logger.debug('[MOCK] generateText called');
    return 'Mock text response';
  }
}
