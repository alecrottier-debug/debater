import { StagePlan } from './stage-plan.types.js';

export const PRO_STAGE_PLAN: StagePlan = {
  mode: 'pro',
  stages: [
    // 1. Moderator Setup
    {
      id: 'MOD_SETUP',
      label: 'Moderator Setup',
      speaker: 'MOD',
      maxWords: 120,
      bullets: { min: 3, max: 4 },
      questionRequired: false,
      questionCount: 0,
    },
    // 2. Side A Opening Statement
    {
      id: 'A_OPEN',
      label: 'Side A Opening Statement',
      speaker: 'A',
      maxWords: 200,
      bullets: { min: 3, max: 4 },
      questionRequired: false,
      questionCount: 0,
    },
    // 3. Side B Opening Statement
    {
      id: 'B_OPEN',
      label: 'Side B Opening Statement',
      speaker: 'B',
      maxWords: 200,
      bullets: { min: 3, max: 4 },
      questionRequired: false,
      questionCount: 0,
    },
    // 4. Side A Cross-Examination of B
    {
      id: 'A_CROSSEX',
      label: 'Side A Cross-Examination',
      speaker: 'A',
      maxWords: null,
      bullets: null,
      questionRequired: true,
      questionCount: 2,
    },
    // 5. Side B Cross-Examination of A
    {
      id: 'B_CROSSEX',
      label: 'Side B Cross-Examination',
      speaker: 'B',
      maxWords: null,
      bullets: null,
      questionRequired: true,
      questionCount: 2,
    },
    // 6. Side A Rebuttal
    {
      id: 'A_REBUTTAL',
      label: 'Side A Rebuttal',
      speaker: 'A',
      maxWords: 160,
      bullets: { min: 2, max: 3 },
      questionRequired: false,
      questionCount: 0,
    },
    // 7. Side B Rebuttal
    {
      id: 'B_REBUTTAL',
      label: 'Side B Rebuttal',
      speaker: 'B',
      maxWords: 160,
      bullets: { min: 2, max: 3 },
      questionRequired: false,
      questionCount: 0,
    },
    // 8. Second Cross-Ex: A examines B
    {
      id: 'A_CROSSEX_2',
      label: 'Side A Cross-Examination Round 2',
      speaker: 'A',
      maxWords: null,
      bullets: null,
      questionRequired: true,
      questionCount: 2,
    },
    // 9. Second Cross-Ex: B examines A
    {
      id: 'B_CROSSEX_2',
      label: 'Side B Cross-Examination Round 2',
      speaker: 'B',
      maxWords: null,
      bullets: null,
      questionRequired: true,
      questionCount: 2,
    },
    // 10. Side A Counter-Rebuttal
    {
      id: 'A_COUNTER',
      label: 'Side A Counter-Rebuttal',
      speaker: 'A',
      maxWords: 140,
      bullets: { min: 1, max: 3 },
      questionRequired: true,
      questionCount: 1,
    },
    // 11. Side B Counter-Rebuttal
    {
      id: 'B_COUNTER',
      label: 'Side B Counter-Rebuttal',
      speaker: 'B',
      maxWords: 140,
      bullets: { min: 1, max: 3 },
      questionRequired: true,
      questionCount: 1,
    },
    // 12. Side B Closing Statement
    {
      id: 'B_CLOSE',
      label: 'Side B Closing Statement',
      speaker: 'B',
      maxWords: 120,
      bullets: { min: 0, max: 3 },
      questionRequired: false,
      questionCount: 0,
    },
    // 13. Side A Closing Statement
    {
      id: 'A_CLOSE',
      label: 'Side A Closing Statement',
      speaker: 'A',
      maxWords: 120,
      bullets: { min: 0, max: 3 },
      questionRequired: false,
      questionCount: 0,
    },
    // 14. Judge Decision
    {
      id: 'JUDGE',
      label: 'Judge Decision',
      speaker: 'JUDGE',
      maxWords: null,
      bullets: null,
      questionRequired: false,
      questionCount: 0,
    },
  ],
};
