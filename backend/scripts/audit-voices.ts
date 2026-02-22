import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/debater?schema=public' });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const personas = await prisma.persona.findMany({
    where: { isTemplate: true, role: 'debater' },
    select: { name: true, personaJson: true },
  });

  for (const p of personas.sort((a, b) => a.name.localeCompare(b.name))) {
    const json = p.personaJson as Record<string, unknown>;
    const hasVoiceCal = Boolean(json.voiceCalibration);
    const rhetoric = json.rhetoric as Record<string, unknown> | undefined;
    const hasMoves = Boolean((rhetoric?.rhetoricalMoves as unknown[] | undefined)?.length);
    const hasPhrases = Boolean((rhetoric?.signaturePhrases as unknown[] | undefined)?.length);
    const hasRhythm = Boolean(rhetoric?.sentenceRhythm);
    const hasVocab = Boolean(rhetoric?.vocabularyRegister);
    const richness = [hasVoiceCal, hasMoves, hasPhrases, hasRhythm, hasVocab].filter(Boolean).length;
    const label = richness >= 4 ? 'RICH' : richness >= 2 ? 'PARTIAL' : 'THIN';
    console.log(
      label.padEnd(9) +
      p.name.padEnd(30) +
      'voiceCal=' + (hasVoiceCal ? 'Y' : 'N') +
      ' moves=' + (hasMoves ? 'Y' : 'N') +
      ' phrases=' + (hasPhrases ? 'Y' : 'N') +
      ' rhythm=' + (hasRhythm ? 'Y' : 'N') +
      ' vocab=' + (hasVocab ? 'Y' : 'N')
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
