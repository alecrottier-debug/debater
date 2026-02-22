-- AlterTable
ALTER TABLE "Debate" ADD COLUMN     "confrontationLevel" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "moderatorPersonaId" TEXT;

-- AlterTable
ALTER TABLE "Persona" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'debater';

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_moderatorPersonaId_fkey" FOREIGN KEY ("moderatorPersonaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
