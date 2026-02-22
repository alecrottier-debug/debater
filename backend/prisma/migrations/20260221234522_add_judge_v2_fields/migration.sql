-- AlterTable
ALTER TABLE "JudgeDecision" ADD COLUMN     "analysis" JSONB,
ADD COLUMN     "closeness" TEXT,
ADD COLUMN     "detailedScores" JSONB,
ADD COLUMN     "momentum" JSONB,
ADD COLUMN     "verdict" TEXT;
