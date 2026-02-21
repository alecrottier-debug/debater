-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "personaJson" JSONB NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debate" (
    "id" TEXT NOT NULL,
    "motion" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'quick',
    "personaAId" TEXT NOT NULL,
    "personaBId" TEXT NOT NULL,
    "stageIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "renderedText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "violations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeDecision" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "winner" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "ballot" JSONB NOT NULL,
    "bestLines" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgeDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JudgeDecision_debateId_key" ON "JudgeDecision"("debateId");

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_personaAId_fkey" FOREIGN KEY ("personaAId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_personaBId_fkey" FOREIGN KEY ("personaBId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeDecision" ADD CONSTRAINT "JudgeDecision_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
