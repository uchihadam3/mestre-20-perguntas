import type { Answer, Question, Target } from '../domain/types';
import { attribute } from '../data/questions';
import {
  answerGame,
  choose,
  informationGain,
  newGame,
  posterior,
  prior,
  rankQuestions,
  separation,
  shouldGuess,
  type Choice,
} from '../engine/inference';
import { analyzeFacts, isQuestionAllowed } from '../engine/logic';

export type Scenario = 'known' | 'uncertain' | 'noisy' | 'outside';
export type Policy = 'fixed' | 'split' | 'current' | 'lookahead' | 'planned';
export type Branch = { answer: Answer; next: string | null; third: string | null; mass: number };
export type Opening = { first: string; branches: Branch[] };
export type Trial = {
  target: string;
  scenario: Scenario;
  seed: number;
  policy: Policy;
  won: boolean;
  actions: number;
  questions: number;
  guesses: number;
  wasted: number;
  weak: number;
  conflicts: number;
  stopped: boolean;
};
export type Summary = {
  games: number;
  wins: number;
  within5: number;
  within10: number;
  within15: number;
  within20: number;
  meanActions: number;
  medianActions: number;
  p90Actions: number;
  falseGuesses: number;
  wasted: number;
  weak: number;
  conflicts: number;
  stopped: number;
};
export type Comparison = {
  policy: Policy;
  overall: Summary;
  scenarios: Partial<Record<Scenario, Summary>>;
  regions: Record<string, Summary>;
  fame: Record<string, Summary>;
  elapsedMs: number;
};
export type LabReport = {
  schema: 1;
  catalog: { targets: number; questions: number };
  config: { seed: number; trials: number; maxMs: number };
  cohorts: Record<'train' | 'validation' | 'holdout', number>;
  baseline: Comparison;
  candidates: Comparison[];
  strategies: Comparison[];
  holdout: Comparison[];
  opening: Opening;
  alternatives: { first: string; validation: Summary }[];
  approved: boolean;
  reason: string;
  indistinguishable: { names: string[]; knownQuestions: number }[];
};

