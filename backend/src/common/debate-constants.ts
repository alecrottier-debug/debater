/**
 * Shared constants and string-typed unions used across the debate domain.
 * Keep DB string values stable — these match the `Debate.status` column.
 */

export const DebateStatus = {
  Pending: 'pending',
  InProgress: 'in_progress',
  Completed: 'completed',
  Error: 'error',
} as const;

export type DebateStatus = (typeof DebateStatus)[keyof typeof DebateStatus];

/** Default 1-5 confrontation level applied when the caller doesn't specify. */
export const DEFAULT_CONFRONTATION_LEVEL = 3;
