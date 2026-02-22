import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://localhost:5432/debater?schema=public',
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const personasDir = path.join(__dirname, '..', 'prisma', 'personas');
  const files = fs.readdirSync(personasDir).filter((f) => f.endsWith('.json'));

  console.log(`Found ${files.length} persona files`);
  let updated = 0;
  let skipped = 0;
  let created = 0;

  for (const file of files) {
    const filePath = path.join(personasDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    const identity = data.identity as { name: string; tagline: string } | undefined;
    const name = identity?.name ?? data.name;
    const tagline = identity?.tagline ?? data.tagline;
    const role = data.schemaVersion === 'moderator_v1' ? 'moderator' : 'debater';

    if (!name) {
      console.log(`SKIP ${file} — no name found`);
      skipped++;
      continue;
    }

    const existing = await prisma.persona.findFirst({
      where: { name, isTemplate: true, role },
    });

    if (existing) {
      await prisma.persona.update({
        where: { id: existing.id },
        data: { personaJson: data, tagline },
      });
      console.log(`UPDATED "${name}"`);
      updated++;
    } else {
      await prisma.persona.create({
        data: { name, tagline, personaJson: data, isTemplate: true, role },
      });
      console.log(`CREATED "${name}"`);
      created++;
    }
  }

  console.log(`Done: ${updated} updated, ${created} created, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
