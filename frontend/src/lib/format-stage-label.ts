/**
 * Replaces stage-label role placeholders ("Side A", "Guest B") with persona names.
 * Use for stage titles where role names appear case-sensitively.
 */
export function formatStageLabel(
  label: string,
  personaAName: string,
  personaBName: string,
): string {
  return label
    .replace(/\bSide A\b/g, personaAName)
    .replace(/\bSide B\b/g, personaBName)
    .replace(/\bGuest A\b/g, personaAName)
    .replace(/\bGuest B\b/g, personaBName);
}

/**
 * Replaces every common A/B role reference in narrative prose with persona names.
 * Broader than {@link formatStageLabel}: covers case variants and additional
 * role nouns (Debater/Speaker/Participant) that show up in LLM-generated text.
 */
export function humanizeNarrativeText(
  text: string,
  personaAName: string,
  personaBName: string,
): string {
  return text
    .replace(/\bSide A\b/g, personaAName)
    .replace(/\bSide B\b/g, personaBName)
    .replace(/\bside A\b/g, personaAName)
    .replace(/\bside B\b/g, personaBName)
    .replace(/\bGuest A\b/g, personaAName)
    .replace(/\bGuest B\b/g, personaBName)
    .replace(/\bguest A\b/g, personaAName)
    .replace(/\bguest B\b/g, personaBName)
    .replace(/\bDebater A\b/g, personaAName)
    .replace(/\bDebater B\b/g, personaBName)
    .replace(/\bdebater A\b/g, personaAName)
    .replace(/\bdebater B\b/g, personaBName)
    .replace(/\bSpeaker A\b/g, personaAName)
    .replace(/\bSpeaker B\b/g, personaBName)
    .replace(/\bspeaker A\b/g, personaAName)
    .replace(/\bspeaker B\b/g, personaBName)
    .replace(/\bParticipant A\b/g, personaAName)
    .replace(/\bParticipant B\b/g, personaBName);
}
