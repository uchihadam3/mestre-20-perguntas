import { describe, expect, it } from 'vitest';
import { answerGame, newGame } from '../engine/inference';
import { targets } from '../data/targets';
import { badges, finish, initialProfile, mastery, train } from './storage';

describe('progressão real', () => {
  it('concede medalha somente em vitória confirmada', () => {
    const game = answerGame(newGame(), { kind: 'guess', target: targets[0], confidence: 1 }, true);
    const p = finish(initialProfile(), game);
    expect(p.medals.elite).toBe(1);
    expect(p.games).toBe(1);
    expect(badges(p).filter((b) => b.earned).length).toBe(3);
  });
  it('missão exige três pistas diferentes e não paga repetição antecipada', () => {
    let p = initialProfile();
    p = train(p, 'q', false);
    expect(p.xp).toBe(0);
    p = train(p, 'q', true);
    p = train(p, 'q', true);
    expect(p.xp).toBe(8);
    expect(p.daily.count).toBe(1);
    p = train(p, 'r', true);
    p = train(p, 's', true);
    expect(p.xp).toBe(44);
    expect(p.daily.claimed).toBe(true);
    expect(mastery(p).learned).toBe(3);
    expect(mastery(p).mastered).toBe(0);
  });
  it('maestria exige duas revisões vencidas em dias distintos', () => {
    const day = 86400000;
    let p = train(initialProfile(), 'rota', true);
    p = train(p, 'rota', true);
    expect(p.training.rota.interval).toBe(1);
    p = { ...p, training: { ...p.training, rota: { ...p.training.rota, dueAt: Date.now() - day } } };
    p = train(p, 'rota', true);
    expect(p.training.rota.interval).toBe(2);
    expect(mastery(p).mastered).toBe(0);
    p = { ...p, training: { ...p.training, rota: { ...p.training.rota, dueAt: Date.now() - day } } };
    p = train(p, 'rota', true);
    expect(mastery(p).mastered).toBe(1);
  });
});
