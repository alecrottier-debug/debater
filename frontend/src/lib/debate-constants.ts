/**
 * Mirrors backend/src/common/debate-constants.ts. Keep these two files in sync
 * — values are persisted as plain strings in the `Debate.status` column.
 */

export const DebateStatus = {
  Pending: "pending",
  InProgress: "in_progress",
  Completed: "completed",
  Error: "error",
} as const;

export type DebateStatus = (typeof DebateStatus)[keyof typeof DebateStatus];

export const DEFAULT_CONFRONTATION_LEVEL = 3;
