import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in environment');
  process.exit(1);
}

const MODEL = 'gpt-5';
const DELAY_MS = 1500; // 1.5s between calls to avoid rate limiting

interface ConversationalProfile {
  responseLength: string;
  listeningStyle: string;
  interruptionPattern: string;
  agreementStyle: string;
  disagreementStyle: string;
  energyLevel: string;
  tangentTendency: string;
  humorInConversation: string;
  silenceComfort: string;
  questionAsking: string;
  realWorldAnchoring: string;
}

function buildPrompt(persona: Record<string, unknown>): string {
  const name = (persona.identity as { name: string })?.name ?? 'Unknown';
  return `You are an expert in communication analysis and personality profiling. Given the following persona data for ${name}, generate a conversationalProfile that captures how this person ACTUALLY behaves in real conversations, interviews, panels, and podcasts.

Study their rhetoric style, voice calibration, real quotes, and known behaviors to determine:
- How long are their typical responses? Brief and punchy, or detailed and expansive?
- Do they build on others' points or redirect to their own agenda?
- How do they agree? How do they disagree?
- What's their energy level?
- Do they go on tangents or stay focused?
- Do they use humor? How?
- Are they comfortable with silence?
- Do they ask questions or make statements?
- Do they ground in real-world examples or deal in abstractions?

Be SPECIFIC and CONCRETE. Don't give generic descriptions. Reference their actual known behaviors.

Persona data:
${JSON.stringify(persona, null, 2)}

Return ONLY valid JSON matching this exact schema (all fields are required strings):
{
  "responseLength": "...",
  "listeningStyle": "...",
  "interruptionPattern": "...",
  "agreementStyle": "...",
  "disagreementStyle": "...",
  "energyLevel": "...",
  "tangentTendency": "...",
  "humorInConversation": "...",
  "silenceComfort": "...",
  "questionAsking": "...",
  "realWorldAnchoring": "..."
}`;
}

async function callOpenAI(prompt: string): Promise<ConversationalProfile> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at analyzing real-world conversational behavior. ' +
            'You output ONLY valid JSON, with no markdown fences or extra text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty content');
  }

  const parsed = JSON.parse(content) as ConversationalProfile;

  // Validate that all expected fields are present
  const requiredFields: (keyof ConversationalProfile)[] = [
    'responseLength',
    'listeningStyle',
    'interruptionPattern',
    'agreementStyle',
    'disagreementStyle',
    'energyLevel',
    'tangentTendency',
    'humorInConversation',
    'silenceComfort',
    'questionAsking',
    'realWorldAnchoring',
  ];

  for (const field of requiredFields) {
    if (typeof parsed[field] !== 'string' || parsed[field].length === 0) {
      throw new Error(`Missing or empty field: ${field}`);
    }
  }

  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const personasDir = path.join(__dirname, '..', 'prisma', 'personas');
  const files = fs
    .readdirSync(personasDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  console.log(`Found ${files.length} total persona files\n`);

  let enriched = 0;
  let skippedModerator = 0;
  let skippedExisting = 0;
  let failed = 0;

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

    // Skip moderators
    if (data.schemaVersion === 'moderator_v1' || data.role === 'moderator') {
      console.log(`  SKIP ${file} — moderator`);
      skippedModerator++;
      continue;
    }

    // Skip non-v2 schemas
    if (data.schemaVersion !== 2) {
      console.log(`  SKIP ${file} — schema version ${data.schemaVersion}`);
      failed++;
      continue;
    }

    // Skip if already has conversationalProfile
    if (data.conversationalProfile) {
      const identity = data.identity as { name: string } | undefined;
      console.log(`  SKIP ${identity?.name ?? file} — already has conversationalProfile`);
      skippedExisting++;
      continue;
    }

    const identity = data.identity as { name: string } | undefined;
    const name = identity?.name ?? file;

    try {
      console.log(`  ENRICHING "${name}"...`);
      const prompt = buildPrompt(data);
      const profile = await callOpenAI(prompt);

      // Insert conversationalProfile after vulnerabilities (or at the end)
      data.conversationalProfile = profile;

      // Write back with 2-space indent
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      console.log(`  ✓ "${name}" — done`);
      enriched++;

      // Rate limiting delay
      await sleep(DELAY_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ "${name}" — FAILED: ${msg}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log(`  Enriched:          ${enriched}`);
  console.log(`  Skipped moderator: ${skippedModerator}`);
  console.log(`  Skipped existing:  ${skippedExisting}`);
  console.log(`  Failed:            ${failed}`);
  console.log('========================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
