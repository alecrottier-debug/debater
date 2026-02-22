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

interface ValidatedPersona {
  name: string;
  tagline: string;
  json: object;
}

const REQUIRED_FIELDS_V1: (keyof PersonaFile)[] = [
  'name',
  'tagline',
  'style',
  'priorities',
  'background',
  'tone',
];

function validateV1(obj: Record<string, unknown>, filename: string): boolean {
  for (const field of REQUIRED_FIELDS_V1) {
    if (!(field in obj)) {
      console.error(`[SEED] ${filename}: missing required v1 field "${field}"`);
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

function validateV2(obj: Record<string, unknown>, filename: string): boolean {
  const identity = obj.identity as Record<string, unknown> | undefined;
  if (!identity || typeof identity !== 'object') {
    console.error(`[SEED] ${filename}: v2 missing identity section`);
    return false;
  }
  if (typeof identity.name !== 'string' || !identity.name) {
    console.error(`[SEED] ${filename}: v2 missing identity.name`);
    return false;
  }
  if (typeof identity.tagline !== 'string' || !identity.tagline) {
    console.error(`[SEED] ${filename}: v2 missing identity.tagline`);
    return false;
  }
  const bio = identity.biography as Record<string, unknown> | undefined;
  if (!bio || typeof bio.summary !== 'string' || !bio.summary) {
    console.error(`[SEED] ${filename}: v2 missing identity.biography.summary`);
    return false;
  }
  const positions = obj.positions as Record<string, unknown> | undefined;
  if (!positions || !Array.isArray(positions.priorities) || positions.priorities.length === 0) {
    console.error(`[SEED] ${filename}: v2 missing positions.priorities`);
    return false;
  }
  const rhetoric = obj.rhetoric as Record<string, unknown> | undefined;
  if (!rhetoric || typeof rhetoric.style !== 'string' || typeof rhetoric.tone !== 'string') {
    console.error(`[SEED] ${filename}: v2 missing rhetoric.style or rhetoric.tone`);
    return false;
  }
  return true;
}

function validateModeratorV1(obj: Record<string, unknown>, filename: string): boolean {
  if (obj.schemaVersion !== 'moderator_v1') return false;
  const identity = obj.identity as Record<string, unknown> | undefined;
  if (!identity || typeof identity !== 'object') {
    console.error(`[SEED] ${filename}: moderator_v1 missing identity section`);
    return false;
  }
  if (typeof identity.name !== 'string' || !identity.name) {
    console.error(`[SEED] ${filename}: moderator_v1 missing identity.name`);
    return false;
  }
  if (typeof identity.tagline !== 'string' || !identity.tagline) {
    console.error(`[SEED] ${filename}: moderator_v1 missing identity.tagline`);
    return false;
  }
  return true;
}

function validatePersona(data: unknown, filename: string): ValidatedPersona | null {
  if (typeof data !== 'object' || data === null) {
    console.error(`[SEED] ${filename}: not a valid JSON object`);
    return null;
  }
  const obj = data as Record<string, unknown>;

  if (obj.schemaVersion === 'moderator_v1') {
    if (!validateModeratorV1(obj, filename)) return null;
    const identity = obj.identity as { name: string; tagline: string };
    return { name: identity.name, tagline: identity.tagline, json: obj };
  }

  if (obj.schemaVersion === 2) {
    if (!validateV2(obj, filename)) return null;
    const identity = obj.identity as { name: string; tagline: string };
    return { name: identity.name, tagline: identity.tagline, json: obj };
  }

  if (!validateV1(obj, filename)) return null;
  return { name: obj.name as string, tagline: obj.tagline as string, json: obj };
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

      const validated = validatePersona(data, file);
      if (!validated) {
        errors++;
        continue;
      }

      const role = (validated.json as Record<string, unknown>).schemaVersion === 'moderator_v1' ? 'moderator' : 'debater';

      const existing = await prisma.persona.findFirst({
        where: { name: validated.name, isTemplate: true, role },
      });

      if (existing) {
        console.log(`[SEED] Skipping "${validated.name}" (already exists)`);
        skipped++;
        continue;
      }

      await prisma.persona.create({
        data: {
          name: validated.name,
          tagline: validated.tagline,
          personaJson: validated.json,
          isTemplate: true,
          role,
        },
      });

      console.log(`[SEED] Created persona "${validated.name}"`);
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
