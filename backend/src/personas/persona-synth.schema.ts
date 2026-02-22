import { z } from 'zod';

// ── V1 schema (kept for backward compat) ──────────────────────────
export const SynthesizedPersonaSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  style: z.string().min(1),
  priorities: z.array(z.string().min(1)).min(1),
  background: z.string().min(1),
  tone: z.string().min(1),
});

export type SynthesizedPersona = z.infer<typeof SynthesizedPersonaSchema>;

// ── V2 schema ──────────────────────────────────────────────────────

const BiographySchema = z.object({
  summary: z.string().min(1),
  formativeEnvironments: z.array(z.string()).optional(),
  incentiveStructures: z.array(z.string()).optional(),
});

const IdentitySchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  avatarUrl: z.string().optional(),
  isRealPerson: z.boolean(),
  biography: BiographySchema,
});

const PositionsSchema = z.object({
  priorities: z.array(z.string().min(1)).min(1),
  knownStances: z.record(z.string(), z.string()).optional(),
  principles: z.array(z.string()).optional(),
  riskTolerance: z.string().optional(),
  defaultLenses: z.array(z.string()).optional(),
  firstAttackPatterns: z.array(z.string()).optional(),
});

const RhetoricSchema = z.object({
  style: z.string().min(1),
  tone: z.string().min(1),
  rhetoricalMoves: z.array(z.string()).optional(),
  argumentStructure: z.array(z.string()).optional(),
  timeHorizon: z.string().optional(),
  signaturePhrases: z.array(z.string()).optional(),
  vocabularyRegister: z.string().optional(),
  metaphorDomains: z.array(z.string()).optional(),
  sentenceRhythm: z.string().optional(),
  qualifierUsage: z.string().optional(),
  emotionalValence: z.string().optional(),
});

const VoiceCalibrationSchema = z.object({
  realQuotes: z.array(z.string()).optional(),
  sentencePatterns: z.string().optional(),
  verbalTics: z.string().optional(),
  responseOpeners: z.array(z.string()).optional(),
  transitionPhrases: z.array(z.string()).optional(),
  emphasisMarkers: z.array(z.string()).optional(),
  underPressure: z.string().optional(),
  whenAgreeing: z.string().optional(),
  whenDismissing: z.string().optional(),
  distinctiveVocabulary: z.array(z.string()).optional(),
  registerMixing: z.string().optional(),
});

const EpistemologySchema = z.object({
  preferredEvidence: z.array(z.string()).optional(),
  citationStyle: z.string().optional(),
  disagreementResponse: z.string().optional(),
  uncertaintyLanguage: z.string().optional(),
  trackRecord: z.array(z.string()).optional(),
  mindChanges: z.array(z.string()).optional(),
  qaStyle: z.string().optional(),
  criticismResponse: z.string().optional(),
  audienceConsistency: z.string().optional(),
});

const VulnerabilitiesSchema = z.object({
  blindSpots: z.array(z.string()).optional(),
  tabooTopics: z.array(z.string()).optional(),
  disclaimedAreas: z.array(z.string()).optional(),
  hedgingTopics: z.array(z.string()).optional(),
});

export const PersonaV2Schema = z.object({
  schemaVersion: z.literal(2),
  identity: IdentitySchema,
  positions: PositionsSchema,
  rhetoric: RhetoricSchema,
  voiceCalibration: VoiceCalibrationSchema.optional(),
  epistemology: EpistemologySchema.optional(),
  vulnerabilities: VulnerabilitiesSchema.optional(),
});

export type PersonaV2 = z.infer<typeof PersonaV2Schema>;

// ── Moderator V1 schema ─────────────────────────────────────────────

const ModeratorBiographySchema = z.object({
  summary: z.string().min(1),
  era: z.string().optional(),
  format: z.string().optional(),
  notableInterviews: z.array(z.string()).optional(),
});

const ModeratorIdentitySchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  avatarUrl: z.string().optional(),
  isRealPerson: z.boolean(),
  biography: ModeratorBiographySchema,
});

const InterviewStyleSchema = z.object({
  approach: z.string().min(1),
  tone: z.string().min(1),
  pacing: z.string().optional(),
  preparationLevel: z.string().optional(),
  relationshipToGuest: z.string().optional(),
});

const QuestionStrategySchema = z.object({
  openingStyle: z.string().optional(),
  followUpPattern: z.string().optional(),
  probeTargets: z.array(z.string()).optional(),
  questionStructure: z.string().optional(),
  silenceUsage: z.string().optional(),
});

const SignatureMoveSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  confrontationThreshold: z.number().min(1).max(5),
});

const ConfrontationLevelSchema = z.object({
  demeanor: z.string(),
  questionStyle: z.string(),
  interruptionFrequency: z.string(),
  responseToEvasion: z.string(),
  overallGoal: z.string(),
});

const ConfrontationProfileSchema = z.object({
  baselineLevel: z.number().min(1).max(5),
  level1: ConfrontationLevelSchema.optional(),
  level2: ConfrontationLevelSchema.optional(),
  level3: ConfrontationLevelSchema.optional(),
  level4: ConfrontationLevelSchema.optional(),
  level5: ConfrontationLevelSchema.optional(),
});

const ModeratorRhetoricSchema = z.object({
  vocabularyRegister: z.string().optional(),
  signaturePhrases: z.array(z.string()).optional(),
  humorUsage: z.string().optional(),
  metaphorDomains: z.array(z.string()).optional(),
  sentenceRhythm: z.string().optional(),
});

export const ModeratorPersonaV1Schema = z.object({
  schemaVersion: z.literal('moderator_v1'),
  role: z.literal('moderator'),
  identity: ModeratorIdentitySchema,
  interviewStyle: InterviewStyleSchema,
  questionStrategy: QuestionStrategySchema.optional(),
  signatureMoves: z.array(SignatureMoveSchema).optional(),
  confrontationProfile: ConfrontationProfileSchema,
  rhetoric: ModeratorRhetoricSchema.optional(),
});

export type ModeratorPersonaV1 = z.infer<typeof ModeratorPersonaV1Schema>;
