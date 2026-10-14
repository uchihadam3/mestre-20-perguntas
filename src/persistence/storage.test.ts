import { describe, expect, it } from 'vitest';
import { answerGame, newGame } from '../engine/inference';
import { targets } from '../data/targets';
import { badges, finish, initialProfile, train } from './storage';

describe('progressão real', () => {
  it('concede medalha somente em vitória confirmada', () => {
    const game = answerGame(newGame(), { kind: 'guess', target: targets[0], confidence: 1 }, true);
    const p = finish(initialProfile(), game);
    expect(p.medals.elite).toBe(1);
    expect(p.games).toBe(1);
    expect(badges(p).filter((b) => b.earned).length).toBe(3);
  });
  it('missão diária paga uma vez e erro não rende XP', () => {
    let p = initialProfile();
    p = train(p, 'q', false);
    expect(p.xp).toBe(0);
    p = train(p, 'q', true);
    p = train(p, 'q', true);
    p = train(p, 'q', true);
    expect(p.xp).toBe(44);
    p = train(p, 'q', true);
    expect(p.xp).toBe(52);
  });
});
