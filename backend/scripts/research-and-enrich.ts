/**
 * Two-stage persona enrichment:
 *   1. Perplexity Sonar — fetches fresh web research about the persona:
 *      specific quotes, recent public positions, signature rhetorical moves,
 *      verbal patterns observable in interviews / podcasts / speeches.
 *   2. Claude Opus 4.6 — takes the existing persona JSON plus the Perplexity
 *      research and produces a deeply enriched PersonaV2 JSON, preserving
 *      identity.name / identity.avatarUrl / schemaVersion / isRealPerson.
 *
 * Usage:
 *   cd backend
 *   # All personas:
 *   npx tsx scripts/research-and-enrich.ts
 *   # Subset by slug or name fragment:
 *   npx tsx scripts/research-and-enrich.ts milton-friedman reagan burke
 *   # Skip personas that already have substantial voice data:
 *   npx tsx scripts/research-and-enrich.ts --thin-only
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!PERPLEXITY_KEY) throw new Error('PERPLEXITY_API_KEY missing');
if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY missing');

const CLAUDE_MODEL = 'claude-opus-4-6';
const PERPLEXITY_MODEL = 'sonar';
const CONCURRENCY = 2; // Be gentle — Perplexity is rate-limited and Opus is expensive per call
const BATCH_DELAY_MS = 1500;
const CLAUDE_MAX_TOKENS = 16384;

const PERSONAS_DIR = path.resolve(process.cwd(), 'prisma', 'personas');

/** Build a tight Perplexity query that targets the fields missing in thin personas. */
function buildResearchQuery(name: string): string {
  return `Research ${name} as a debate persona for an AI simulator. I need SPECIFIC, SOURCED material I can use for an authentic voice model:

1. REAL QUOTES (5-10): actual quotes from speeches, interviews, books, op-eds, podcasts. Include the source / year when possible.
2. SIGNATURE PHRASES: phrases this person is KNOWN for saying repeatedly across their career.
3. VERBAL TICS: their characteristic speech patterns in live conversation (filler words, cadence, opener habits, catchphrases).
4. KNOWN STANCES on specific topics: list 8-12 topics where they have a well-documented public position, and state that position concisely.
5. RHETORICAL MOVES: their characteristic debate techniques (Socratic questioning, personal anecdote, historical analogy, etc).
6. FORMATIVE EXPERIENCES: the specific biographical moments that shaped their worldview.
7. TRACK RECORD: specific predictions they've made publicly, and whether they were proven right or wrong.
8. BLIND SPOTS / VULNERABILITIES: areas where their arguments tend to be weakest or where they're known to hedge.

Be SPECIFIC. Cite particular books, interviews, debates, and episodes. Do not summarize abstractly — quote exact phrases where you can. Be thorough but concise. Prioritize verifiable material over speculation.`;
}

async function perplexityResearch(name: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PERPLEXITY_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a research assistant preparing material for an AI persona simulator. Return the raw research, not a polished essay. Prefer quotes and specifics over generalities.',
        },
        { role: 'user', content: buildResearchQuery(name) },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Perplexity ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? '';
}

