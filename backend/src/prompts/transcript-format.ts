/**
 * Shared helper for rendering a transcript into the LLM prompt with
 * human-readable stage labels (e.g. "Sam Altman · Opening") instead of
 * leaking internal stage IDs like `A_OPEN` into generated prose.
 *
 * The stage IDs still appear in structured fields like `callbacks` and
 * ballot `refs` so clients can link back — but the LLM no longer has
 * them visible as the default way to reference a turn.
 */

const STAGE_ACTIONS: Record<string, string> = {
  MOD_SETUP: 'Setup',
  MOD_INTRO: 'Introduction',
  MOD_Q1: 'First Question',
  MOD_Q2: 'Follow-up Question',
  MOD_SYNTHESIS: 'Synthesis',
  MOD_WRAP: 'Wrap-up',
  A_OPEN: 'Opening',
  B_OPEN: 'Opening',
  A_CHALLENGE: 'Challenge',
  A_COUNTER: 'Counter',
  B_COUNTER: 'Counter',
  A_CLOSE: 'Closing',
  B_CLOSE: 'Closing',
  A_RESPOND_1: 'Response',
  B_RESPOND_1: 'Response',
  A_RESPOND_2: 'Follow-up',
  B_RESPOND_2: 'Follow-up',
  A_FINAL: 'Final Thought',
  JUDGE: 'Verdict',
};

export function stageActionLabel(stageId: string): string {
  return (
    STAGE_ACTIONS[stageId] ??
    stageId
      .replace(/^[AB]_/, '')
      .replace(/^MOD_/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * "Sam Altman · Opening" — used as the per-turn header in transcript strings
 * fed to the LLM. Moderator and Judge rows use role labels, not names.
 */
export function speakerHeader(
  speaker: string,
  stageId: string,
  nameA: string,
  nameB: string,
): string {
  const action = stageActionLabel(stageId);
  switch (speaker) {
    case 'A':
      return `${nameA} · ${action}`;
    case 'B':
      return `${nameB} · ${action}`;
    case 'MOD':
      return `Moderator · ${action}`;
    case 'JUDGE':
      return `Judge · ${action}`;
    default:
      return `${speaker} · ${action}`;
  }
}

export function extractPersonaName(
  persona: Record<string, unknown>,
  fallback: string,
): string {
  const identity = persona.identity as Record<string, unknown> | undefined;
  return ((identity?.name ?? persona.name ?? fallback) as string).trim();
}
