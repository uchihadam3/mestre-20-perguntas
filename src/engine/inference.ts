import type { Answer, Game, Question, Target } from '../domain/types';
import { attribute } from '../data/questions';

export type Distribution = Map<string, number>;
export type Choice =
  | { kind: 'question'; question: Question; gain: number }
  | { kind: 'guess'; target: Target; confidence: number };
const epsilon = 1e-12;

export function prior(targets: Target[], mix = 0.5): Distribution {
  if (mix < 0 || mix > 1) throw new Error('A mistura deve estar entre 0 e 1');
  if (targets.length === 0) return new Map();
  const scores = targets.map((t) => t.popularity.br);
  const total = scores.reduce((a, b) => a + b, 0);
  return new Map(targets.map((t, i) => [t.id, (mix * scores[i]) / total + (1 - mix) / targets.length]));
}

export function likelihood(target: Target, question: Question, answer: Answer): number {
  if (answer === 'dont_know') return question.unknownRate;
  const value = attribute(target, question);
  const scale = 1 - question.unknownRate;
  if (value === 'unknown') return scale * { yes: 0.25, no: 0.25, maybe: 0.5 }[answer];
  const chance =
    value === 'yes' ? { yes: 0.83, no: 0.05, maybe: 0.12 } : { yes: 0.05, no: 0.83, maybe: 0.12 };
  return scale * chance[answer];
}

export function update(
  dist: Distribution,
  targets: Target[],
  question: Question,
  answer: Answer,
): Distribution {
  if (answer === 'dont_know') return new Map(dist);
  const weights = targets.map((t) => (dist.get(t.id) ?? 0) * likelihood(t, question, answer));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum < epsilon) return new Map(dist);
  return new Map(targets.map((t, i) => [t.id, weights[i] / sum]));
}

export function posterior(game: Game, targets: Target[], questions: Question[], mix = 0.5): Distribution {
  let dist = prior(targets, mix);
  for (const action of game.actions) {
    if (action.kind === 'answer') {
      const q = questions.find((q) => q.id === action.questionId);
      if (q) dist = update(dist, targets, q, action.answer);
    } else if (!action.accepted) {
      dist.set(action.targetId, 0);
      const sum = [...dist.values()].reduce((a, b) => a + b, 0);
      if (sum > epsilon) for (const [id, p] of dist) dist.set(id, p / sum);
    }
  }
  return dist;
}

export function entropy(dist: Distribution): number {
  let sum = 0;
  for (const p of dist.values()) if (p > 0) sum -= p * Math.log2(p);
  return sum;
}

export function informationGain(dist: Distribution, targets: Target[], q: Question): number {
  const before = entropy(dist);
  let after = 0;
  for (const answer of ['yes', 'no', 'maybe', 'dont_know'] as Answer[]) {
    let chance = 0;
    for (const target of targets) chance += (dist.get(target.id) ?? 0) * likelihood(target, q, answer);
    if (chance > 0) after += chance * entropy(update(dist, targets, q, answer));
  }
  return Math.max(0, before - after);
}

export function rankQuestions(
  game: Game,
  targets: Target[],
  questions: Question[],
): { question: Question; gain: number; score: number }[] {
  const dist = posterior(game, targets, questions);
  const used = new Set(game.actions.filter((a) => a.kind === 'answer').map((a) => a.questionId));
  return questions
    .filter((q) => !used.has(q.id))
    .map((question) => {
      const gain = informationGain(dist, targets, question);
      const applicableMass = [...dist].reduce(
        (n, [id, p]) =>
          n +
          (!question.applicable || question.applicable.includes(targets.find((t) => t.id === id)!.type)
            ? p
            : 0),
        0,
      );
      return {
        question,
        gain,
        score: gain * (0.55 + 0.45 * applicableMass) - question.cost - question.unknownRate * 0.25,
      };
    })
    .sort((a, b) => b.score - a.score || a.question.id.localeCompare(b.question.id));
}

export function choose(game: Game, targets: Target[], questions: Question[]): Choice | null {
  if (game.status !== 'playing' || game.actions.length >= 20 || !targets.length) return null;
  const dist = posterior(game, targets, questions);
  const [top] = targets
    .filter((t) => !game.actions.some((a) => a.kind === 'guess' && a.targetId === t.id))
    .sort((a, b) => (dist.get(b.id) ?? 0) - (dist.get(a.id) ?? 0));
  if (!top) return null;
  const confidence = dist.get(top.id) ?? 0;
  const ranked = rankQuestions(game, targets, questions);
  const threshold =
    game.actions.length < 5 ? 0.72 : game.actions.length < 10 ? 0.5 : game.actions.length < 15 ? 0.34 : 0.17;
  if (game.actions.length === 19 || confidence >= threshold || !ranked.length || ranked[0].score < 0.06)
    return { kind: 'guess', target: top, confidence };
  return { kind: 'question', question: ranked[0].question, gain: ranked[0].gain };
}

export function newGame(id = `${Date.now()}`): Game {
  return { id, actions: [], status: 'playing', startedAt: Date.now() };
}

export function answerGame(game: Game, choice: Choice, answer: Answer | boolean): Game {
  if (game.status !== 'playing' || game.actions.length >= 20) return game;
  const action =
    choice.kind === 'question'
      ? { kind: 'answer' as const, questionId: choice.question.id, answer: answer as Answer }
      : { kind: 'guess' as const, targetId: choice.target.id, accepted: answer === true };
  const actions = [...game.actions, action];
  const won = action.kind === 'guess' && action.accepted;
  return {
    ...game,
    actions,
    status: won ? 'won' : actions.length === 20 ? 'lost' : 'playing',
    endedAt: won || actions.length === 20 ? Date.now() : undefined,
    lastGuess: action.kind === 'guess' ? action.targetId : game.lastGuess,
  };
}

export function medal(actions: number): 'elite' | 'ouro' | 'prata' | 'bronze' {
  return actions <= 5 ? 'elite' : actions <= 10 ? 'ouro' : actions <= 15 ? 'prata' : 'bronze';
}
