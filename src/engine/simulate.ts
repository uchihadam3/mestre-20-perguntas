import type { Answer, Game, Question, Target } from '../domain/types';
import { attribute } from '../data/questions';
import { answerGame, choose, newGame } from './inference';

export type Benchmark = {
  label: string;
  sample: number;
  wins: number;
  within5: number;
  within10: number;
  within15: number;
  meanWin: number | null;
};
export function simulate(
  targets: Target[],
  questions: Question[],
  method: 'adaptive' | 'fixed',
  sample = 12,
): Benchmark {
  const selected = Array.from(
    { length: Math.min(sample, targets.length) },
    (_, i) => targets[Math.floor((i * targets.length) / Math.min(sample, targets.length))],
  );
  const results: Game[] = selected.map((target, i) => {
    let game = newGame(`sim-${method}-${i}`);
    for (let step = 0; step < 20 && game.status === 'playing'; step++) {
      const action = choose(game, targets, method === 'adaptive' ? questions : questions.slice(0, 18));
      if (!action) break;
      const fixed =
        method === 'fixed' && action.kind === 'question'
          ? questions
              .slice(0, 18)
              .find((q) => !game.actions.some((a) => a.kind === 'answer' && a.questionId === q.id))
          : undefined;
      const selected = fixed ? { kind: 'question' as const, question: fixed, gain: 0 } : action;
      game = answerGame(
        game,
        selected,
        selected.kind === 'guess'
          ? selected.target.id === target.id
          : ((attribute(target, selected.question) === 'unknown'
              ? 'dont_know'
              : attribute(target, selected.question)) as Answer),
      );
    }
    return game;
  });
  const wins = results.filter((r) => r.status === 'won');
  return {
    label: method === 'adaptive' ? 'Ganho de informação' : 'Perguntas fixas (18 primeiras)',
    sample: selected.length,
    wins: wins.length,
    within5: wins.filter((r) => r.actions.length <= 5).length,
    within10: wins.filter((r) => r.actions.length <= 10).length,
    within15: wins.filter((r) => r.actions.length <= 15).length,
    meanWin: wins.length ? wins.reduce((n, r) => n + r.actions.length, 0) / wins.length : null,
  };
}