const hash = (value: string) => {
  let h = 2166136261;
  for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
};
const random = (seed: number) => {
  let x = seed >>> 0;
  return () => {
    x += 0x6d2b79f5;
    let n = x;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
};
const ordered = (values: number[]) => values.sort((a, b) => a - b);
const percentile = (values: number[], p: number) =>
  values.length ? ordered(values)[Math.min(values.length - 1, Math.ceil(p * values.length) - 1)] : 0;
export function summarize(trials: Trial[]): Summary {
  const won = trials.filter((t) => t.won);
  const actions = trials.map((t) => t.actions);
  return {
    games: trials.length,
    wins: won.length,
    within5: won.filter((t) => t.actions <= 5).length,
    within10: won.filter((t) => t.actions <= 10).length,
    within15: won.filter((t) => t.actions <= 15).length,
    within20: won.length,
    meanActions: trials.length ? actions.reduce((a, b) => a + b, 0) / trials.length : 0,
    medianActions: percentile([...actions], 0.5),
    p90Actions: percentile([...actions], 0.9),
    falseGuesses: trials.reduce((n, t) => n + t.guesses - Number(t.won), 0),
    wasted: trials.reduce((n, t) => n + t.wasted, 0),
    weak: trials.reduce((n, t) => n + t.weak, 0),
    conflicts: trials.reduce((n, t) => n + t.conflicts, 0),
    stopped: trials.filter((t) => t.stopped).length,
  };
}

export function cohorts(targets: Target[], seed: number) {
  const result: Record<'train' | 'validation' | 'holdout', Target[]> = {
    train: [],
    validation: [],
    holdout: [],
  };
  // Stratification keeps all five tiers, origins and kinds represented where
  // the seed has enough rows. The split is stable across runs with this seed.
  const buckets = new Map<string, Target[]>();
  for (const target of targets) {
    const region = target.origin === 'Brasil' ? 'br' : target.origin === 'EUA' ? 'us' : 'world';
    const key = `${target.fameTier}:${region}:${target.type}`;
    buckets.set(key, [...(buckets.get(key) ?? []), target]);
  }
  for (const [key, bucket] of buckets) {
    const shuffled = [...bucket].sort(
      (a, b) => hash(`${seed}:${key}:${a.id}`) - hash(`${seed}:${key}:${b.id}`),
    );
    shuffled.forEach((target, index) => {
      const slot = index % 5;
      result[slot === 3 ? 'validation' : slot === 4 ? 'holdout' : 'train'].push(target);
    });
  }
  return result;
}

export function indistinguishable(targets: Target[], questions: Question[]) {
  const signatures = new Map<string, Target[]>();
  for (const target of targets) {
    const key = questions.map((q) => attribute(target, q)[0]).join('');
    signatures.set(key, [...(signatures.get(key) ?? []), target]);
  }
  return [...signatures.entries()]
    .filter(([, pair]) => pair.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)
    .map(([key, pair]) => ({
      names: pair.map((t) => t.name),
      knownQuestions: [...key].filter((c) => c !== 'u').length,
    }));
}

export function openingFor(targets: Target[], questions: Question[], first: Question): Opening {
  const root = newGame('lab-opening');
  const dist = prior(targets);
  return {
    first: first.id,
    branches: (['yes', 'no', 'maybe', 'dont_know'] as Answer[]).map((answer) => {
      const game = answerGame(root, { kind: 'question', question: first, gain: 0 }, answer);
      const next = rankQuestions(game, targets, questions)[0]?.question;
      // Third move follows the strongest answer of the second move; the other
      // continuations are computed by the game at play time.
      const second = next && answerGame(game, { kind: 'question', question: next, gain: 0 }, 'yes');
      const third = second && rankQuestions(second, targets, questions)[0]?.question.id;
      const mass = targets.reduce((n, target) => {
        const value = attribute(target, first);
        return (
          n + (dist.get(target.id) ?? 0) * Number((value === 'unknown' ? 'dont_know' : value) === answer)
        );
      }, 0);
      return { answer, next: next?.id ?? null, third: third ?? null, mass };
    }),
  };
}

function answerFor(target: Target, question: Question, scenario: Scenario, draw: () => number): Answer {
  const value = attribute(target, question);
  if (value === 'unknown') return 'dont_know';
  if (scenario === 'uncertain' && draw() < 0.18) return 'maybe';
  if (scenario === 'noisy') {
    const sample = draw();
    if (sample < 0.04) return value === 'yes' ? 'no' : 'yes';
    if (sample < 0.14) return 'maybe';
    if (sample < 0.22) return 'dont_know';
  }
  return value;
}

export function trial(
  target: Target,
  targets: Target[],
  questions: Question[],
  policy: Policy,
  scenario: Scenario,
  seed: number,
  opening?: Opening,
  cache = new Map<string, Choice | null>(),
): Trial {
  const draw = random(hash(`${seed}:${target.id}:${scenario}`));
  let game = newGame('lab');
  let wasted = 0;
  let weak = 0;
  let conflicts = 0;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const select = (): Choice | null => {
    const signature = `${policy}:${opening?.first ?? ''}:${game.actions.map((a) => (a.kind === 'answer' ? `${a.questionId}=${a.answer}` : `${a.targetId}=${a.accepted}`)).join(',')}`;
    if (cache.has(signature)) return cache.get(signature) ?? null;
    let choice: Choice | null = null;
    if (policy === 'current' || policy === 'lookahead' || policy === 'planned')
      choice = choose(game, targets, questions, policy === 'lookahead' ? 2 : 1);
    if (policy === 'fixed' || policy === 'split') {
      const dist = posterior(game, targets, questions);
      const top = [...targets]
        .filter((t) => !game.actions.some((a) => a.kind === 'guess' && a.targetId === t.id))
        .sort((a, b) => (dist.get(b.id) ?? 0) - (dist.get(a.id) ?? 0))[0];
      if (top && shouldGuess(game, dist, top))
        choice = { kind: 'guess', target: top, confidence: dist.get(top.id) ?? 0 };
      else {
        const used = new Set(game.actions.filter((a) => a.kind === 'answer').map((a) => a.questionId));
        const possible = (policy === 'fixed' ? questions.slice(0, 18) : questions)
          .filter((q) => !used.has(q.id) && isQuestionAllowed(game, q))
          .map((question) => ({
            question,
            split: separation(dist, targets, question),
          }))
          .filter((item) => item.split > 1e-12);
        if (policy === 'split')
          possible.sort((a, b) => b.split - a.split || a.question.id.localeCompare(b.question.id));
        const first = possible[0];
        if (first) {
          const gain = informationGain(dist, targets, first.question);
          if (gain >= 0.0005) choice = { kind: 'question', question: first.question, gain };
        }
      }
    }
    if (policy === 'planned' && opening && choice?.kind !== 'guess') {
      const first = byId.get(opening.first);
      const firstAction = game.actions[0];
      const branch =
        firstAction?.kind === 'answer' && opening.branches.find((b) => b.answer === firstAction.answer);
      const next =
        game.actions.length === 0
          ? first
          : game.actions.length === 1 && branch
            ? byId.get(branch.next ?? '')
            : undefined;
      if (
        next &&
        isQuestionAllowed(game, next) &&
        !game.actions.some((a) => a.kind === 'answer' && a.questionId === next.id)
      ) {
        const dist = posterior(game, targets, questions);
        const gain = informationGain(dist, targets, next);
        if (gain >= 0.0005 && separation(dist, targets, next) > 1e-12)
          choice = { kind: 'question', question: next, gain };
      }
    }
    cache.set(signature, choice);
    return choice;
  };
  while (game.status === 'playing' && game.actions.length < 20) {
    const choice = select();
    if (!choice) break;
    if (choice.kind === 'question') {
      const dist = posterior(game, targets, questions);
      if (separation(dist, targets, choice.question) <= 1e-12) wasted++;
      if (choice.gain < 0.01) weak++;
    }
    game = answerGame(
      game,
      choice,
      choice.kind === 'guess'
        ? choice.target.id === target.id
        : answerFor(target, choice.question, scenario, draw),
    );
    if (analyzeFacts(game).conflict !== null) {
      conflicts++;
      break;
    }
  }
  return {
    target: target.id,
    scenario,
    seed,
    policy,
    won: game.status === 'won',
    actions: game.actions.length,
    questions: game.actions.filter((a) => a.kind === 'answer').length,
    guesses: game.actions.filter((a) => a.kind === 'guess').length,
    wasted,
    weak,
    conflicts,
    stopped: game.status === 'playing' && game.actions.length < 20,
  };
}

export function compare(
  subjects: Target[],
  catalog: Target[],
  questions: Question[],
  policy: Policy,
  scenarios: Scenario[],
  repeats: number,
  seed: number,
  opening?: Opening,
  maxMs = Infinity,
): Comparison {
  const started = Date.now();
  const results: Trial[] = [];
  const cache = new Map<string, Choice | null>();
  for (let repeat = 0; repeat < repeats; repeat++) {
    for (const scenario of scenarios) {
      for (const target of subjects) {
        if (Date.now() - started >= maxMs) break;
        const candidates = scenario === 'outside' ? catalog.filter((t) => t.id !== target.id) : catalog;
        // Off-base candidates have different posteriors, so cannot share cache.
        results.push(
          trial(
            target,
            candidates,
            questions,
            policy,
            scenario,
            seed + repeat,
            opening,
            scenario === 'outside' ? new Map() : cache,
          ),
        );
      }
    }
  }
  const group = (key: (trial: Trial) => string) =>
    Object.fromEntries(
      [...new Set(results.map(key))].map((name) => [name, summarize(results.filter((t) => key(t) === name))]),
    );
  const byTarget = new Map(catalog.map((t) => [t.id, t]));
  return {
    policy,
    overall: summarize(results),
    scenarios: Object.fromEntries(
      scenarios.map((s) => [s, summarize(results.filter((r) => r.scenario === s))]),
    ) as Partial<Record<Scenario, Summary>>,
    regions: group((r) => {
      const origin = byTarget.get(r.target)?.origin;
      return origin === 'Brasil' ? 'Brasil' : origin === 'EUA' ? 'EUA' : 'mundo';
    }),
    fame: group((r) => String(byTarget.get(r.target)?.fameTier)),
    elapsedMs: Date.now() - started,
  };
}

export function runLab(
  targets: Target[],
  questions: Question[],
  options: { seed: number; repeats: number; maxMs: number; search: number; sampleLimit?: number },
): LabReport {
  const split = cohorts(targets, options.seed);
  if (options.sampleLimit) {
    split.validation = split.validation.slice(0, options.sampleLimit);
    split.holdout = split.holdout.slice(0, options.sampleLimit);
  }
  const started = Date.now();
  const remaining = () => Math.max(1000, options.maxMs - (Date.now() - started));
  const root = rankQuestions(newGame('root'), split.train, questions).slice(0, options.search);
  const possible = root.map(({ question }) => openingFor(split.train, questions, question));
  const validation = possible.map((opening) => ({
    first: opening.first,
    result: compare(
      split.validation,
      targets,
      questions,
      'planned',
      ['known'],
      1,
      options.seed,
      opening,
      remaining(),
    ),
    opening,
  }));
  validation.sort(
    (a, b) =>
      b.result.overall.within20 - a.result.overall.within20 ||
      b.result.overall.within10 - a.result.overall.within10 ||
      a.result.overall.meanActions - b.result.overall.meanActions,
  );
  const chosen = validation[0]?.opening ?? openingFor(split.train, questions, questions[0]);
  const strategies = (['fixed', 'split', 'current', 'lookahead'] as Policy[]).map((policy) =>
    compare(split.validation, targets, questions, policy, ['known'], 1, options.seed, undefined, remaining()),
  );
  const scenarios: Scenario[] = ['known', 'uncertain', 'noisy', 'outside'];
  // Identical draws and target order for paired comparisons. A finite budget
  // yields a partial report; partial runs never approve a new policy.
  const baseline = compare(
    split.holdout,
    targets,
    questions,
    'current',
    scenarios,
    options.repeats,
    options.seed,
    undefined,
    remaining(),
  );
  const proposed = compare(
    split.holdout,
    targets,
    questions,
    'planned',
    scenarios,
    options.repeats,
    options.seed,
    chosen,
    remaining(),
  );
  const complete =
    baseline.overall.games === split.holdout.length * scenarios.length * options.repeats &&
    proposed.overall.games === baseline.overall.games;
  const approved =
    complete &&
    proposed.overall.within20 > baseline.overall.within20 &&
    proposed.overall.within10 >= baseline.overall.within10 &&
    proposed.overall.falseGuesses <= baseline.overall.falseGuesses &&
    proposed.overall.conflicts <= baseline.overall.conflicts &&
    proposed.overall.wasted <= baseline.overall.wasted;
  return {
    schema: 1,
    catalog: { targets: targets.length, questions: questions.length },
    config: { seed: options.seed, trials: options.repeats, maxMs: options.maxMs },
    cohorts: Object.fromEntries(
      Object.entries(split).map(([key, rows]) => [key, rows.length]),
    ) as LabReport['cohorts'],
    baseline,
    candidates: validation.map((v) => v.result),
    strategies,
    holdout: [proposed],
    opening: chosen,
    alternatives: validation.map((v) => ({ first: v.first, validation: v.result.overall })),
    approved,
    reason: !complete
      ? 'Orçamento de CPU esgotado; execução parcial não pode aprovar estratégia.'
      : approved
        ? 'Ganho pareado em acertos até 20, sem regressão nos critérios de segurança.'
        : 'Sem ganho robusto em holdout; manter a política publicada até curadoria e nova validação.',
    indistinguishable: indistinguishable(targets, questions),
  };
}
