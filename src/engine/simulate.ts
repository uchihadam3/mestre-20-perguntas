import type { Answer, Game, Question, Target } from '../domain/types';
import { attribute } from '../data/questions';
import { answerGame, choose, newGame, posterior, separation } from './inference';
import { analyzeFacts } from './logic';

export type Benchmark = {
  label: string;
  sample: number;
  wins: number;
  within5: number;
  within10: number;
  within15: number;
  meanWin: number | null;
  meanQuestions: number;
  stoppedEarly: number;
  wasted: number;
  weak: number;
  contradictions: number;
};
// Fixed fixture keeps release-to-release comparisons meaningful as the catalog grows.
const referenceNames = [
  'Pelé',
  'Kobe Bryant',
  'Billie Eilish',
  'Chico Buarque',
  'Scarlett Johansson',
  'Silvio Santos',
  'Albert Einstein',
  'Homer Simpson',
  'Coringa',
  'Lord Voldemort',
  'Goku',
  'Cebolinha',
];
export function simulate(
  targets: Target[],
  questions: Question[],
  method: 'adaptive' | 'fixed',
  sample = 12,
  oracle: 'strict' | 'editorial' = 'strict',
  cohort: 'reference' | 'spaced' | 'holdout' = 'reference',
  depth: 1 | 2 = 1,
): Benchmark {
  const reference = referenceNames.map((name) => targets.find((t) => t.name === name));
  const selected =
    cohort === 'reference' && sample === 12 && reference.every(Boolean)
      ? (reference as Target[])
      : cohort === 'holdout'
        ? targets
            .filter((target, index) => index % 5 === 3 && !referenceNames.includes(target.name))
            .slice(0, sample)
        : Array.from(
            { length: Math.min(sample, targets.length) },
            (_, i) => targets[Math.floor((i * targets.length) / Math.min(sample, targets.length))],
          );
  let wasted = 0;
  let weak = 0;
  let contradictions = 0;
  const results: Game[] = selected.map((target, i) => {
    let game = newGame(`sim-${method}-${i}`);
    for (let step = 0; step < 20 && game.status === 'playing'; step++) {
      const action = choose(game, targets, method === 'adaptive' ? questions : questions.slice(0, 18), depth);
      if (!action) break;
      const fixed =
        method === 'fixed' && action.kind === 'question'
          ? questions
              .slice(0, 18)
              .find((q) => !game.actions.some((a) => a.kind === 'answer' && a.questionId === q.id))
          : undefined;
      const selected = fixed ? { kind: 'question' as const, question: fixed, gain: 0 } : action;
      if (selected.kind === 'question') {
        const dist = posterior(game, targets, questions);
        if (separation(dist, targets, selected.question) <= 1e-12) wasted++;
        if (selected.gain < 0.01 && method === 'adaptive') weak++;
      }
      game = answerGame(
        game,
        selected,
        selected.kind === 'guess'
          ? selected.target.id === target.id
          : ((attribute(target, selected.question) === 'unknown'
              ? oracle === 'editorial' && !selected.question.explicit
                ? 'no'
                : 'dont_know'
              : attribute(target, selected.question)) as Answer),
      );
      if (analyzeFacts(game).conflict !== null) contradictions++;
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
    meanQuestions:
      results.reduce((n, r) => n + r.actions.filter((a) => a.kind === 'answer').length, 0) / results.length,
    stoppedEarly: results.filter((r) => r.status === 'playing' && r.actions.length < 20).length,
    wasted,
    weak,
    contradictions,
  };
}
