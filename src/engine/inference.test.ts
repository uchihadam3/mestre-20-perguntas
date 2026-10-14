import { describe, expect, it } from 'vitest';
import { targets } from '../data/targets';
import { questions, attribute } from '../data/questions';
import { validateData } from '../data/validate';
import {
  answerGame,
  choose,
  informationGain,
  newGame,
  posterior,
  prior,
  rankQuestions,
  update,
} from './inference';

describe('seed e inferência', () => {
  it('tem fichas estruturadas e perguntas divisoras', () => expect(validateData()).toEqual([]));
  it('normaliza prior e mantém cauda uniforme', () => {
    const p = prior(targets);
    expect([...p.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(Math.min(...p.values())).toBeGreaterThan(0);
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
    expect(game.actions.length).toBe(20);
    expect(game.status).toBe('lost');
    expect(choose(game, targets, questions)).toBeNull();
  });
  it('só concede vitória após confirmação de palpite', () => {
    const guess = { kind: 'guess' as const, target: targets[0], confidence: 0.9 };
    expect(answerGame(newGame(), guess, false).status).toBe('playing');
    expect(answerGame(newGame(), guess, true).status).toBe('won');
  });
});
