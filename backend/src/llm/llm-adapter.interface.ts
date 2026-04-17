import {
  DebaterOutput,
  ModeratorOutput,
  JudgeOutput,
  CrossExOutput,
  DiscussionWrapOutput,
} from './llm-schemas.js';

export interface LlmPrompt {
  system: string;
  user: string;
}

/**
 * Called incrementally as the model emits the `narrative` field.
 * `text` is the cumulative narrative content so far (not just the new delta).
 */
export type NarrativeStreamHandler = (text: string) => void;

export interface LlmAdapter {
  generateModeratorTurn(
    prompt: LlmPrompt,
    onNarrative?: NarrativeStreamHandler,
  ): Promise<ModeratorOutput>;
  generateDebaterTurn(
    prompt: LlmPrompt,
    speaker: 'A' | 'B',
    onNarrative?: NarrativeStreamHandler,
  ): Promise<DebaterOutput>;
  generateJudgeDecision(prompt: LlmPrompt): Promise<JudgeOutput>;
  generateCrossExTurn(
    prompt: LlmPrompt,
    speaker: 'A' | 'B',
  ): Promise<CrossExOutput>;
  generateDiscussionWrap(
    prompt: LlmPrompt,
    onNarrative?: NarrativeStreamHandler,
  ): Promise<DiscussionWrapOutput>;
  /** Generic text completion for classifiers etc. */
  generateText(prompt: LlmPrompt): Promise<string>;
}

export const LLM_ADAPTER = Symbol('LLM_ADAPTER');
