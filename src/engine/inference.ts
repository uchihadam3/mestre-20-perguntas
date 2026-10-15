import type { Answer, Game, Question, Target } from '../domain/types';
import { attribute } from '../data/questions';
import { analyzeFacts, CERTAIN_CLASSIFICATIONS, isQuestionAllowed } from './logic';

export type Distribution = Map<string, number>;
export type Choice =
  | { kind: 'question'; question: Question; gain: number }
  | { kind: 'guess'; target: Target; confidence: number };
const epsilon = 1e-12;

export function prior(targets: Target[], mix = 0.5): Distribution {
  if (mix < 0 || mix > 1) throw new Error('A mistura deve estar entre 0 e 1');
  if (targets.length === 0) return new Map();
  // A larger catalog of US media must not automatically drown out Brazil.
  // Editorial group weights are uncalibrated; half the prior stays uniform.
  const group = (t: Target) => (t.origin === 'Brasil' ? 'br' : t.origin === 'EUA' ? 'us' : 'world');
  const groupWeight = { br: 0.5, us: 0.33, world: 0.17 };
  const totals = { br: 0, us: 0, world: 0 };
  for (const t of targets) totals[group(t)] += t.popularity.br;
  const weightPresent = Object.entries(totals).reduce(
    (n, [key, total]) => n + (total > 0 ? groupWeight[key as keyof typeof totals] : 0),
    0,
  );
  return new Map(
    targets.map((t) => [
      t.id,
      mix * (groupWeight[group(t)] / weightPresent) * (t.popularity.br / totals[group(t)]) +
        (1 - mix) / targets.length,
    ]),
  );
}

