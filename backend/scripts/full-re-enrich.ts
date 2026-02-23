import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in environment');
  console.error('Add it to backend/.env or export ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

const MODEL = 'claude-opus-4-6';
const CONCURRENCY = 4; // Anthropic rate limits are tighter than OpenAI
const DELAY_BETWEEN_BATCHES_MS = 1000;
const MAX_TOKENS = 16384;

const SYSTEM_PROMPT =
  'You are an expert at creating deeply researched, authentic debate personas based on real public figures. ' +
  'You have encyclopedic knowledge of their speeches, interviews, writings, and public behavior. ' +
  'You output ONLY valid JSON, with no markdown fences or extra text.';

function buildPrompt(persona: Record<string, unknown>): string {
  const identity = persona.identity as { name: string } | undefined;
  const name = identity?.name ?? 'Unknown';

  return `You are an expert in political communication, debate analysis, personality profiling, and public figure research.

You are given an existing persona JSON for "${name}". Your job is to DEEPLY ENRICH every section using your knowledge of this person's real-world behavior, speeches, interviews, podcasts, debates, writings, and public record.

RULES:
1. PRESERVE these fields exactly as-is: schemaVersion, identity.name, identity.avatarUrl, identity.isRealPerson
2. ENHANCE every other field — make descriptions more specific, more concrete, more grounded in real behavior
3. FILL IN any missing optional fields that you can provide quality content for
4. Every string field should be SPECIFIC to this person — no generic descriptions that could apply to anyone
5. For realQuotes: use ACTUAL quotes from this person (from speeches, interviews, books, tweets). Verify they sound authentic.
6. For signaturePhrases: use phrases this person is ACTUALLY known for saying
7. For verbalTics: describe their ACTUAL speech patterns (filler words, cadence, etc.)
8. For formativeEnvironments: cite REAL formative experiences from their life
9. For knownStances: use their REAL publicly stated positions on specific topics relevant to their domain
10. For trackRecord: cite REAL predictions they made and whether they were right or wrong
11. For vulnerabilities: identify REAL blind spots and weak points in their arguments/worldview
12. For conversationalProfile: base it on how they ACTUALLY behave in real conversations, interviews, and panel discussions

The output must be valid JSON matching the exact same schema structure. Return the COMPLETE enriched persona — all sections, all fields.

Current persona data:
${JSON.stringify(persona, null, 2)}

Return ONLY the complete enriched JSON object. No markdown fences, no explanatory text.`;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  content: AnthropicContentBlock[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

async function callClaude(prompt: string): Promise<{ result: Record<string, unknown>; usage: { input: number; output: number } }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = (await response.json()) as AnthropicResponse;

  const textBlock = data.content.find((b) => b.type === 'text');
  if (!textBlock?.text) {
    throw new Error('Claude returned no text content');
  }

  // Strip markdown fences if Claude wraps the JSON
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(jsonText) as Record<string, unknown>;

  return {
    result: parsed,
    usage: {
      input: data.usage.input_tokens,
      output: data.usage.output_tokens,
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Validate that critical identity fields weren't changed */
function validateIdentityPreserved(
  original: Record<string, unknown>,
  enriched: Record<string, unknown>,
): void {
  const origId = original.identity as Record<string, unknown>;
  const newId = enriched.identity as Record<string, unknown>;

  if (!newId) throw new Error('Missing identity section in enriched output');
  if (newId.name !== origId.name) throw new Error(`Name changed: "${origId.name}" → "${newId.name}"`);
  if (origId.avatarUrl && newId.avatarUrl !== origId.avatarUrl) {
    newId.avatarUrl = origId.avatarUrl;
  }
}

/** Count non-empty fields in an object tree */
function countFields(obj: unknown, depth = 0): number {
  if (depth > 5) return 0;
  if (typeof obj === 'string') return obj.length > 0 ? 1 : 0;
  if (typeof obj === 'number' || typeof obj === 'boolean') return 1;
  if (Array.isArray(obj)) return obj.reduce((sum, item) => sum + countFields(item, depth + 1), 0);
  if (obj && typeof obj === 'object') {
    return Object.values(obj).reduce((sum: number, val) => sum + countFields(val, depth + 1), 0);
  }
  return 0;
}

async function main() {
  const personasDir = path.join(__dirname, '..', 'prisma', 'personas');

  // Allow filtering by specific names via CLI args
  const filterNames = process.argv.slice(2).map((n) => n.toLowerCase());

  const files = fs
    .readdirSync(personasDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  console.log(`Model: ${MODEL}`);
  console.log(`Found ${files.length} total persona files`);
  if (filterNames.length > 0) {
    console.log(`Filtering to: ${filterNames.join(', ')}`);
  }
  console.log();

  let enriched = 0;
  let skipped = 0;
  let failed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  interface EnrichJob {
    file: string;
    filePath: string;
    data: Record<string, unknown>;
    name: string;
    beforeCount: number;
  }

  const jobs: EnrichJob[] = [];

  for (const file of files) {
    const filePath = path.join(personasDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    let data: Record<string, unknown>;

    try {
      data = JSON.parse(raw);
    } catch {
      console.log(`  SKIP ${file} — invalid JSON`);
      failed++;
      continue;
    }

    if (data.schemaVersion === 'moderator_v1' || data.role === 'moderator') {
      console.log(`  SKIP ${file} — moderator`);
      skipped++;
      continue;
    }

    if (data.schemaVersion !== 2) {
      console.log(`  SKIP ${file} — schema version ${data.schemaVersion}`);
      skipped++;
      continue;
    }

    const identity = data.identity as { name: string } | undefined;
    const name = identity?.name ?? file;

    if (filterNames.length > 0) {
      const slug = file.replace('.json', '');
      const matches = filterNames.some(
        (f) => name.toLowerCase().includes(f) || slug.includes(f),
      );
      if (!matches) continue;
    }

    jobs.push({ file, filePath, data, name, beforeCount: countFields(data) });
  }

  console.log(`${jobs.length} personas to enrich (concurrency: ${CONCURRENCY})\n`);

  async function processJob(job: EnrichJob): Promise<{ ok: boolean; input: number; output: number }> {
    try {
      console.log(`  ⏳ "${job.name}" (${job.beforeCount} fields)...`);
      const prompt = buildPrompt(job.data);
      const { result: enrichedData, usage } = await callClaude(prompt);

      enrichedData.schemaVersion = 2;
      validateIdentityPreserved(job.data, enrichedData);

      const afterCount = countFields(enrichedData);
      const delta = afterCount - job.beforeCount;

      fs.writeFileSync(job.filePath, JSON.stringify(enrichedData, null, 2) + '\n', 'utf-8');
      console.log(`  ✓ "${job.name}" — done (${job.beforeCount} → ${afterCount}, ${delta >= 0 ? '+' : ''}${delta}) [${usage.input}+${usage.output} tokens]`);
      return { ok: true, input: usage.input, output: usage.output };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ "${job.name}" — FAILED: ${msg}`);
      return { ok: false, input: 0, output: 0 };
    }
  }

  const startTime = Date.now();

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(jobs.length / CONCURRENCY);
    console.log(`\n── Batch ${batchNum}/${totalBatches} (${batch.length} personas) ──`);

    const results = await Promise.all(batch.map(processJob));
    for (const r of results) {
      if (r.ok) enriched++;
      else failed++;
      totalInputTokens += r.input;
      totalOutputTokens += r.output;
    }

    if (i + CONCURRENCY < jobs.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const inputCost = (totalInputTokens / 1_000_000) * 15;
  const outputCost = (totalOutputTokens / 1_000_000) * 75;

  console.log('\n========================================');
  console.log(`  Model:    ${MODEL}`);
  console.log(`  Enriched: ${enriched}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Time:     ${elapsed}s`);
  console.log(`  Tokens:   ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`);
  console.log(`  Cost:     ~$${(inputCost + outputCost).toFixed(2)} ($${inputCost.toFixed(2)} in + $${outputCost.toFixed(2)} out)`);
  console.log('========================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
