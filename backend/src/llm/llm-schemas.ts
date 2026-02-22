import { z } from 'zod';

/**
 * Zod schemas for all LLM output contracts.
 */

export const DebaterOutputSchema = z.object({
  narrative: z.string(),
  question: z.string(),
  callbacks: z.array(z.string()),
  tags: z.array(z.string()),
});
export type DebaterOutput = z.infer<typeof DebaterOutputSchema>;

export const ModeratorOutputSchema = z.object({
  narrative: z.string(),
});
export type ModeratorOutput = z.infer<typeof ModeratorOutputSchema>;

/**
 * Core scoring dimensions (1-10 each) — kept for backward compatibility.
 * These are the "headline" scores that the frontend scorecard displays.
 */
const ScoreFields = z.object({
  clarity: z.number(),
  strength: z.number(),
  responsiveness: z.number(),
  weighing: z.number(),
});

/**
 * Detailed sub-scores that break each dimension into finer categories.
 * These are additive — the frontend can display them if present, ignore if not.
 */
const DetailedSubScores = z.object({
  logicalRigor: z.number().min(1).max(10),
  evidenceQuality: z.number().min(1).max(10),
  rebuttalEffectiveness: z.number().min(1).max(10),
  argumentNovelty: z.number().min(1).max(10),
  persuasiveness: z.number().min(1).max(10),
  voiceAuthenticity: z.number().min(1).max(10),
  rhetoricalSkill: z.number().min(1).max(10),
  emotionalResonance: z.number().min(1).max(10),
  framingControl: z.number().min(1).max(10),
  adaptability: z.number().min(1).max(10),
});

export const JudgeOutputSchema = z.object({
  winner: z.enum(['A', 'B', 'TIE']),
  /** Headline scores — backward compatible with existing frontend */
  scores: z.object({
    A: ScoreFields,
    B: ScoreFields,
  }),
  /** Detailed sub-scores for granular analysis */
  detailedScores: z.object({
    A: DetailedSubScores,
    B: DetailedSubScores,
  }),
  /** Overall narrative verdict — an authoritative written judgment */
  verdict: z.string(),
  ballot: z.array(
    z.object({
      reason: z.string(),
      refs: z.array(z.string()),
    }),
  ),
  /** Per-side analysis with strengths, weaknesses, and key moments */
  analysis: z.object({
    A: z.object({
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      keyMoment: z.string(),
      keyMomentRef: z.string(),
    }),
    B: z.object({
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      keyMoment: z.string(),
      keyMomentRef: z.string(),
    }),
  }),
  /** Momentum assessment — who finished stronger */
  momentum: z.object({
    trajectory: z.enum(['A_BUILDING', 'B_BUILDING', 'EVEN', 'A_FADING', 'B_FADING']),
    description: z.string(),
  }),
  /** How close the debate was: "blowout" | "clear" | "narrow" | "razor-thin" */
  closeness: z.enum(['blowout', 'clear', 'narrow', 'razor-thin']),
  improvements: z.object({
    A: z.array(z.string()),
    B: z.array(z.string()),
  }),
  bestLines: z.object({
    A: z.string(),
    B: z.string(),
  }),
});
export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;

export const CrossExOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    }),
  ),
  tags: z.array(z.string()),
});
export type CrossExOutput = z.infer<typeof CrossExOutputSchema>;

export const DiscussionWrapOutputSchema = z.object({
  narrative: z.string(),
  keyTakeaways: z.array(z.string()),
  areasOfAgreement: z.array(z.string()),
  areasOfDisagreement: z.array(z.string()),
  openQuestions: z.array(z.string()),
});
export type DiscussionWrapOutput = z.infer<typeof DiscussionWrapOutputSchema>;
