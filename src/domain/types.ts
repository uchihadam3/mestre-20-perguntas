export type TargetType = 'real' | 'fictional' | 'group';
export type Answer = 'yes' | 'no' | 'maybe' | 'dont_know';
export type AttributeValue = 'yes' | 'no' | 'unknown';
export type Target = {
  id: string;
  name: string;
  type: TargetType;
  origin: string;
  fameTier: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  aliases: string[];
  provenance: string;
  confidence: 'curated' | 'unverified';
  popularity: { br: number; us: number; global: number; source: string };
};
export type Question = {
  id: string;
  text: string;
  tag: string;
  description: string;
  cost: number;
  unknownRate: number;
  applicable?: TargetType[];
  explicit?: boolean;
};
export type GameAction =
  | { kind: 'answer'; questionId: string; answer: Answer }
  | { kind: 'guess'; targetId: string; accepted: boolean };
export type Game = {
  id: string;
  actions: GameAction[];
  status: 'playing' | 'won' | 'lost';
  startedAt: number;
  endedAt?: number;
  lastGuess?: string;
};
export type TrainingRecord = {
  correct: number;
  total: number;
  dueAt: number;
  interval: number;
  delayed?: number;
  lastRewardDate?: string;
};
export type Profile = {
  xp: number;
  games: number;
  wins: number;
  best: number | null;
  medals: Record<string, number>;
  training: Record<string, TrainingRecord>;
  daily: { date: string; count: number; claimed: boolean; ids?: string[] };
  dailyCompleted: number;
  history: { actions: number; win: boolean; date: string }[];
  sound: boolean;
  motion: boolean;
};
