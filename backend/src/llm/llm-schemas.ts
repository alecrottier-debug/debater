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

const ScoreFields = z.object({
  clarity: z.number(),
  strength: z.number(),
  responsiveness: z.number(),
  weighing: z.number(),
});

export const JudgeOutputSchema = z.object({
  winner: z.enum(['A', 'B', 'TIE']),
  scores: z.object({
    A: ScoreFields,
    B: ScoreFields,
  }),
  ballot: z.array(
    z.object({
      reason: z.string(),
      refs: z.array(z.string()),
    }),
  ),
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
