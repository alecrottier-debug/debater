import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://localhost:5432/debater?schema=public';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface PersonaFile {
  name: string;
  tagline: string;
  style: string;
  priorities: string[];
  background: string;
  tone: string;
}

const REQUIRED_FIELDS: (keyof PersonaFile)[] = [
  'name',
  'tagline',
  'style',
  'priorities',
  'background',
  'tone',
];

function validatePersona(data: unknown, filename: string): data is PersonaFile {
  if (typeof data !== 'object' || data === null) {
    console.error(`[SEED] ${filename}: not a valid JSON object`);
    return false;
  }
  const obj = data as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) {
      console.error(`[SEED] ${filename}: missing required field "${field}"`);
      return false;
    }
  }
  if (typeof obj.name !== 'string' || typeof obj.tagline !== 'string') {
    console.error(`[SEED] ${filename}: name and tagline must be strings`);
    return false;
  }
  if (!Array.isArray(obj.priorities)) {
    console.error(`[SEED] ${filename}: priorities must be an array`);
    return false;
  }
  return true;
}

async function main() {
  const personasDir = path.join(__dirname, 'personas');
  const files = fs.readdirSync(personasDir).filter((f) => f.endsWith('.json'));

  console.log(`[SEED] Found ${files.length} persona files`);

  let loaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(personasDir, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data: unknown = JSON.parse(raw);

      if (!validatePersona(data, file)) {
        errors++;
        continue;
      }

      const existing = await prisma.persona.findFirst({
        where: { name: data.name, isTemplate: true },
      });

      if (existing) {
        console.log(`[SEED] Skipping "${data.name}" (already exists)`);
        skipped++;
        continue;
      }

      await prisma.persona.create({
        data: {
          name: data.name,
          tagline: data.tagline,
          personaJson: data as object,
          isTemplate: true,
        },
      });

      console.log(`[SEED] Created persona "${data.name}"`);
      loaded++;
    } catch (err) {
      console.error(`[SEED] Error loading ${file}:`, err);
      errors++;
    }
  }

  console.log(
    `[SEED] Done: ${loaded} loaded, ${skipped} skipped, ${errors} errors`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
