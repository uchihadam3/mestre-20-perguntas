import type { Game, Profile } from '../domain/types';
import { medal } from '../engine/inference';

const key = 'mestre20:v1';
export const today = () => new Date().toLocaleDateString('en-CA');
export const initialProfile = (): Profile => ({
  xp: 0,
  games: 0,
  wins: 0,
  best: null,
  medals: { elite: 0, ouro: 0, prata: 0, bronze: 0 },
  training: {},
  daily: { date: today(), count: 0, claimed: false },
  dailyCompleted: 0,
  history: [],
  sound: true,
  motion: true,
});
export type Save = { version: 1; game: Game | null; profile: Profile };

export function load(): Save {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as Save | null;
    if (saved?.version !== 1 || !saved.profile || !Array.isArray(saved.game?.actions ?? []))
      throw new Error('Esquema inválido');
    return {
      ...saved,
      profile: {
        ...initialProfile(),
        ...saved.profile,
        daily:
          saved.profile.daily?.date === today()
            ? saved.profile.daily
            : { date: today(), count: 0, claimed: false },
      },
    };
  } catch {
    return { version: 1, game: null, profile: initialProfile() };
  }
}

export function save(data: Save): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
}

export function finish(profile: Profile, game: Game): Profile {
  if (game.status === 'playing') return profile;
  const win = game.status === 'won';
  const m = medal(game.actions.length);
  return {
    ...profile,
    xp: profile.xp + (win ? 16 : 4),
    games: profile.games + 1,
    wins: profile.wins + Number(win),
    best: win ? Math.min(profile.best ?? 21, game.actions.length) : profile.best,
    medals: win ? { ...profile.medals, [m]: profile.medals[m] + 1 } : profile.medals,
    history: [{ actions: game.actions.length, win, date: today() }, ...profile.history].slice(0, 100),
  };
}

export function train(profile: Profile, id: string, correct: boolean): Profile {
  const now = Date.now();
  const old = profile.training[id] ?? { correct: 0, total: 0, dueAt: now, interval: 0 };
  const interval = correct ? Math.min(30, old.interval ? old.interval * 2 : 1) : 0;
  const daily = profile.daily.date === today() ? profile.daily : { date: today(), count: 0, claimed: false };
  const count = daily.count + Number(correct);
  const claimed = daily.claimed || count >= 3;
  return {
    ...profile,
    xp: profile.xp + (correct ? 8 : 0) + (!daily.claimed && claimed ? 20 : 0),
    dailyCompleted: profile.dailyCompleted + Number(!daily.claimed && claimed),
    daily: { ...daily, count, claimed },
    training: {
      ...profile.training,
      [id]: {
        correct: old.correct + Number(correct),
        total: old.total + 1,
        interval,
        dueAt: now + interval * 86400000,
      },
    },
  };
}

export function badges(profile: Profile): { id: string; title: string; detail: string; earned: boolean }[] {
  const correct = Object.values(profile.training).reduce((n, r) => n + r.correct, 0);
  return [
    { id: 'start', title: 'Primeira pista', detail: 'Conclua 1 partida', earned: profile.games >= 1 },
    { id: 'win', title: 'Primeiro acerto', detail: 'Vença 1 partida', earned: profile.wins >= 1 },
    { id: 'streak', title: 'Investigador', detail: 'Vença 5 partidas', earned: profile.wins >= 5 },
    {
      id: 'gold',
      title: 'Dez movimentos',
      detail: 'Vença em até 10 ações',
      earned: profile.best !== null && profile.best <= 10,
    },
    { id: 'scholar', title: 'Estudioso', detail: 'Acerte 5 exercícios', earned: correct >= 5 },
    {
      id: 'daily',
      title: 'Missão cumprida',
      detail: 'Acerte 3 treinos no dia',
      earned: profile.dailyCompleted > 0,
    },
  ];
}
