/**
 * Sync enriched persona JSONs from prisma/personas/*.json to the Postgres DB.
 *
 * Unlike the seed script (which skips existing rows), this script performs
 * an UPSERT by name: inserts new personas, and updates personaJson + tagline
 * for existing ones. Used after a re-enrichment pass to push the fresh data
 * to Neon without losing the existing primary keys.
 *
 * Usage:
 *   cd backend
 *   DATABASE_URL=... npx tsx scripts/sync-personas-to-db.ts
 *   # Or filter by slug:
 *   DATABASE_URL=... npx tsx scripts/sync-personas-to-db.ts milton ronald
 */

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

const PERSONAS_DIR = path.resolve(process.cwd(), 'prisma', 'personas');

function extractIdentity(
  json: Record<string, unknown>,
): { name: string; tagline: string; isTemplate: boolean; role: string } | null {
  // V2 schema: identity.name / identity.tagline
  const identity = json.identity as
    | { name?: string; tagline?: string }
    | undefined;
  if (identity?.name && identity?.tagline) {
    const role =
      (json.role as string | undefined) ??
      (json.schemaVersion === 'moderator_v1' ? 'moderator' : 'debater');
    return {
      name: identity.name,
      tagline: identity.tagline,
      isTemplate: true,
      role,
    };
  }
  // V1 fallback
  const v1Name = json.name as string | undefined;
  const v1Tagline = json.tagline as string | undefined;
  if (v1Name && v1Tagline) {
    return {
      name: v1Name,
      tagline: v1Tagline,
      isTemplate: true,
      role: (json.role as string | undefined) ?? 'debater',
    };
  }
  return null;
}

async function main() {
  const filters = process.argv.slice(2).map((a) => a.toLowerCase());
  const files = fs.readdirSync(PERSONAS_DIR).filter((f) => f.endsWith('.json'));

  let updated = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    if (filters.length > 0) {
      const slug = file.replace(/\.json$/, '');
      if (!filters.some((f) => slug.includes(f))) {
        skipped++;
        continue;
      }
    }

    const raw = fs.readFileSync(path.join(PERSONAS_DIR, file), 'utf-8');
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      console.error(`  ✗ ${file} — invalid JSON: ${(err as Error).message}`);
      errors++;
      continue;
    }

    const identity = extractIdentity(json);
    if (!identity) {
      console.error(`  ✗ ${file} — could not extract name/tagline`);
      errors++;
      continue;
    }

    try {
      const existing = await prisma.persona.findFirst({
        where: { name: identity.name },
      });

      if (existing) {
        await prisma.persona.update({
          where: { id: existing.id },
          data: {
            tagline: identity.tagline,
            personaJson: json as Parameters<
              typeof prisma.persona.create
            >[0]['data']['personaJson'],
            role: identity.role,
            isTemplate: identity.isTemplate,
          },
        });
        console.log(`  ↻ updated "${identity.name}" (id=${existing.id})`);
        updated++;
      } else {
        const created = await prisma.persona.create({
          data: {
            name: identity.name,
            tagline: identity.tagline,
            personaJson: json as Parameters<
              typeof prisma.persona.create
            >[0]['data']['personaJson'],
            role: identity.role,
            isTemplate: identity.isTemplate,
          },
        });
        console.log(`  + inserted "${identity.name}" (id=${created.id})`);
        inserted++;
      }
    } catch (err) {
      console.error(`  ✗ ${identity.name} — ${(err as Error).message}`);
      errors++;
    }
  }

  console.log();
  console.log(
    `done: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${errors} errors`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