function buildEnrichmentPrompt(
  persona: Record<string, unknown>,
  research: string,
): string {
  const identity = persona.identity as { name?: string } | undefined;
  const name = identity?.name ?? 'Unknown';
  return `You are an expert in political communication, debate analysis, and public-figure profiling.

You are given (A) an existing persona JSON for "${name}" and (B) fresh web research from Perplexity. Your job is to produce a DEEPLY ENRICHED persona JSON by merging and expanding both sources.

# CRITICAL: OUTPUT MUST MATCH THIS EXACT SCHEMA SHAPE
Return a single JSON object with EXACTLY these top-level keys and no others:

{
  "schemaVersion": 2,
  "identity": {
    "name": string (PRESERVE EXACTLY),
    "tagline": string,
    "isRealPerson": boolean (PRESERVE),
    "avatarUrl": string (PRESERVE if present),
    "biography": {
      "summary": string,
      "formativeEnvironments": string[],
      "incentiveStructures": string[]
    }
  },
  "positions": {
    "priorities": string[],
    "knownStances": { [topicSlug: string]: string },
    "principles": string[],
    "riskTolerance": string,
    "defaultLenses": string[],
    "firstAttackPatterns": string[]
  },
  "rhetoric": {
    "style": string,
    "tone": string,
    "rhetoricalMoves": string[],
    "argumentStructure": string[],
    "timeHorizon": string,
    "signaturePhrases": string[],
    "vocabularyRegister": string,
    "metaphorDomains": string[],
    "sentenceRhythm": string,
    "qualifierUsage": string,
    "emotionalValence": string
  },
  "voiceCalibration": {
    "realQuotes": string[],
    "sentencePatterns": string,
    "verbalTics": string,
    "responseOpeners": string[],
    "transitionPhrases": string[],
    "emphasisMarkers": string[],
    "underPressure": string,
    "whenAgreeing": string,
    "whenDismissing": string,
    "distinctiveVocabulary": string[],
    "registerMixing": string
  },
  "epistemology": {
    "preferredEvidence": string[],
    "citationStyle": string,
    "disagreementResponse": string,
    "uncertaintyLanguage": string,
    "trackRecord": string[],
    "mindChanges": string[],
    "qaStyle": string,
    "criticismResponse": string,
    "audienceConsistency": string
  },
  "vulnerabilities": {
    "blindSpots": string[],
    "tabooTopics": string[],
    "disclaimedAreas": string[],
    "hedgingTopics": string[]
  },
  "conversationalProfile": {
    "responseLength": string,
    "listeningStyle": string,
    "interruptionPattern": string,
    "agreementStyle": string,
    "disagreementStyle": string,
    "energyLevel": string,
    "tangentTendency": string,
    "humorInConversation": string,
    "silenceComfort": string,
    "questionAsking": string,
    "realWorldAnchoring": string
  }
}

DO NOT add any top-level keys beyond these eight (schemaVersion, identity, positions, rhetoric, voiceCalibration, epistemology, vulnerabilities, conversationalProfile). Fields like trackRecord belong INSIDE epistemology, not at the top level.

# CONTENT RULES
1. PRESERVE EXACTLY: schemaVersion (=2), identity.name, identity.avatarUrl, identity.isRealPerson
2. Every string must be SPECIFIC to this person — no generic descriptions that could apply to anyone
3. voiceCalibration.realQuotes: 8-12 ACTUAL quotes from this person, verifiable against the research block. Do NOT invent quotes.
4. rhetoric.signaturePhrases: 8-12 phrases this person is documented as saying REPEATEDLY across their career
5. voiceCalibration.responseOpeners: 6-10 phrases this person actually uses to START a response (from interviews, debates, speeches). NEVER include generic LLM openers like "Look,", "Here's the thing,", "Well, the fact is,", "So,". If you don't know this person's authentic openers, leave the array shorter rather than fake it.
6. voiceCalibration.verbalTics: describe ACTUAL speech patterns — specific filler words, cadence, characteristic phrases that recur
7. positions.knownStances: 8-12 topic → stance entries covering domains relevant to this person
8. epistemology.trackRecord: 4-8 concrete predictions they made publicly, with outcome ("predicted X in 1985; proven correct when Y happened in 1990")
9. vulnerabilities.blindSpots: 3-5 substantive analytical weaknesses (not "they care too much")
10. identity.biography.formativeEnvironments and incentiveStructures: 4-8 each, specific biographical moments

# OUTPUT
Return ONLY the complete enriched JSON object. No markdown fences, no explanation. It must match the schema shape above exactly.

# EXISTING PERSONA
${JSON.stringify(persona, null, 2)}

# FRESH PERPLEXITY RESEARCH
${research}

Return the enriched JSON now.`;
}

interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
}

async function claudeEnrich(
  persona: Record<string, unknown>,
  research: string,
): Promise<{ enriched: Record<string, unknown>; usage: ClaudeUsage }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system:
        'You are an expert at creating deeply researched, authentic debate personas based on real public figures. You have encyclopedic knowledge of their speeches, interviews, writings, and public behavior. You output ONLY valid JSON, with no markdown fences or extra text.',
      messages: [
        { role: 'user', content: buildEnrichmentPrompt(persona, research) },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
    usage: ClaudeUsage;
  };
  const text = data.content.find((c) => c.type === 'text')?.text?.trim() ?? '';
  let cleaned = text;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  return { enriched: parsed, usage: data.usage };
}

function validateIdentityPreserved(
  original: Record<string, unknown>,
  enriched: Record<string, unknown>,
): void {
  const origId = original.identity as Record<string, unknown>;
  const newId = enriched.identity as Record<string, unknown> | undefined;
  if (!newId) throw new Error('missing identity in enriched output');
  if (newId.name !== origId.name) {
    throw new Error(`name changed: "${origId.name}" → "${newId.name}"`);
  }
  if (origId.avatarUrl && newId.avatarUrl !== origId.avatarUrl) {
    newId.avatarUrl = origId.avatarUrl; // restore
  }
  enriched.schemaVersion = 2;
}

