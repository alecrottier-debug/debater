import { Injectable, Logger } from '@nestjs/common';
import { LlmAdapter, LlmPrompt } from './llm-adapter.interface.js';
import {
  DebaterOutput,
  ModeratorOutput,
  JudgeOutput,
  CrossExOutput,
  DiscussionWrapOutput,
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
      detailedScores: {
        A: {
          logicalRigor: 8, evidenceQuality: 7, rebuttalEffectiveness: 8,
          argumentNovelty: 7, persuasiveness: 8, voiceAuthenticity: 7,
          rhetoricalSkill: 7, emotionalResonance: 6, framingControl: 8,
          adaptability: 7,
        },
        B: {
          logicalRigor: 7, evidenceQuality: 6, rebuttalEffectiveness: 6,
          argumentNovelty: 6, persuasiveness: 7, voiceAuthenticity: 7,
          rhetoricalSkill: 6, emotionalResonance: 7, framingControl: 6,
          adaptability: 6,
        },
      },
      verdict: 'Side A wins this debate through superior argumentation and more effective engagement with the opponent\'s points. While Side B showed moments of strong rhetorical flair, particularly in their opening, they failed to sustain that energy through the middle rounds. The decisive moment came during A\'s challenge stage, where they systematically dismantled B\'s core framework.',
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
      analysis: {
        A: {
          strengths: [
            'Strong opening framework that set favorable terms for the debate',
            'Effective use of concrete evidence and data points',
          ],
          weaknesses: [
            'Closing argument could have been more impactful',
            'Missed an opportunity to address B\'s emotional appeal',
          ],
          keyMoment: 'The systematic dismantling of Side B\'s economic argument using their own cited statistics.',
          keyMomentRef: 'A_CHALLENGE',
        },
        B: {
          strengths: [
            'Compelling emotional appeals that resonated with the audience',
            'Strong opening that initially set the agenda',
          ],
          weaknesses: [
            'Failed to provide concrete examples when challenged',
            'Lost control of the framing in the middle rounds',
          ],
          keyMoment: 'The passionate opening argument that framed the human cost of the motion.',
          keyMomentRef: 'B_OPEN',
        },
      },
      momentum: {
        trajectory: 'A_BUILDING',
        description: 'Side A started solid and built momentum through the challenge and counter stages, while Side B peaked early and faded.',
      },
      closeness: 'clear',
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

  async generateDiscussionWrap(_prompt: LlmPrompt): Promise<DiscussionWrapOutput> {
    this.logger.debug('[MOCK] generateDiscussionWrap called');
    return {
      narrative: 'What a fascinating discussion. Both guests brought unique perspectives to this important topic.',
      keyTakeaways: ['First key takeaway', 'Second key takeaway', 'Third key takeaway'],
      areasOfAgreement: ['Both agree on the importance of the topic'],
      areasOfDisagreement: ['They differ on the best approach'],
      openQuestions: ['What will the future hold?'],
    };
  }

  async generateText(_prompt: LlmPrompt): Promise<string> {
    this.logger.debug('[MOCK] generateText called');
    return 'Mock text response';
  }
}
