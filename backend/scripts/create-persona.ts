import 'dotenv/config';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { researchSubject } from '../src/personas/lib/perplexity-client.js';
import { synthesizePersona, type SynthesizedPersona } from '../src/personas/lib/synthesis-client.js';
import { execSync } from 'node:child_process';

const rl = readline.createInterface({ input, output });

const PERSONAS_DIR = path.join(__dirname, '..', 'prisma', 'personas');

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function displayPersona(persona: SynthesizedPersona): void {
  console.log();
  console.log(`  Name:       ${persona.name}`);
  console.log(`  Tagline:    "${persona.tagline}"`);
  console.log(`  Style:      ${persona.style}`);
  console.log(`  Priorities: [${persona.priorities.join(', ')}]`);
  console.log(`  Background: ${persona.background}`);
  console.log(`  Tone:       ${persona.tone}`);
  console.log();
}

async function main() {
  console.log();
  console.log('  Persona Template Builder');
  console.log('  ========================');
  console.log();

  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!perplexityKey) {
    console.error('  Error: PERPLEXITY_API_KEY not set in environment.');
    process.exit(1);
  }
  if (!openaiKey) {
    console.error('  Error: OPENAI_API_KEY not set in environment.');
    process.exit(1);
  }

  const subject = await rl.question('? Subject: ');
  if (!subject.trim()) {
    console.log('  Aborted: no subject provided.');
    rl.close();
    return;
  }

  const context = await rl.question('? Context (optional): ');

  // Research phase
  process.stdout.write('\n  Researching...');
  let summary: string;
  try {
    const research = await researchSubject(
      subject.trim(),
      context.trim() || undefined,
      { apiKey: perplexityKey },
    );
    summary = research.summary;
    console.log(' done.\n');
    console.log('  --- Research Summary ---');
    console.log(`  ${summary.slice(0, 500)}${summary.length > 500 ? '...' : ''}`);
    console.log('  -----------------------\n');
  } catch (err) {
    console.log(' failed!\n');
    console.error(`  Error: ${err instanceof Error ? err.message : err}`);
    rl.close();
    return;
  }

  // Synthesis loop
  let persona: SynthesizedPersona | null = null;

  while (true) {
    const proceed = await rl.question('? Generate persona? (Y/n): ');
    if (proceed.toLowerCase() === 'n') {
      console.log('  Aborted.');
      rl.close();
      return;
    }

    process.stdout.write('  Synthesizing...');
    try {
      persona = await synthesizePersona(summary, subject.trim(), undefined, {
        apiKey: openaiKey,
      });
      console.log(' done.\n');
      displayPersona(persona);
    } catch (err) {
      console.log(' failed!\n');
      console.error(`  Error: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    // Save / regenerate / abort
    const action = await rl.question('? (s)ave / (r)egenerate / (a)bort: ');
    const choice = action.trim().toLowerCase();

    if (choice === 'a') {
      console.log('  Aborted.');
      rl.close();
      return;
    }

    if (choice === 's' && persona) {
      break;
    }

    // 'r' or anything else → loop back to generate again
    console.log('  Regenerating...\n');
  }

  if (!persona) {
    rl.close();
    return;
  }

  // Save to file
  const filename = `${toKebabCase(persona.name)}.json`;
  const filePath = path.join(PERSONAS_DIR, filename);

  if (fs.existsSync(filePath)) {
    const overwrite = await rl.question(`  File "${filename}" already exists. Overwrite? (y/N): `);
    if (overwrite.trim().toLowerCase() !== 'y') {
      console.log('  Aborted save.');
      rl.close();
      return;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(persona, null, 2) + '\n', 'utf-8');
  console.log(`\n  Saved: prisma/personas/${filename}\n`);

  // Optional DB seed
  const seed = await rl.question('? Seed into DB now? (y/N): ');
  if (seed.trim().toLowerCase() === 'y') {
    try {
      console.log('  Seeding...');
      execSync('npx ts-node prisma/seed.ts', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
      console.log('  Done!');
    } catch {
      console.error('  Seed failed. You can run it manually: npm run db:seed');
    }
  }

  console.log();
  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