export function likelihood(target: Target, question: Question, answer: Answer): number {
  if (answer === 'dont_know') return question.unknownRate;
  const value = attribute(target, question);
  const scale = 1 - question.unknownRate;
  if (value === 'unknown') return scale * { yes: 0.25, no: 0.25, maybe: 0.5 }[answer];
  const chance =
    value === 'yes' ? { yes: 0.79, no: 0.04, maybe: 0.17 } : { yes: 0.05, no: 0.86, maybe: 0.09 };
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

/**
 * Definitive, curated classifications eliminate logically incompatible
 * candidates. Other/partial traits remain probabilistic; if answers conflict
 * with every candidate, fall back to soft evidence rather than inventing a win.
 */
function constrainCertainAnswers(
  dist: Distribution,
  game: Game,
  targets: Target[],
  questions: Question[],
): Distribution {
  const certain = game.actions.flatMap((action) => {
    if (
      action.kind !== 'answer' ||
      (action.answer !== 'yes' && action.answer !== 'no') ||
      !CERTAIN_CLASSIFICATIONS.has(action.questionId)
    )
      return [];
    const question = questions.find((item) => item.id === action.questionId);
    return question ? [{ question, answer: action.answer }] : [];
  });
  if (!certain.length) return dist;
  const result = new Map(
    targets.map((target) => {
      const incompatible = certain.some(({ question, answer }) => {
        const known = attribute(target, question);
        return known !== 'unknown' && known !== answer;
      });
      return [target.id, incompatible ? 0 : (dist.get(target.id) ?? 0)] as const;
    }),
  );
  const sum = [...result.values()].reduce((a, b) => a + b, 0);
  if (sum <= epsilon) return dist;
  for (const [id, weight] of result) result.set(id, weight / sum);
  return result;
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
  return constrainCertainAnswers(dist, game, targets, questions);
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

/** Posterior mass split between known yes/no fingerprints. A good question
 * separates plausible rivals rather than merely belonging to a popular tag. */
export function separation(dist: Distribution, targets: Target[], q: Question): number {
  let yes = 0;
  let no = 0;
  for (const target of targets) {
    const answer = attribute(target, q);
    if (answer === 'yes') yes += dist.get(target.id) ?? 0;
    if (answer === 'no') no += dist.get(target.id) ?? 0;
  }
  return 2 * yes * no;
}

export function rankQuestions(
  game: Game,
  targets: Target[],
  questions: Question[],
): { question: Question; gain: number; score: number }[] {
  if (analyzeFacts(game).conflict !== null) return [];
  const dist = posterior(game, targets, questions);
  const used = new Set(game.actions.filter((a) => a.kind === 'answer').map((a) => a.questionId));
  const byId = new Map(targets.map((t) => [t.id, t]));
  return (
    questions
      .filter((q) => !used.has(q.id) && isQuestionAllowed(game, q))
      .map((question) => {
        const gain = informationGain(dist, targets, question);
        const applicableMass = [...dist].reduce(
          (n, [id, p]) =>
            n + (!question.applicable || question.applicable.includes(byId.get(id)!.type) ? p : 0),
          0,
        );
        const split = separation(dist, targets, question);
        return {
          question,
          gain,
          score:
            gain * (0.55 + 0.45 * applicableMass) +
            0.35 * split -
            question.cost -
            question.unknownRate * 0.25,
        };
      })
      // Don't ask questions that cannot split any remaining plausible rivals.
      .filter(({ question }) => separation(dist, targets, question) > epsilon)
      .sort((a, b) => b.score - a.score || a.question.id.localeCompare(b.question.id))
  );
}

/**
 * A palpite is a LAST resort: unlike a discriminating question, a failed guess
 * removes only one candidate and wastes one of twenty precious actions.
 *
 * These conservative posterior thresholds are product policy, not proof that
 * unverified catalog probabilities are calibrated. Test and recalibrate them
 * with held-out real sessions before claiming statistical certainty.
 */
export const GUESS_POLICY = {
  earlyThreshold: 0.995,
  laterThreshold: 0.975,
  retryThreshold: 0.995,
  earlyMinEvidence: 5,
  laterMinEvidence: 7,
  minQuestionsAfterMiss: 4,
  maxGuesses: 2,
} as const;

export function shouldGuess(game: Game, dist: Distribution, top: Target): boolean {
  const previousGuesses = game.actions
    .map((action, index) => ({ action, index }))
    .filter(({ action }) => action.kind === 'guess');
  if (previousGuesses.length >= GUESS_POLICY.maxGuesses) return false;

  const questionActions = game.actions.filter((action) => action.kind === 'answer');
  const decisiveAnswers = questionActions.filter(
    (action) => action.answer === 'yes' || action.answer === 'no',
  );
  const isEarly = game.actions.length < 10;
  if (decisiveAnswers.length < (isEarly ? GUESS_POLICY.earlyMinEvidence : GUESS_POLICY.laterMinEvidence))
    return false;

  if (previousGuesses.length > 0) {
    const lastMiss = previousGuesses[previousGuesses.length - 1].index;
    const newEvidence = game.actions
      .slice(lastMiss + 1)
      .filter((action) => action.kind === 'answer' && (action.answer === 'yes' || action.answer === 'no'));
    if (newEvidence.length < GUESS_POLICY.minQuestionsAfterMiss) return false;
  }

  const confidence = dist.get(top.id) ?? 0;
  const threshold =
    previousGuesses.length > 0
      ? GUESS_POLICY.retryThreshold
      : isEarly
        ? GUESS_POLICY.earlyThreshold
        : GUESS_POLICY.laterThreshold;
  if (confidence < threshold) return false;

  const runnerUp = Math.max(0, ...[...dist].filter(([id]) => id !== top.id).map(([, p]) => p));
  // Require a clear winner as an extra guard against ambiguous fingerprints.
  return runnerUp === 0 || confidence / runnerUp >= (isEarly ? 25 : 12);
}

export function choose(game: Game, targets: Target[], questions: Question[]): Choice | null {
  if (
    game.status !== 'playing' ||
    game.actions.length >= 20 ||
    !targets.length ||
    analyzeFacts(game).conflict !== null
  )
    return null;
  const dist = posterior(game, targets, questions);
  const [top] = targets
    .filter((t) => !game.actions.some((a) => a.kind === 'guess' && a.targetId === t.id))
    .sort((a, b) => (dist.get(b.id) ?? 0) - (dist.get(a.id) ?? 0));
  if (!top) return null;
  const ranked = rankQuestions(game, targets, questions);
  const confidence = dist.get(top.id) ?? 0;

  // Never force a low-confidence guess at the twentieth action, or because a
  // question has low gain. Keep gathering evidence until confident or defeated.
  if (shouldGuess(game, dist, top)) return { kind: 'guess', target: top, confidence };
  if (ranked.length > 0) return { kind: 'question', question: ranked[0].question, gain: ranked[0].gain };
  return null;
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

/** Editing an earlier clue invalidates all later deductions and returns their
 * action budget. Previous guesses must never be kept after the edit. */
export function reviseAnswer(game: Game, index: number, answer: Answer): Game {
  const action = game.actions[index];
  if (game.status !== 'playing' || action?.kind !== 'answer') return game;
  return {
    ...game,
    actions: [...game.actions.slice(0, index), { ...action, answer }],
    lastGuess: undefined,
  };
}

export function concedeGame(game: Game): Game {
  return game.status === 'playing' ? { ...game, status: 'lost', endedAt: Date.now() } : game;
}

export function medal(actions: number): 'elite' | 'ouro' | 'prata' | 'bronze' {
  return actions <= 5 ? 'elite' : actions <= 10 ? 'ouro' : actions <= 15 ? 'prata' : 'bronze';
}
