import { StagePlanService } from './stage-plan.service';

describe('StagePlanService', () => {
  let service: StagePlanService;

  beforeEach(() => {
    service = new StagePlanService();
  });

  describe('Quick mode stage mapping', () => {
    const expectedStages = [
      { index: 0, id: 'MOD_SETUP', speaker: 'MOD' },
      { index: 1, id: 'A_OPEN', speaker: 'A' },
      { index: 2, id: 'B_OPEN', speaker: 'B' },
      { index: 3, id: 'A_CHALLENGE', speaker: 'A' },
      { index: 4, id: 'B_COUNTER', speaker: 'B' },
      { index: 5, id: 'A_COUNTER', speaker: 'A' },
      { index: 6, id: 'B_CLOSE', speaker: 'B' },
      { index: 7, id: 'A_CLOSE', speaker: 'A' },
      { index: 8, id: 'JUDGE', speaker: 'JUDGE' },
    ];

    it.each(expectedStages)(
      'stageIndex $index maps to $id ($speaker)',
      ({ index, id, speaker }) => {
        const stage = service.getStageByIndex('quick', index);
        expect(stage.id).toBe(id);
        expect(stage.speaker).toBe(speaker);
      },
    );

    it('quick mode has exactly 9 stages (S1-S9)', () => {
      expect(service.getStageCount('quick')).toBe(9);
    });
  });

  describe('Stage config details', () => {
    it('MOD_SETUP has 110 maxWords and no bullets', () => {
      const stage = service.getStageByIndex('quick', 0);
      expect(stage.maxWords).toBe(110);
      expect(stage.bullets).toBeNull();
      expect(stage.questionRequired).toBe(false);
    });

    it('A_CHALLENGE requires a question', () => {
      const stage = service.getStageByIndex('quick', 3);
      expect(stage.questionRequired).toBe(true);
      expect(stage.questionCount).toBe(1);
      expect(stage.maxWords).toBe(100);
    });

    it('JUDGE has no word limit or bullets', () => {
      const stage = service.getStageByIndex('quick', 8);
      expect(stage.maxWords).toBeNull();
      expect(stage.bullets).toBeNull();
    });

    it('all stages have null bullets (narrative format)', () => {
      const bClose = service.getStageByIndex('quick', 6);
      const aClose = service.getStageByIndex('quick', 7);
      expect(bClose.bullets).toBeNull();
      expect(aClose.bullets).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('throws on unknown mode', () => {
      expect(() => service.getPlan('nonexistent')).toThrow(
        'Unknown debate mode: "nonexistent"',
      );
    });

    it('throws on out-of-range stage index', () => {
      expect(() => service.getStageByIndex('quick', -1)).toThrow(
        'out of range',
      );
      expect(() => service.getStageByIndex('quick', 9)).toThrow(
        'out of range',
      );
    });
  });

  describe('getAvailableModes', () => {
    it('includes quick mode', () => {
      expect(service.getAvailableModes()).toContain('quick');
    });

    it('includes pro mode', () => {
      expect(service.getAvailableModes()).toContain('pro');
    });
  });

  describe('Pro mode stage mapping', () => {
    const expectedStages = [
      { index: 0, id: 'MOD_SETUP', speaker: 'MOD' },
      { index: 1, id: 'A_OPEN', speaker: 'A' },
      { index: 2, id: 'B_OPEN', speaker: 'B' },
      { index: 3, id: 'A_CROSSEX', speaker: 'A' },
      { index: 4, id: 'B_CROSSEX', speaker: 'B' },
      { index: 5, id: 'A_REBUTTAL', speaker: 'A' },
      { index: 6, id: 'B_REBUTTAL', speaker: 'B' },
      { index: 7, id: 'A_CROSSEX_2', speaker: 'A' },
      { index: 8, id: 'B_CROSSEX_2', speaker: 'B' },
      { index: 9, id: 'A_COUNTER', speaker: 'A' },
      { index: 10, id: 'B_COUNTER', speaker: 'B' },
      { index: 11, id: 'B_CLOSE', speaker: 'B' },
      { index: 12, id: 'A_CLOSE', speaker: 'A' },
      { index: 13, id: 'JUDGE', speaker: 'JUDGE' },
    ];

    it.each(expectedStages)(
      'stageIndex $index maps to $id ($speaker)',
      ({ index, id, speaker }) => {
        const stage = service.getStageByIndex('pro', index);
        expect(stage.id).toBe(id);
        expect(stage.speaker).toBe(speaker);
      },
    );

    it('pro mode has exactly 14 stages', () => {
      expect(service.getStageCount('pro')).toBe(14);
    });

    it('pro cross-ex stages require 2 questions', () => {
      const crossex1 = service.getStageByIndex('pro', 3);
      const crossex2 = service.getStageByIndex('pro', 4);
      expect(crossex1.questionRequired).toBe(true);
      expect(crossex1.questionCount).toBe(2);
      expect(crossex2.questionRequired).toBe(true);
      expect(crossex2.questionCount).toBe(2);
    });

    it('pro opening statements have higher word limits than quick', () => {
      const proOpen = service.getStageByIndex('pro', 1);
      const quickOpen = service.getStageByIndex('quick', 1);
      expect(proOpen.maxWords).toBeGreaterThan(quickOpen.maxWords!);
    });

    it('pro closing statements have higher word limits than quick', () => {
      const proClose = service.getStageByIndex('pro', 12);
      const quickClose = service.getStageByIndex('quick', 7);
      expect(proClose.maxWords).toBeGreaterThan(quickClose.maxWords!);
    });

    it('cross-ex stages have no word limit (null)', () => {
      const crossex = service.getStageByIndex('pro', 3);
      expect(crossex.maxWords).toBeNull();
      expect(crossex.bullets).toBeNull();
    });

    it('rebuttal stages have null bullets (narrative format)', () => {
      const rebuttalA = service.getStageByIndex('pro', 5);
      const rebuttalB = service.getStageByIndex('pro', 6);
      expect(rebuttalA.bullets).toBeNull();
      expect(rebuttalB.bullets).toBeNull();
    });
  });
});
