export type Speaker = 'MOD' | 'A' | 'B' | 'JUDGE';

export interface BulletRange {
  min: number;
  max: number;
}

export interface StageConfig {
  id: string;
  label: string;
  speaker: Speaker;
  maxWords: number | null;
  bullets: BulletRange | null;
  questionRequired: boolean;
  questionCount: number;
}

export interface StagePlan {
  mode: string;
  stages: StageConfig[];
}
