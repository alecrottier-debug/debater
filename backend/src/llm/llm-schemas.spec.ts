import {
  DebaterOutputSchema,
  ModeratorOutputSchema,
  JudgeOutputSchema,
  CrossExOutputSchema,
} from './llm-schemas';

describe('LLM Output Schemas', () => {
  describe('DebaterOutputSchema', () => {
    const validDebater = {
      lead: 'Main argument here.',
      bullets: ['Point 1', 'Point 2'],
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
        bullets: [],
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

    it('rejects missing lead', () => {
      const { lead: _lead, ...noLead } = validDebater;
      const result = DebaterOutputSchema.safeParse(noLead);
      expect(result.success).toBe(false);
    });

    it('rejects missing bullets', () => {
      const { bullets: _b, ...noBullets } = validDebater;
      const result = DebaterOutputSchema.safeParse(noBullets);
      expect(result.success).toBe(false);
    });

    it('rejects non-string lead', () => {
      const result = DebaterOutputSchema.safeParse({
        ...validDebater,
        lead: 123,
      });
      expect(result.success).toBe(false);
    });

    it('rejects bullets with non-string elements', () => {
      const result = DebaterOutputSchema.safeParse({
        ...validDebater,
        bullets: [1, 2],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ModeratorOutputSchema', () => {
    const validModerator = {
      definitions: ['Def 1'],
      burdens: ['Burden 1'],
      judging_criteria: ['Criteria 1'],
      house_rules: ['Rule 1'],
    };

    it('accepts valid moderator output', () => {
      const result = ModeratorOutputSchema.safeParse(validModerator);
      expect(result.success).toBe(true);
    });

    it('rejects missing definitions', () => {
      const { definitions: _d, ...noDefinitions } = validModerator;
      const result = ModeratorOutputSchema.safeParse(noDefinitions);
      expect(result.success).toBe(false);
    });

    it('rejects non-array judging_criteria', () => {
      const result = ModeratorOutputSchema.safeParse({
        ...validModerator,
        judging_criteria: 'not an array',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('JudgeOutputSchema', () => {
    const validJudge = {
      winner: 'A' as const,
      scores: {
        A: { clarity: 8, strength: 7, responsiveness: 8, weighing: 7 },
        B: { clarity: 7, strength: 6, responsiveness: 7, weighing: 6 },
      },
      ballot: [
        { reason: 'Strong argument', refs: ['A_OPEN'] },
      ],
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
