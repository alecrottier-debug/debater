import {
  DebaterOutputSchema,
  ModeratorOutputSchema,
  JudgeOutputSchema,
  CrossExOutputSchema,
} from './llm-schemas';

describe('LLM Output Schemas', () => {
  describe('DebaterOutputSchema', () => {
    const validDebater = {
      narrative: 'This is a flowing prose argument with rhetorical flair.',
      question: 'What about this?',
      callbacks: ['A_OPEN'],
      tags: ['economy'],
    };

    it('accepts valid debater output', () => {
      const result = DebaterOutputSchema.safeParse(validDebater);
      expect(result.success).toBe(true);
    });

    it('accepts empty arrays for optional array fields', () => {
      const result = DebaterOutputSchema.safeParse({
        ...validDebater,
        callbacks: [],
        tags: [],
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty question string', () => {
      const result = DebaterOutputSchema.safeParse({
        ...validDebater,
        question: '',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing narrative', () => {
      const { narrative: _narrative, ...noNarrative } = validDebater;
      const result = DebaterOutputSchema.safeParse(noNarrative);
      expect(result.success).toBe(false);
    });

    it('rejects non-string narrative', () => {
      const result = DebaterOutputSchema.safeParse({
        ...validDebater,
        narrative: 123,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ModeratorOutputSchema', () => {
    const validModerator = {
      narrative:
        'Welcome to the debate. Here are the definitions, burdens, criteria, and rules.',
    };

    it('accepts valid moderator output', () => {
      const result = ModeratorOutputSchema.safeParse(validModerator);
      expect(result.success).toBe(true);
    });

    it('rejects missing narrative', () => {
      const result = ModeratorOutputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects non-string narrative', () => {
      const result = ModeratorOutputSchema.safeParse({
        narrative: 123,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('JudgeOutputSchema', () => {
    const detailedFixture = {
      logicalRigor: 8,
      evidenceQuality: 7,
      rebuttalEffectiveness: 8,
      argumentNovelty: 7,
      persuasiveness: 8,
      voiceAuthenticity: 8,
      rhetoricalSkill: 7,
      emotionalResonance: 7,
      framingControl: 8,
      adaptability: 7,
    };
    const sideAnalysisFixture = {
      strengths: ['Clear framing'],
      weaknesses: ['Light on evidence'],
      keyMoment: 'Pivot in rebuttal',
      keyMomentRef: 'A_REBUTTAL',
    };
    const validJudge = {
      winner: 'A' as const,
      scores: {
        A: { clarity: 8, strength: 7, responsiveness: 8, weighing: 7 },
        B: { clarity: 7, strength: 6, responsiveness: 7, weighing: 6 },
      },
      detailedScores: { A: detailedFixture, B: detailedFixture },
      verdict: 'Side A made the stronger case overall.',
      ballot: [{ reason: 'Strong argument', refs: ['A_OPEN'] }],
      analysis: { A: sideAnalysisFixture, B: sideAnalysisFixture },
      momentum: {
        trajectory: 'A_BUILDING' as const,
        description: 'Side A built momentum through rebuttal.',
      },
      closeness: 'clear' as const,
      improvements: {
        A: ['Improve closing'],
        B: ['More evidence'],
      },
      bestLines: {
        A: 'Best line from A',
        B: 'Best line from B',
      },
    };

    it('accepts valid judge output', () => {
      const result = JudgeOutputSchema.safeParse(validJudge);
      expect(result.success).toBe(true);
    });

    it('accepts TIE as winner', () => {
      const result = JudgeOutputSchema.safeParse({
        ...validJudge,
        winner: 'TIE',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid winner value', () => {
      const result = JudgeOutputSchema.safeParse({
        ...validJudge,
        winner: 'C',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing scores.A', () => {
      const result = JudgeOutputSchema.safeParse({
        ...validJudge,
        scores: { B: validJudge.scores.B },
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-number score fields', () => {
      const result = JudgeOutputSchema.safeParse({
        ...validJudge,
        scores: {
          A: { clarity: 'high', strength: 7, responsiveness: 8, weighing: 7 },
          B: validJudge.scores.B,
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects ballot entries missing reason', () => {
      const result = JudgeOutputSchema.safeParse({
        ...validJudge,
        ballot: [{ refs: ['A_OPEN'] }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing bestLines', () => {
      const { bestLines: _bl, ...noLines } = validJudge;
      const result = JudgeOutputSchema.safeParse(noLines);
      expect(result.success).toBe(false);
    });

    it('rejects missing improvements', () => {
      const { improvements: _i, ...noImprovements } = validJudge;
      const result = JudgeOutputSchema.safeParse(noImprovements);
      expect(result.success).toBe(false);
    });
  });

  describe('CrossExOutputSchema', () => {
    const validCrossEx = {
      questions: [
        { question: 'Q1?', answer: 'A1.' },
        { question: 'Q2?', answer: 'A2.' },
      ],
      tags: ['logic'],
    };

    it('accepts valid cross-ex output', () => {
      const result = CrossExOutputSchema.safeParse(validCrossEx);
      expect(result.success).toBe(true);
    });

    it('rejects missing questions', () => {
      const result = CrossExOutputSchema.safeParse({ tags: ['x'] });
      expect(result.success).toBe(false);
    });

    it('rejects question entries without answer field', () => {
      const result = CrossExOutputSchema.safeParse({
        questions: [{ question: 'Q1?' }],
        tags: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
