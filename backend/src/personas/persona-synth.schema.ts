import { z } from 'zod';

export const SynthesizedPersonaSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  style: z.string().min(1),
  priorities: z.array(z.string().min(1)).min(1),
  background: z.string().min(1),
  tone: z.string().min(1),
});

export type SynthesizedPersona = z.infer<typeof SynthesizedPersonaSchema>;
