import { DebaterOutput, ModeratorOutput, JudgeOutput, CrossExOutput } from './llm-schemas.js';

export interface LlmPrompt {
  system: string;
  user: string;
}

export interface LlmAdapter {
  generateModeratorTurn(prompt: LlmPrompt): Promise<ModeratorOutput>;
  generateDebaterTurn(prompt: LlmPrompt, speaker: 'A' | 'B'): Promise<DebaterOutput>;
  generateJudgeDecision(prompt: LlmPrompt): Promise<JudgeOutput>;
  generateCrossExTurn(prompt: LlmPrompt, speaker: 'A' | 'B'): Promise<CrossExOutput>;
  /** Generic text completion for classifiers etc. */
  generateText(prompt: LlmPrompt): Promise<string>;
}

export const LLM_ADAPTER = Symbol('LLM_ADAPTER');
