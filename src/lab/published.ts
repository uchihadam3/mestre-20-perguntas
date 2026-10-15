import type { Game, Question, Target } from '../domain/types';
import { choose, informationGain, posterior, separation, type Choice } from '../engine/inference';
import { isQuestionAllowed } from '../engine/logic';
import strategy from './strategy.json';
import type { Opening } from './autonomous';

const active: { version: string; policy: 'current' | 'planned'; opening: Opening | null; reviewed: boolean } =
  strategy as { version: string; policy: 'current' | 'planned'; opening: Opening | null; reviewed: boolean };

/** Only an explicitly reviewed, committed strategy can affect human games. */
export function publishedChoice(game: Game, targets: Target[], questions: Question[]): Choice | null {
  const safe = choose(game, targets, questions);
  if (!active.reviewed || safe?.kind === 'guess' || active.policy !== 'planned' || !active.opening)
    return safe;
  // A candidate report never changes this file automatically. When a reviewed
  // opening is committed, keep the exact same guess policy and logical gates.
  const opening = active.opening;
  const first = game.actions[0];
  const id =
    game.actions.length === 0
      ? opening.first
      : game.actions.length === 1 && first?.kind === 'answer'
        ? opening.branches.find((branch) => branch.answer === first.answer)?.next
        : null;
  const question = questions.find((q) => q.id === id);
  if (!question || !isQuestionAllowed(game, question)) return safe;
  const dist = posterior(game, targets, questions);
  const gain = informationGain(dist, targets, question);
  return gain >= 0.0005 && separation(dist, targets, question) > 1e-12
    ? { kind: 'question', question, gain }
    : safe;
}

export const strategyVersion = active.version;
