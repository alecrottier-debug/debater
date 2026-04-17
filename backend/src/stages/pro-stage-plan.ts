import { StagePlan } from './stage-plan.types.js';

export const PRO_STAGE_PLAN: StagePlan = {
  mode: 'pro',
  stages: [
    // 1. Moderator Setup
    {
      id: 'MOD_SETUP',
      label: 'Moderator Setup',
      speaker: 'MOD',
      maxWords: 145,
      bullets: null,
      questionRequired: false,
      questionCount: 0,
    },
    // 2. For Opening Statement
    {
      id: 'A_OPEN',
      label: 'For Opening Statement',
      speaker: 'A',
      maxWords: 240,
      bullets: null,
      questionRequired: false,
      questionCount: 0,
    },
    // 3. Against Opening Statement
    {
      id: 'B_OPEN',
      label: 'Against Opening Statement',
      speaker: 'B',
      maxWords: 240,
      bullets: null,
      questionRequired: false,
      questionCount: 0,
    },
    // 4. For Cross-Examination of B
    {
      id: 'A_CROSSEX',
      label: 'For Cross-Examination',
      speaker: 'A',
      maxWords: null,
      bullets: null,
      questionRequired: true,
      questionCount: 2,
    },
    // 5. Against Cross-Examination of A
    {
      id: 'B_CROSSEX',
      label: 'Against Cross-Examination',
      speaker: 'B',
      maxWords: null,
      bullets: null,
      questionRequired: true,
      questionCount: 2,
    },
    // 6. For Rebuttal
    {
      id: 'A_REBUTTAL',
      label: 'For Rebuttal',
      speaker: 'A',
      maxWords: 190,
      bullets: null,
      questionRequired: false,
      questionCount: 0,
    },
    // 7. Against Rebuttal
    {
      id: 'B_REBUTTAL',
      label: 'Against Rebuttal',
      speaker: 'B',
      maxWords: 190,
      bullets: null,
      questionRequired: false,
      questionCount: 0,
    },
    // 8. Second Cross-Ex: A examines B
    {
      id: 'A_CROSSEX_2',
      label: 'For Cross-Examination Round 2',
      speaker: 'A',
      maxWords: null,
      bullets: null,
      questionRequired: true,
      questionCount: 2,
    },
    // 9. Second Cross-Ex: B examines A
    {
      id: 'B_CROSSEX_2',
      label: 'Against Cross-Examination Round 2',
      speaker: 'B',
      maxWords: null,
      bullets: null,
      questionRequired: true,
      questionCount: 2,
    },
    // 10. For Counter-Rebuttal
    {
      id: 'A_COUNTER',
      label: 'For Counter-Rebuttal',
      speaker: 'A',
      maxWords: 170,
      bullets: null,
      questionRequired: true,
      questionCount: 1,
    },
    // 11. Against Counter-Rebuttal
    {
      id: 'B_COUNTER',
      label: 'Against Counter-Rebuttal',
      speaker: 'B',
      maxWords: 170,
      bullets: null,
      questionRequired: true,
      questionCount: 1,
    },
    // 12. Against Closing Statement
    {
      id: 'B_CLOSE',
      label: 'Against Closing Statement',
      speaker: 'B',
      maxWords: 145,
      bullets: null,
      questionRequired: false,
      questionCount: 0,
    },
    // 13. For Closing Statement
    {
      id: 'A_CLOSE',
      label: 'For Closing Statement',
      speaker: 'A',
      maxWords: 145,
      bullets: null,
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
