import { describe, expect, it } from 'vitest';
import { targets } from '../data/targets';
import { questions, attribute, attributeEvidence } from '../data/questions';
import { validateData } from '../data/validate';
import { analyzeFacts, isQuestionAllowed, logicalFacts } from './logic';
import {
  answerGame,
  choose,
  concedeGame,
  informationGain,
  newGame,
  posterior,
  prior,
  rankQuestions,
  reviseAnswer,
  separation,
  shouldGuess,
  GUESS_POLICY,
  update,
} from './inference';

describe('seed e inferência', () => {
  it('tem fichas estruturadas e perguntas divisoras', () => expect(validateData()).toEqual([]));
  it('normaliza prior e mantém cauda uniforme', () => {
    const p = prior(targets);
    expect([...p.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(Math.min(...p.values())).toBeGreaterThan(0);
  });
  it('peso editorial brasileiro não diminui só porque mais fichas americanas são adicionadas', () => {
    const editorial = prior(targets, 1);
    const extra = targets.find((t) => t.origin === 'EUA')!;
    const expanded = prior([...targets, { ...extra, id: 'extra-us' }], 1);
    const mass = (dist: Map<string, number>) =>
      targets.filter((t) => t.origin === 'Brasil').reduce((n, t) => n + (dist.get(t.id) ?? 0), 0);
    expect(mass(expanded)).toBeCloseTo(mass(editorial));
    const mixed = prior(targets);
    expect(mass(mixed)).toBeGreaterThan(
      targets.filter((t) => t.origin === 'EUA').reduce((n, t) => n + (mixed.get(t.id) ?? 0), 0),
    );
  });
  it('respostas sim e não mudam a distribuição em direções opostas', () => {
    const q = questions.find((q) => q.id === 'real')!;
    const seed = prior(targets);
    const real = targets.find((t) => t.name === 'Pelé')!;
    expect(update(seed, targets, q, 'yes').get(real.id)).toBeGreaterThan(seed.get(real.id)!);
    expect(update(seed, targets, q, 'no').get(real.id)).toBeLessThan(seed.get(real.id)!);
  });
  it('não sei não inventa evidência e talvez não zera alvos', () => {
    const q = questions[0],
      seed = prior(targets);
    expect([...update(seed, targets, q, 'dont_know')]).toEqual([...seed]);
    const maybe = update(seed, targets, q, 'maybe');
    expect(Math.min(...maybe.values())).toBeGreaterThan(0);
    const real = targets.find((t) => t.name === 'Pelé')!;
    expect(maybe.get(real.id)).toBeGreaterThan(seed.get(real.id)!);
    expect(maybe.get(real.id)).toBeLessThan(update(seed, targets, q, 'yes').get(real.id)!);
  });
  it('avalia ganho esperado e não repete perguntas', () => {
    let game = newGame('unit');
    const first = choose(game, targets, questions)!;
    expect(first.kind).toBe('question');
    if (first.kind !== 'question') return;
    expect(informationGain(prior(targets), targets, first.question)).toBeGreaterThan(0);
    game = answerGame(game, first, 'yes');
    expect(rankQuestions(game, targets, questions).some((r) => r.question.id === first.question.id)).toBe(
      false,
    );
    expect([...posterior(game, targets, questions).values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it('prefere pistas capazes de dividir rivais e preserva desconhecido nas fichas parciais', () => {
    const q = questions.find((item) => item.id === 'woman')!;
    const scarlett = targets.find((target) => target.name === 'Scarlett Johansson')!;
    const robert = targets.find((target) => target.name === 'Robert Downey Jr.')!;
    const pele = targets.find((target) => target.name === 'Pelé')!;
    expect(attribute(scarlett, q)).toBe('yes');
    expect(attribute(robert, q)).toBe('no');
    expect(
      attribute(
        targets.find((target) => target.name === 'Optimus Prime')!,
        q,
      ),
    ).toBe('unknown');
    expect(
      separation(
        new Map([
          [scarlett.id, 0.5],
          [robert.id, 0.5],
        ]),
        [scarlett, robert],
        q,
      ),
    ).toBeCloseTo(0.5);
    expect(
      separation(
        new Map([
          [scarlett.id, 0.5],
          [pele.id, 0.5],
        ]),
        [scarlett, pele],
        q,
      ),
    ).toBeCloseTo(0.5);
  });
  it('nunca passa de 20 ações, incluindo palpites recusados', () => {
    let game = newGame('limit');
    const target = targets[0];
    for (let i = 0; i < 30; i++) {
      const choice = choose(game, targets, questions);
      if (!choice) break;
      game = answerGame(
        game,
        choice,
        choice.kind === 'guess'
          ? false
          : attribute(target, choice.question) === 'unknown'
            ? 'dont_know'
            : (attribute(target, choice.question) as 'yes' | 'no'),
      );
    }
    // A smarter engine may exhaust all informative questions before 20.
    // That is preferable to filling the remaining slots with nonsense.
    expect(game.actions.length).toBeLessThanOrEqual(20);
    expect(game.actions.length).toBeGreaterThan(0);
    const ended = game.status === 'playing' ? concedeGame(game) : game;
    expect(ended.status).toBe('lost');
    expect(choose(ended, targets, questions)).toBeNull();
  });
  it('só concede vitória após confirmação de palpite', () => {
    const guess = { kind: 'guess' as const, target: targets[0], confidence: 0.9 };
    expect(answerGame(newGame(), guess, false).status).toBe('playing');
    expect(answerGame(newGame(), guess, true).status).toBe('won');
  });
  it('encerra honestamente um ramo sem pergunta útil', () => {
    const game = newGame('sem-pistas');
    expect(choose(game, targets, [])).toBeNull();
    const ended = concedeGame(game);
    expect(ended.status).toBe('lost');
    expect(ended.actions).toHaveLength(0);
    expect(concedeGame(ended)).toBe(ended);
  });
  it('não transforma incerteza em sequência de palpites', () => {
    const realTargets = targets.slice(0, 2);
    const top = realTargets[0];
    const probability = (confidence: number) =>
      new Map([
        [top.id, confidence],
        [realTargets[1].id, 1 - confidence],
      ]);
    const answers = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        kind: 'answer' as const,
        questionId: `evidence-${i}`,
        answer: 'yes' as const,
      }));
    const early = { ...newGame('early'), actions: answers(6) };
    expect(shouldGuess(early, probability(0.98), top)).toBe(false);
    expect(shouldGuess(early, probability(GUESS_POLICY.earlyThreshold + 0.001), top)).toBe(true);

    const later = { ...newGame('later'), actions: answers(10) };
    expect(shouldGuess(later, probability(0.85), top)).toBe(false);
    expect(shouldGuess(later, probability(0.97), top)).toBe(false);
    expect(shouldGuess(later, probability(0.98), top)).toBe(true);

    // Even a highly confident posterior cannot trigger consecutive name guesses.
    const missed = { kind: 'guess' as const, targetId: realTargets[1].id, accepted: false };
    expect(
      shouldGuess(
        { ...newGame('cooldown'), actions: [...answers(10), missed, ...answers(2)] },
        probability(0.999),
        top,
      ),
    ).toBe(false);
    expect(
      shouldGuess(
        { ...newGame('retry'), actions: [...answers(10), missed, ...answers(4)] },
        probability(0.996),
        top,
      ),
    ).toBe(true);
    expect(
      shouldGuess(
        { ...newGame('cap'), actions: [...answers(10), missed, ...answers(4), missed, ...answers(4)] },
        probability(0.9999),
        top,
      ),
    ).toBe(false);
  });

  it('na última ação continua perguntando se não há confiança, sem chute forçado', () => {
    let game = newGame('last-turn');
    for (const q of questions.slice(0, 19)) {
      game = {
        ...game,
        actions: [...game.actions, { kind: 'answer', questionId: q.id, answer: 'dont_know' }],
      };
    }
    const decision = choose(game, targets, questions);
    expect(decision?.kind).toBe('question');
    if (decision?.kind !== 'question') return;
    const last = answerGame(game, decision, 'dont_know');
    expect(last.status).toBe('lost');
    expect(last.actions.length).toBe(20);
    expect(last.actions.filter((action) => action.kind === 'guess')).toHaveLength(0);
  });
  it('origem americana positiva descarta as demais origens e candidatos incompatíveis', () => {
    const game = {
      ...newGame('origin'),
      actions: [{ kind: 'answer' as const, questionId: 'us', answer: 'yes' as const }],
    };
    const possibilities = rankQuestions(game, targets, questions).map((entry) => entry.question.id);
    for (const id of ['br', 'jp', 'uk', 'mx', 'us']) expect(possibilities).not.toContain(id);
    const dist = posterior(game, targets, questions);
    const american = targets.find((target) => target.name === 'Homer Simpson')!;
    const brazilian = targets.find((target) => target.name === 'Pelé')!;
    expect(dist.get(american.id)).toBeGreaterThan(0);
    expect(dist.get(brazilian.id)).toBe(0);
    expect([...dist.values()].reduce((sum, p) => sum + p, 0)).toBeCloseTo(1);
  });

  it('cartoon ocidental não volta a perguntar anime ou cinema genérico', () => {
    const game = {
      ...newGame('cartoon'),
      actions: [{ kind: 'answer' as const, questionId: 'cartoon', answer: 'yes' as const }],
    };
    const ids = rankQuestions(game, targets, questions).map((entry) => entry.question.id);
    for (const id of ['anime', 'film', 'series', 'novela', 'fictional', 'real', 'group']) {
      expect(ids).not.toContain(id);
    }
    // Filmes animados continuam candidatos; a subdivisão é específica.
    expect(ids).toContain('animatedfilm');
    const dist = posterior(game, targets, questions);
    expect(dist.get(targets.find((target) => target.name === 'Shrek')!.id)).toBeGreaterThan(0);
    // Anime and western cartoons may overlap through adaptations: not a hard elimination.
    expect(dist.get(targets.find((target) => target.name === 'Goku')!.id)).toBeGreaterThan(0);
    const subtype = questions.find((question) => question.id === 'animatedfilm')!;
    expect(
      attribute(
        targets.find((target) => target.name === 'Shrek')!,
        subtype,
      ),
    ).toBe('yes');
    expect(
      attribute(
        targets.find((target) => target.name === 'Homer Simpson')!,
        subtype,
      ),
    ).toBe('no');
  });

  it('deduz perguntas-pai e evita perguntas sobre tipo de alvo incompatível', () => {
    const withAnswer = (id: string, answer: 'yes' | 'no') => ({
      ...newGame(id),
      actions: [{ kind: 'answer' as const, questionId: id, answer }],
    });
    const football = withAnswer('football', 'yes');
    expect(logicalFacts(football).get('sport')).toBe(true);
    expect(
      isQuestionAllowed(
        football,
        questions.find((q) => q.id === 'sport')!,
      ),
    ).toBe(false);
    const notSport = withAnswer('sport', 'no');
    expect(
      isQuestionAllowed(
        notSport,
        questions.find((q) => q.id === 'football')!,
      ),
    ).toBe(false);
    expect(
      isQuestionAllowed(
        notSport,
        questions.find((q) => q.id === 'basket')!,
      ),
    ).toBe(false);
    const real = withAnswer('real', 'yes');
    expect(
      isQuestionAllowed(
        real,
        questions.find((q) => q.id === 'animal')!,
      ),
    ).toBe(false);
    expect(
      isQuestionAllowed(
        real,
        questions.find((q) => q.id === 'hero')!,
      ),
    ).toBe(false);
    const group = withAnswer('group', 'yes');
    expect(
      isQuestionAllowed(
        group,
        questions.find((q) => q.id === 'real')!,
      ),
    ).toBe(false);
  });

  it('incerteza não elimina países nem transforma hipóteses em fatos', () => {
    const game = {
      ...newGame('maybe-us'),
      actions: [{ kind: 'answer' as const, questionId: 'us', answer: 'maybe' as const }],
    };
    expect(logicalFacts(game).size).toBe(0);
    expect(
      isQuestionAllowed(
        game,
        questions.find((q) => q.id === 'br')!,
      ),
    ).toBe(true);
    expect(
      isQuestionAllowed(
        game,
        questions.find((q) => q.id === 'jp')!,
      ),
    ).toBe(true);
    const dist = posterior(game, targets, questions);
    expect(dist.get(targets.find((t) => t.name === 'Pelé')!.id)).toBeGreaterThan(0);
  });

  it('detecta contradição de país e pausa até revisar uma resposta sem manter ações posteriores', () => {
    const game = {
      ...newGame('contradiction'),
      actions: [
        { kind: 'answer' as const, questionId: 'us', answer: 'yes' as const },
        { kind: 'answer' as const, questionId: 'br', answer: 'yes' as const },
        { kind: 'answer' as const, questionId: 'woman', answer: 'maybe' as const },
      ],
    };
    expect(analyzeFacts(game).conflict).toBe(1);
    expect(choose(game, targets, questions)).toBeNull();
    const corrected = reviseAnswer(game, 0, 'dont_know');
    expect(corrected.actions).toEqual([{ kind: 'answer', questionId: 'us', answer: 'dont_know' }]);
    expect(analyzeFacts(corrected).conflict).toBeNull();
    expect(choose(corrected, targets, questions)?.kind).toBe('question');
  });

  it('mídias sobrepostas não são contradições determinísticas', () => {
    const game = {
      ...newGame('overlap'),
      actions: [
        { kind: 'answer' as const, questionId: 'cartoon', answer: 'yes' as const },
        { kind: 'answer' as const, questionId: 'anime', answer: 'yes' as const },
      ],
    };
    expect(analyzeFacts(game).conflict).toBeNull();
    expect(logicalFacts(game).get('fictional')).toBe(true);
    const crossMedia = {
      ...newGame('game-anime'),
      actions: [
        { kind: 'answer' as const, questionId: 'game', answer: 'yes' as const },
        { kind: 'answer' as const, questionId: 'anime', answer: 'yes' as const },
      ],
    };
    expect(analyzeFacts(crossMedia).conflict).toBeNull();
    expect(
      attribute(
        targets.find((t) => t.name === 'Pikachu')!,
        questions.find((q) => q.id === 'game')!,
      ),
    ).toBe('yes');
    const impossibleType = {
      ...newGame('type'),
      actions: [
        { kind: 'answer' as const, questionId: 'real', answer: 'yes' as const },
        { kind: 'answer' as const, questionId: 'group', answer: 'yes' as const },
      ],
    };
    expect(analyzeFacts(impossibleType).conflict).toBe(1);
  });

  it('catálogo não inventa não para tags ausentes', () => {
    const pele = targets.find((t) => t.name === 'Pelé')!;
    const music = questions.find((q) => q.id === 'music')!;
    const real = questions.find((q) => q.id === 'real')!;
    const japan = questions.find((q) => q.id === 'jp')!;
    expect(attribute(pele, music)).toBe('unknown');
    expect(attribute(pele, real)).toBe('yes');
    expect(attribute(pele, japan)).toBe('no');
    const threecups = questions.find((q) => q.id === 'threecups')!;
    expect(attributeEvidence(pele, threecups)).toMatchObject({ value: 'yes', confidence: 'curated' });
    expect(attributeEvidence(pele, music)).toEqual({ value: 'unknown', source: null, confidence: 'unknown' });
    for (const target of targets) {
      for (const question of questions) {
        if (
          !question.explicit &&
          !target.tags.includes(question.tag) &&
          !['real', 'fictional', 'group', 'br', 'us', 'jp', 'uk', 'mx'].includes(question.tag)
        ) {
          expect(attribute(target, question)).not.toBe('no');
        }
      }
    }
  });

  it('respostas definitivas implicadas são puladas, mesmo após caminhos diferentes', () => {
    for (const pair of [
      ['football', 'sport'],
      ['lakers', 'basket'],
      ['nuclearjob', 'simpsons'],
      ['spyheroine', 'marvelheroine'],
    ]) {
      const game = {
        ...newGame(pair[0]),
        actions: [{ kind: 'answer' as const, questionId: pair[0], answer: 'yes' as const }],
      };
      expect(logicalFacts(game).get(pair[1])).toBe(true);
      expect(rankQuestions(game, targets, questions).map((r) => r.question.id)).not.toContain(pair[1]);
    }
    const uncertain = {
      ...newGame('uncertain'),
      actions: [{ kind: 'answer' as const, questionId: 'football', answer: 'maybe' as const }],
    };
    expect(logicalFacts(uncertain).has('sport')).toBe(false);
  });

  it('remove uma pergunta dominada com a mesma assinatura de respostas', () => {
    const original = questions.find((q) => q.id === 'sport')!;
    const duplicate = { ...original, id: 'sport-duplicada', cost: original.cost + 0.2 };
    const ranked = rankQuestions(newGame('dominated'), targets, [original, duplicate]);
    expect(ranked.map((entry) => entry.question.id)).toEqual(['sport']);
  });

  it('não deixa uma pergunta quase sem ganho bloquear outra útil', () => {
    const game = {
      ...newGame('late-pele'),
      actions: [
        ['real', 'yes'],
        ['br', 'yes'],
        ['music', 'no'],
        ['sport', 'yes'],
        ['football', 'yes'],
        ['woman', 'no'],
        ['threecups', 'yes'],
        ['history', 'yes'],
        ['olderfootball', 'yes'],
      ].map(([questionId, answer]) => ({
        kind: 'answer' as const,
        questionId,
        answer: answer as 'yes' | 'no',
      })),
    };
    const ranked = rankQuestions(game, targets, questions);
    expect(ranked.every((entry) => entry.gain >= 0.0005)).toBe(true);
    expect(ranked.some((entry) => entry.question.id === 'santosclub')).toBe(true);
    expect(choose(game, targets, questions)?.kind).toBe('question');
  });

  it('não arrisca nome quando dois alvos têm assinatura idêntica', () => {
    const twin = {
      ...targets[0],
      id: 'clone',
      name: 'Clone da ficha',
      popularity: { ...targets[0].popularity },
    };
    let game = newGame('twins');
    for (let i = 0; i < 20; i++) {
      const choice = choose(game, [targets[0], twin], questions);
      if (!choice) break;
      expect(choice.kind).toBe('question');
      if (choice.kind !== 'question') break;
      const answer = attribute(targets[0], choice.question);
      game = answerGame(game, choice, answer === 'unknown' ? 'dont_know' : answer);
    }
    expect(game.actions.every((action) => action.kind === 'answer')).toBe(true);
  });

  it('um alvo fora da base pode encerrar sem nome inventado', () => {
    let game = newGame('unknown-target');
    while (game.status === 'playing') {
      const choice = choose(game, targets, questions);
      if (!choice) break;
      expect(choice.kind).toBe('question');
      if (choice.kind === 'question') game = answerGame(game, choice, 'dont_know');
    }
    expect(game.actions.length).toBeLessThanOrEqual(20);
    expect(game.actions.some((action) => action.kind === 'guess')).toBe(false);
    if (game.status === 'playing') expect(concedeGame(game).status).toBe('lost');
  });
});