/** Recursive field counter — used to verify enrichment actually added content. */
function countFields(obj: unknown, depth = 0): number {
  if (depth > 6) return 0;
  if (typeof obj === 'string') return obj.length > 0 ? 1 : 0;
  if (typeof obj === 'number' || typeof obj === 'boolean') return 1;
  if (Array.isArray(obj)) {
    return obj.reduce<number>((s, x) => s + countFields(x, depth + 1), 0);
  }
  if (obj && typeof obj === 'object') {
    return Object.values(obj).reduce<number>(
      (s, v) => s + countFields(v, depth + 1),
      0,
    );
  }
  return 0;
}

async function processOne(file: string): Promise<{
  name: string;
  status: 'ok' | 'failed';
  before: number;
  after?: number;
  error?: string;
  usage?: { perplexityChars: number; claudeIn: number; claudeOut: number };
}> {
  const filePath = path.join(PERSONAS_DIR, file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, unknown>;
  const name =
    (data.identity as { name?: string } | undefined)?.name ?? file;
  const before = countFields(data);

  try {
    const research = await perplexityResearch(name);
    const { enriched, usage } = await claudeEnrich(data, research);
    validateIdentityPreserved(data, enriched);
    fs.writeFileSync(
      filePath,
      JSON.stringify(enriched, null, 2) + '\n',
      'utf-8',
    );
    const after = countFields(enriched);
    return {
      name,
      status: 'ok',
      before,
      after,
      usage: {
        perplexityChars: research.length,
        claudeIn: usage.input_tokens,
        claudeOut: usage.output_tokens,
      },
    };
  } catch (err) {
    return {
      name,
      status: 'failed',
      before,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const thinOnly = args.includes('--thin-only');
  const filters = args.filter((a) => !a.startsWith('--'));

  const files = fs.readdirSync(PERSONAS_DIR).filter((f) => f.endsWith('.json'));

  const targets: string[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(PERSONAS_DIR, file), 'utf-8');
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }

    // Only V2 debate personas — moderators use a different schema
    if (data.schemaVersion !== 2 || data.role === 'moderator') {
      continue;
    }

    if (filters.length > 0) {
      const slug = file.replace(/\.json$/, '');
      const ident = data.identity as { name?: string } | undefined;
      const nameLc = (ident?.name ?? '').toLowerCase();
      const match = filters.some(
        (f) =>
          slug.includes(f.toLowerCase()) || nameLc.includes(f.toLowerCase()),
      );
      if (!match) continue;
    }

    if (thinOnly) {
      // A persona is "thin" if it has no voiceCalibration or fewer than 4 signaturePhrases
      const rhetoric = data.rhetoric as
        | { signaturePhrases?: unknown[] }
        | undefined;
      const hasVoice =
        (data.voiceCalibration as unknown) &&
        typeof data.voiceCalibration === 'object';
      const phraseCount = rhetoric?.signaturePhrases?.length ?? 0;
      if (hasVoice && phraseCount >= 4) continue;
    }

    targets.push(file);
  }

  console.log(`model: ${CLAUDE_MODEL} · research: ${PERPLEXITY_MODEL}`);
  console.log(`targets: ${targets.length}`);
  if (filters.length) console.log(`  filter: ${filters.join(', ')}`);
  if (thinOnly) console.log(`  thin-only mode`);
  console.log();

  let ok = 0;
  let fail = 0;
  let totalClaudeIn = 0;
  let totalClaudeOut = 0;
  const startedAt = Date.now();

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const batchN = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(targets.length / CONCURRENCY);
    console.log(`── batch ${batchN}/${totalBatches} ──`);

    const results = await Promise.all(batch.map(processOne));
    for (const r of results) {
      if (r.status === 'ok' && r.after !== undefined) {
        ok++;
        totalClaudeIn += r.usage?.claudeIn ?? 0;
        totalClaudeOut += r.usage?.claudeOut ?? 0;
        const delta = r.after - r.before;
        console.log(
          `  ✓ ${r.name}  ${r.before} → ${r.after} (+${delta}) · pplx=${r.usage?.perplexityChars}ch · claude=${r.usage?.claudeIn}+${r.usage?.claudeOut}`,
        );
      } else {
        fail++;
        console.log(`  ✗ ${r.name} — ${r.error}`);
      }
    }

    if (i + CONCURRENCY < targets.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  // Opus 4.6 pricing: $15/1M input, $75/1M output
  const costUsd =
    (totalClaudeIn / 1_000_000) * 15 + (totalClaudeOut / 1_000_000) * 75;

  console.log();
  console.log('═══════════════════════════════════════');
  console.log(`  ok:      ${ok}`);
  console.log(`  failed:  ${fail}`);
  console.log(`  time:    ${elapsedSec}s`);
  console.log(
    `  claude:  ${totalClaudeIn.toLocaleString()} in / ${totalClaudeOut.toLocaleString()} out  (~$${costUsd.toFixed(2)})`,
  );
  console.log('═══════════════════════════════════════');
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
