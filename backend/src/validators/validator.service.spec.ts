import { ValidatorService } from './validator.service';
import { StageConfig } from '../stages/stage-plan.types';
import { DebaterOutput, CrossExOutput } from '../llm/llm-schemas';

describe('ValidatorService', () => {
  let service: ValidatorService;

  beforeEach(() => {
    service = new ValidatorService();
  });

  function makePayload(overrides: Partial<DebaterOutput> = {}): DebaterOutput {
    return {
      lead: 'This is the main argument.',
      bullets: ['Point one.', 'Point two.'],
      question: 'What about this?',
      callbacks: [],
      tags: ['test'],
      ...overrides,
    };
  }

  function makeStage(overrides: Partial<StageConfig> = {}): StageConfig {
    return {
      id: 'A_OPEN',
      label: 'Side A Opening',
      speaker: 'A',
      maxWords: 110,
      bullets: { min: 2, max: 2 },
      questionRequired: false,
      questionCount: 0,
      ...overrides,
    };
  }

  describe('WORD_LIMIT', () => {
    it('passes when word count is within limit', () => {
      const payload = makePayload({ lead: 'Short lead.' });
      const stage = makeStage({ maxWords: 100 });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).not.toContain('WORD_LIMIT');
    });

    it('flags when word count exceeds limit', () => {
      const longLead = Array(100).fill('word').join(' ');
      const payload = makePayload({ lead: longLead });
      const stage = makeStage({ maxWords: 50 });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).toContain('WORD_LIMIT');
    });

    it('does not flag when maxWords is null', () => {
      const longLead = Array(500).fill('word').join(' ');
      const payload = makePayload({ lead: longLead });
      const stage = makeStage({ maxWords: null });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).not.toContain('WORD_LIMIT');
    });
  });

  describe('BULLET_COUNT', () => {
    it('passes when bullet count is in range', () => {
      const payload = makePayload({ bullets: ['A', 'B'] });
      const stage = makeStage({ bullets: { min: 1, max: 3 } });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).not.toContain('BULLET_COUNT');
    });

    it('flags when too few bullets', () => {
      const payload = makePayload({ bullets: [] });
      const stage = makeStage({ bullets: { min: 2, max: 3 } });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).toContain('BULLET_COUNT');
    });

    it('flags when too many bullets', () => {
      const payload = makePayload({ bullets: ['A', 'B', 'C', 'D'] });
      const stage = makeStage({ bullets: { min: 1, max: 2 } });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).toContain('BULLET_COUNT');
    });

    it('does not check when bullets config is null', () => {
      const payload = makePayload({ bullets: ['A', 'B', 'C', 'D', 'E'] });
      const stage = makeStage({ bullets: null });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).not.toContain('BULLET_COUNT');
    });
  });

  describe('MISSING_FIELD', () => {
    it('flags when question is required but empty', () => {
      const payload = makePayload({ question: '' });
      const stage = makeStage({ questionRequired: true });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).toContain('MISSING_FIELD');
    });

    it('flags when question is required but whitespace only', () => {
      const payload = makePayload({ question: '   ' });
      const stage = makeStage({ questionRequired: true });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).toContain('MISSING_FIELD');
    });

    it('passes when question is required and present', () => {
      const payload = makePayload({ question: 'A real question?' });
      const stage = makeStage({ questionRequired: true });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).not.toContain('MISSING_FIELD');
    });

    it('passes when question is not required', () => {
      const payload = makePayload({ question: '' });
      const stage = makeStage({ questionRequired: false });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).not.toContain('MISSING_FIELD');
    });
  });

  describe('NEW_ARGUMENT_CLOSING', () => {
    it('flags closing that introduces many new topics', () => {
      const priorLeads = [
        'The economy benefits from trade liberalization.',
        'Free markets drive innovation and growth.',
      ];
      const closingLead =
        'Healthcare reform, education policy, and environmental protection demand immediate attention in this congress.';
      const payload = makePayload({ lead: closingLead });
      const stage = makeStage({ id: 'A_CLOSE', maxWords: 200 });
      const result = service.validateDebaterTurn(payload, stage, priorLeads);
      expect(result.violations).toContain('NEW_ARGUMENT_CLOSING');
    });

    it('does not flag closing that reuses prior topics', () => {
      const priorLeads = [
        'The economy benefits from trade liberalization and growth.',
        'Innovation drives prosperity through technology.',
      ];
      const closingLead =
        'The economy and trade drive growth through innovation and technology.';
      const payload = makePayload({ lead: closingLead });
      const stage = makeStage({ id: 'B_CLOSE', maxWords: 200 });
      const result = service.validateDebaterTurn(payload, stage, priorLeads);
      expect(result.violations).not.toContain('NEW_ARGUMENT_CLOSING');
    });

    it('does not apply to non-closing stages', () => {
      const priorLeads: string[] = [];
      const closingLead =
        'Healthcare reform, education policy, and environmental protection demand immediate attention.';
      const payload = makePayload({ lead: closingLead });
      const stage = makeStage({ id: 'A_OPEN' });
      const result = service.validateDebaterTurn(payload, stage, priorLeads);
      expect(result.violations).not.toContain('NEW_ARGUMENT_CLOSING');
    });
  });

  describe('countWords', () => {
    it('counts words correctly', () => {
      expect(service.countWords('hello world')).toBe(2);
      expect(service.countWords('  spaced   out  ')).toBe(2);
      expect(service.countWords('')).toBe(0);
    });
  });

  describe('extractSignificantWords', () => {
    it('removes stop words and short words', () => {
      const result = service.extractSignificantWords(
        'the economy will grow with trade',
      );
      expect(result).toContain('economy');
      expect(result).toContain('grow');
      expect(result).toContain('trade');
      expect(result).not.toContain('the');
      expect(result).not.toContain('will');
      expect(result).not.toContain('with');
    });

    it('deduplicates words', () => {
      const result = service.extractSignificantWords(
        'economy economy economy',
      );
      expect(result).toEqual(['economy']);
    });
  });

  describe('multiple violations', () => {
    it('can report multiple violations at once', () => {
      const longLead = Array(100).fill('newword').join(' ');
      const payload = makePayload({
        lead: longLead,
        bullets: [],
        question: '',
      });
      const stage = makeStage({
        maxWords: 50,
        bullets: { min: 1, max: 2 },
        questionRequired: true,
      });
      const result = service.validateDebaterTurn(payload, stage, []);
      expect(result.violations).toContain('WORD_LIMIT');
      expect(result.violations).toContain('BULLET_COUNT');
      expect(result.violations).toContain('MISSING_FIELD');
      expect(result.details.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('CROSSEX_QUESTION_COUNT', () => {
    function makeCrossExPayload(overrides: Partial<CrossExOutput> = {}): CrossExOutput {
      return {
        questions: [
          { question: 'Q1?', answer: 'Short answer one.' },
          { question: 'Q2?', answer: 'Short answer two.' },
        ],
        tags: ['test'],
        ...overrides,
      };
    }

    function makeCrossExStage(overrides: Partial<StageConfig> = {}): StageConfig {
      return {
        id: 'A_CROSSEX',
        label: 'Side A Cross-Examination',
        speaker: 'A',
        maxWords: null,
        bullets: null,
        questionRequired: true,
        questionCount: 2,
        ...overrides,
      };
    }

    it('passes with exactly 2 questions', () => {
      const payload = makeCrossExPayload();
      const stage = makeCrossExStage();
      const result = service.validateCrossExTurn(payload, stage);
      expect(result.violations).not.toContain('CROSSEX_QUESTION_COUNT');
    });

    it('flags too few questions', () => {
      const payload = makeCrossExPayload({
        questions: [{ question: 'Q1?', answer: 'A1.' }],
      });
      const stage = makeCrossExStage();
      const result = service.validateCrossExTurn(payload, stage);
      expect(result.violations).toContain('CROSSEX_QUESTION_COUNT');
    });

    it('flags too many questions', () => {
      const payload = makeCrossExPayload({
        questions: [
          { question: 'Q1?', answer: 'A1.' },
          { question: 'Q2?', answer: 'A2.' },
          { question: 'Q3?', answer: 'A3.' },
        ],
      });
      const stage = makeCrossExStage();
      const result = service.validateCrossExTurn(payload, stage);
      expect(result.violations).toContain('CROSSEX_QUESTION_COUNT');
    });
  });

  describe('CROSSEX_ANSWER_LENGTH', () => {
    function makeCrossExStage(): StageConfig {
      return {
        id: 'A_CROSSEX',
        label: 'Side A Cross-Examination',
        speaker: 'A',
        maxWords: null,
        bullets: null,
        questionRequired: true,
        questionCount: 2,
      };
    }

    it('passes when all answers are within 60 words', () => {
      const payload: CrossExOutput = {
        questions: [
          { question: 'Q1?', answer: 'This is a short answer.' },
          { question: 'Q2?', answer: 'Another short answer.' },
        ],
        tags: [],
      };
      const result = service.validateCrossExTurn(payload, makeCrossExStage());
      expect(result.violations).not.toContain('CROSSEX_ANSWER_LENGTH');
    });

    it('flags answers exceeding 60 words', () => {
      const longAnswer = Array(65).fill('word').join(' ');
      const payload: CrossExOutput = {
        questions: [
          { question: 'Q1?', answer: longAnswer },
          { question: 'Q2?', answer: 'Short.' },
        ],
        tags: [],
      };
      const result = service.validateCrossExTurn(payload, makeCrossExStage());
      expect(result.violations).toContain('CROSSEX_ANSWER_LENGTH');
    });
  });

  describe('MISSING_CALLBACKS (rebuttal)', () => {
    it('passes when rebuttal has enough callbacks', () => {
      const payload = makePayload({
        callbacks: ['A_OPEN', 'B_OPEN'],
      });
      const stage = makeStage({ id: 'A_REBUTTAL' });
      const result = service.validateRebuttalCallbacks(payload, stage, 2);
      expect(result.violations).not.toContain('MISSING_CALLBACKS');
    });

    it('flags when rebuttal has too few callbacks', () => {
      const payload = makePayload({
        callbacks: ['A_OPEN'],
      });
      const stage = makeStage({ id: 'A_REBUTTAL' });
      const result = service.validateRebuttalCallbacks(payload, stage, 2);
      expect(result.violations).toContain('MISSING_CALLBACKS');
    });

    it('flags when rebuttal has no callbacks', () => {
      const payload = makePayload({
        callbacks: [],
      });
      const stage = makeStage({ id: 'B_REBUTTAL' });
      const result = service.validateRebuttalCallbacks(payload, stage, 2);
      expect(result.violations).toContain('MISSING_CALLBACKS');
    });
  });

  describe('LLM-based closing new argument classifier', () => {
    it('returns PASS when LLM says it is a reframe', async () => {
      const mockLlm = {
        generateText: jest.fn().mockResolvedValue('PASS'),
      } as any;
      const svc = new ValidatorService(mockLlm);

      const result = await svc.classifyClosingNewArguments(
        'In conclusion, the economy benefits from trade.',
        ['Economy benefits from trade.'],
        ['The economy benefits from trade and growth.'],
      );
      expect(result).toBeNull();
      expect(mockLlm.generateText).toHaveBeenCalledTimes(1);
    });

    it('returns violation when LLM says new arguments introduced', async () => {
      const mockLlm = {
        generateText: jest.fn().mockResolvedValue('FAIL: Introduces healthcare as a new topic.'),
      } as any;
      const svc = new ValidatorService(mockLlm);

      const result = await svc.classifyClosingNewArguments(
        'Healthcare is the key issue we must address.',
        [],
        ['The economy benefits from trade.'],
      );
      expect(result).toBe('LLM classifier: Introduces healthcare as a new topic.');
    });

    it('falls back to heuristic when LLM throws', async () => {
      const mockLlm = {
        generateText: jest.fn().mockRejectedValue(new Error('API failure')),
      } as any;
      const svc = new ValidatorService(mockLlm);

      // This should use heuristic fallback - with 0 prior leads, any new topic triggers
      const result = await svc.classifyClosingNewArguments(
        'Healthcare reform education policy and environmental protection demand immediate attention.',
        [],
        [],
      );
      // Heuristic should find new topics since priorLeads is empty
      expect(result).toContain('new topics');
    });

    it('falls back to heuristic when no LLM adapter', async () => {
      const svc = new ValidatorService(); // No LLM injected

      const result = await svc.classifyClosingNewArguments(
        'The economy and trade drive growth.',
        [],
        ['The economy benefits from trade and growth.'],
      );
      // Should use heuristic: economy, trade, growth are all in prior leads
      expect(result).toBeNull();
    });

    it('async validation uses LLM for closing stages', async () => {
      const mockLlm = {
        generateText: jest.fn().mockResolvedValue('PASS'),
      } as any;
      const svc = new ValidatorService(mockLlm);

      const payload = makePayload({ lead: 'Summary of prior points.' });
      const stage = makeStage({ id: 'A_CLOSE', maxWords: 200 });
      const result = await svc.validateDebaterTurnAsync(payload, stage, [
        'Prior points were made.',
      ]);
      expect(result.violations).not.toContain('NEW_ARGUMENT_CLOSING');
      expect(mockLlm.generateText).toHaveBeenCalledTimes(1);
    });

    it('async validation flags new arguments via LLM', async () => {
      const mockLlm = {
        generateText: jest.fn().mockResolvedValue('FAIL: New topic introduced.'),
      } as any;
      const svc = new ValidatorService(mockLlm);

      const payload = makePayload({ lead: 'New topic entirely.' });
      const stage = makeStage({ id: 'B_CLOSE', maxWords: 200 });
      const result = await svc.validateDebaterTurnAsync(payload, stage, [
        'Prior argument about economy.',
      ]);
      expect(result.violations).toContain('NEW_ARGUMENT_CLOSING');
    });
  });
});
