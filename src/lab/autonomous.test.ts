import { describe, expect, it } from 'vitest';
import { questions } from '../data/questions';
import { targets } from '../data/targets';
import { attribute } from '../data/questions';
import { answerGame, choose, newGame, reviseAnswer } from '../engine/inference';
import { analyzeFacts, isQuestionAllowed } from '../engine/logic';
import { cohorts, indistinguishable, openingFor, summarize, trial } from './autonomous';
import { publishedChoice, strategyVersion } from './published';

describe('Laboratório Autônomo', () => {
  it('divide treino, validação e holdout sem vazamento nem aleatoriedade', () => {
    const a = cohorts(targets, 20261015);
    const b = cohorts(targets, 20261015);
    expect(a).toEqual(b);
    const ids = Object.values(a)
      .flat()
      .map((t) => t.id);
    expect(new Set(ids).size).toBe(targets.length);
    expect(a.train.length).toBeGreaterThan(a.holdout.length);
    expect(a.validation.length).toBeGreaterThan(0);
  });

  it('responde uma lacuna como Não sei, sem inventar uma negação', () => {
    const target = targets.find((t) => t.name === 'Pelé')!;
    const unknown = questions.find((q) => q.id === 'blackwidow')!;
    expect(attribute(target, unknown)).toBe('unknown');
    const result = trial(target, targets, [unknown], 'fixed', 'known', 1);
    expect(result.won).toBe(false);
    expect(result.guesses).toBe(0);
  });

  it('não celebra vitórias com alvos fora da base', () => {
    const target = targets[0];
    const without = targets.filter((t) => t.id !== target.id);
    const result = trial(target, without, questions, 'current', 'outside', 7);
    expect(result.won).toBe(false);
    expect(result.actions).toBeLessThanOrEqual(20);
  });

  it('mantém a política publicada e os bloqueios lógicos após respostas e edição', () => {
    const game = answerGame(
      newGame('semantic'),
      { kind: 'question', question: questions.find((q) => q.id === 'us')!, gain: 1 },
      'yes',
    );
    expect(
      isQuestionAllowed(
        game,
        questions.find((q) => q.id === 'br')!,
      ),
    ).toBe(false);
    expect(
      isQuestionAllowed(
        game,
        questions.find((q) => q.id === 'us')!,
      ),
    ).toBe(false);
    expect(analyzeFacts(game).conflict).toBeNull();
    expect(publishedChoice(game, targets, questions)).toEqual(choose(game, targets, questions));
    expect(strategyVersion).toBe('0.3.0');
    const revised = reviseAnswer(game, 0, 'dont_know');
    expect(analyzeFacts(revised).facts.get('br')).toBeUndefined();
  });

  it('gera ramificações das quatro respostas e detecta assinaturas iguais', () => {
    const opening = openingFor(targets.slice(0, 12), questions, questions[0]);
    expect(opening.branches.map((b) => b.answer)).toEqual(['yes', 'no', 'maybe', 'dont_know']);
    const pair = [targets[0], { ...targets[0], id: 'clone' }];
    expect(indistinguishable(pair, questions)[0].names).toEqual([targets[0].name, targets[0].name]);
  });

  it('contabiliza vitórias, quantis e erros sem mascarar partidas incompletas', () => {
    const base = {
      target: 'a',
      scenario: 'known' as const,
      seed: 1,
      policy: 'current' as const,
      questions: 5,
      guesses: 1,
      wasted: 0,
      weak: 0,
      conflicts: 0,
      stopped: false,
    };
    expect(
      summarize([
        { ...base, won: true, actions: 6 },
        { ...base, won: false, actions: 20 },
      ]),
    ).toMatchObject({
      games: 2,
      wins: 1,
      within10: 1,
      within20: 1,
      meanActions: 13,
      medianActions: 6,
      p90Actions: 20,
      falseGuesses: 1,
    });
  });
});
