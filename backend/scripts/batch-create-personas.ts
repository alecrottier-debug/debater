/**
 * Batch persona creator — runs Perplexity research + OpenAI synthesis
 * for all people who don't yet have a persona JSON file.
 *
 * Usage: cd backend && npx tsx scripts/batch-create-personas.ts
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { researchSubject } from '../src/personas/lib/perplexity-client.js';
import { synthesizePersona } from '../src/personas/lib/synthesis-client.js';
import type { PersonaV2, SynthesizedPersona } from '../src/personas/lib/synthesis-client.js';

// Script is run from the backend/ directory: `cd backend && npx tsx scripts/batch-create-personas.ts`
const PERSONAS_DIR = path.resolve(process.cwd(), 'prisma', 'personas');

function toKebab(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// 10 conservative thinkers / leaders / podcasters (April 2026 batch)
const PEOPLE: string[] = [
  'Edmund Burke',
  'William F. Buckley Jr.',
  'Ronald Reagan',
  'Russell Kirk',
  'Ben Shapiro',
  'Thomas Sowell',
  'Jordan Peterson',
  'Tucker Carlson',
  'Milton Friedman',
  'George Will',
];

async function main() {
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!perplexityKey) {
    console.error('Error: PERPLEXITY_API_KEY not set');
    process.exit(1);
  }
  if (!openaiKey) {
    console.error('Error: OPENAI_API_KEY not set');
    process.exit(1);
  }

  // Filter to only those without existing JSON
  const toCreate = PEOPLE.filter((name) => {
    const filePath = path.join(PERSONAS_DIR, `${toKebab(name)}.json`);
    return !fs.existsSync(filePath);
  });

  console.log(`\nPersonas to create: ${toCreate.length} / ${PEOPLE.length}`);
  console.log(`Already exist: ${PEOPLE.length - toCreate.length}\n`);

  let created = 0;
  let failed = 0;

  for (let i = 0; i < toCreate.length; i++) {
    const name = toCreate[i];
    const kebab = toKebab(name);
    const filePath = path.join(PERSONAS_DIR, `${kebab}.json`);

    console.log(`[${i + 1}/${toCreate.length}] ${name}`);

    // Research
    let summary: string;
    try {
      process.stdout.write('  Researching... ');
      const research = await researchSubject(name, undefined, {
        apiKey: perplexityKey,
      });
      summary = research.summary;
      console.log('done');
    } catch (err) {
      console.log('FAILED');
      console.error(`  Error: ${err instanceof Error ? err.message : err}`);
      failed++;
      await sleep(2000);
      continue;
    }

    // Synthesize
    let persona: PersonaV2 | SynthesizedPersona;
    try {
      process.stdout.write('  Synthesizing... ');
      persona = await synthesizePersona(summary, name, name, {
        apiKey: openaiKey,
      });
      console.log('done');
    } catch (err) {
      console.log('FAILED');
      console.error(`  Error: ${err instanceof Error ? err.message : err}`);
      failed++;
      await sleep(2000);
      continue;
    }

    // Set avatarUrl
    const personaObj = persona as Record<string, unknown>;
    if ('identity' in personaObj && typeof personaObj.identity === 'object') {
      (personaObj.identity as Record<string, unknown>).avatarUrl = `/avatars/${kebab}.png`;
    }

    // Save
    fs.writeFileSync(filePath, JSON.stringify(persona, null, 2) + '\n', 'utf-8');
    console.log(`  Saved: ${kebab}.json`);
    created++;

    // Rate limit pause (1.5s between calls)
    if (i < toCreate.length - 1) {
      await sleep(1500);
    }
  }

  console.log(`\nDone! Created: ${created}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
