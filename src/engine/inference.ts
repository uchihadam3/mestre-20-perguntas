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
  if (value === 'unknown') {
    // Missing evidence remains possible in either direction. Broad editorial
    // tags are sparse, while deliberately partial fine traits are balanced.
    const response = question.explicit
      ? { yes: 0.25, no: 0.25, maybe: 0.5 }
      : { yes: 0.05, no: 0.86, maybe: 0.09 };
    return scale * response[answer];
  }
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
    let remaining = 0;
    let weightedLog = 0;
    const certain = CERTAIN_CLASSIFICATIONS.has(q.id) && (answer === 'yes' || answer === 'no');
    for (const target of targets) {
      const weight = (dist.get(target.id) ?? 0) * likelihood(target, q, answer);
      chance += weight;
      if (certain) {
        const known = attribute(target, q);
        if (known !== 'unknown' && known !== answer) continue;
      }
      remaining += weight;
      if (weight > 0) weightedLog += weight * Math.log2(weight);
    }
    // An empty hard-constrained branch falls back to the soft posterior.
    // Such branches cannot occur with normal positive likelihoods and catalog,
    // but preserve the old behavior for synthetic tests.
    if (chance > 0 && remaining > epsilon) after += chance * (Math.log2(remaining) - weightedLog / remaining);
  }
  return Math.max(0, before - after);
}

/** Posterior mass split between known yes/no fingerprints. A good question
 * separates plausible rivals rather than merely belonging to a popular tag. */
export function separation(dist: Distribution, targets: Target[], q: Question): number {
  let yes = 0;
  let no = 0;
  let unknown = 0;
  for (const target of targets) {
    const answer = attribute(target, q);
    if (answer === 'yes') yes += dist.get(target.id) ?? 0;
    if (answer === 'no') no += dist.get(target.id) ?? 0;
    if (answer === 'unknown') unknown += dist.get(target.id) ?? 0;
  }
  // Unknown can still yield information, but is substantially less reliable
  // than two independently documented, opposing values.
  return 2 * yes * no + 0.65 * 2 * yes * unknown;
}

export function rankQuestions(
  game: Game,
  targets: Target[],
  questions: Question[],
  depth: 1 | 2 = 1,
): { question: Question; gain: number; score: number }[] {
  if (analyzeFacts(game).conflict !== null) return [];
  const dist = posterior(game, targets, questions);
  const used = new Set(game.actions.filter((a) => a.kind === 'answer').map((a) => a.questionId));
  const byId = new Map(targets.map((t) => [t.id, t]));
  const initial = questions
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
          gain * (0.55 + 0.45 * applicableMass) + 0.35 * split - question.cost - question.unknownRate * 0.25,
      };
    })
    // Don't ask questions that cannot split any remaining plausible rivals.
    .filter(({ question, gain }) => gain >= 0.0005 && separation(dist, targets, question) > epsilon)
    .sort((a, b) => b.score - a.score || a.question.id.localeCompare(b.question.id));
  // Equivalent answer fingerprints among 99.5% of the posterior mass are
  // dominated: only the better-scoring wording can advance this investigation.
  const significant: Target[] = [];
  let covered = 0;
  for (const target of [...targets].sort((a, b) => (dist.get(b.id) ?? 0) - (dist.get(a.id) ?? 0))) {
    significant.push(target);
    covered += dist.get(target.id) ?? 0;
    if (covered >= 0.995) break;
  }
  const fingerprints = new Set<string>();
  const ranked = initial.filter(({ question }) => {
    const signature = significant.map((target) => attribute(target, question)[0]).join('');
    if (fingerprints.has(signature)) return false;
    fingerprints.add(signature);
    return true;
  });
  // Bounded two-ply search: only the best three first moves and eight plausible
  // follow-ups. Answers "yes"/"no" are weighted by the current predictive
  // model; uncertain branches retain the immediate score. This is intentionally
  // bounded for mid-range phones and does not alter the conservative guess gate.
  if (depth === 1 || ranked.length < 2 || game.actions.length >= 14) return ranked;
  const future = ranked.slice(0, 8);
  for (const candidate of ranked.slice(0, 3)) {
    let followUp = 0;
    for (const answer of ['yes', 'no'] as const) {
      const chance = targets.reduce(
        (sum, target) => sum + (dist.get(target.id) ?? 0) * likelihood(target, candidate.question, answer),
        0,
      );
      if (chance < 0.02) continue;
      const next = {
        ...game,
        actions: [...game.actions, { kind: 'answer' as const, questionId: candidate.question.id, answer }],
      };
      const branch = posterior(next, targets, questions);
      const best = future
        .filter(({ question }) => question.id !== candidate.question.id && isQuestionAllowed(next, question))
        .reduce((value, { question }) => {
          const split = separation(branch, targets, question);
          if (split <= 0.005) return value;
          return Math.max(value, informationGain(branch, targets, question) + 0.35 * split - question.cost);
        }, 0);
      followUp += chance * best;
    }
    candidate.score += 0.32 * followUp;
  }
  return ranked.sort((a, b) => b.score - a.score || a.question.id.localeCompare(b.question.id));
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

export function choose(
  game: Game,
  targets: Target[],
  questions: Question[],
  depth: 1 | 2 = 1,
): Choice | null {
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
  const ranked = rankQuestions(game, targets, questions, depth);
  const confidence = dist.get(top.id) ?? 0;

  // Never force a low-confidence guess at the twentieth action, or because a
  // question has low gain. Keep gathering evidence until confident or defeated.
  if (shouldGuess(game, dist, top)) return { kind: 'guess', target: top, confidence };
  // Editorial question costs guide ordering, not an arbitrary stopping rule.
  // A small residual gain can be decisive near the strict guess threshold.
  if (ranked[0] && ranked[0].gain >= 0.0005)
    return { kind: 'question', question: ranked[0].question, gain: ranked[0].gain };
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
