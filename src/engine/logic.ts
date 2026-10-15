import type { Game, Question } from '../domain/types';

/**
 * Deterministic facts inferred from decisive answers.
 *
 * This is intentionally separate from the Bayesian posterior: user answers
 * "Talvez" and "Não sei" must not silently become yes/no facts, and a
 * classification that can overlap another one must not be called exclusive.
 */
const EXCLUSIVE_FAMILIES: readonly (readonly string[])[] = [
  ['real', 'fictional', 'group'],
  // Country of origin of the person or work (not fictional nationality).
  ['br', 'us', 'jp', 'uk', 'mx'],
];

const IMPLIES: Readonly<Record<string, readonly string[]>> = {
  cartoon: ['fictional'],
  anime: ['fictional'],
  hero: ['fictional'],
  villain: ['fictional'],
  animal: ['fictional'],
  robot: ['fictional'],
  football: ['sport'],
  basket: ['sport'],
  lakers: ['basket', 'sport', 'real'],
  bulls: ['basket', 'sport', 'real'],
  nba90s: ['basket', 'sport', 'real'],
  olderfootball: ['football', 'sport', 'real'],
  threecups: ['football', 'sport', 'real'],
  simpsons: ['cartoon', 'fictional'],
  spongebob: ['cartoon', 'fictional'],
  dragonball: ['anime', 'fictional'],
  naruto: ['anime', 'fictional'],
  mario: ['game', 'fictional'],
  zelda: ['game', 'fictional'],
  letterr: ['fictional'],
  nuclearjob: ['simpsons', 'fictional'],
  relativity: ['science', 'real'],
  marvelheroine: ['marvel', 'real'],
  spyheroine: ['marvelheroine', 'marvel', 'real'],
  blackwidow: ['spyheroine', 'marvelheroine', 'marvel', 'real'],
  santosclub: ['football', 'sport', 'real'],
  barbiesong: ['music', 'real'],
  construcao: ['music', 'real'],
};

const ONLY_AFTER_YES: Readonly<Record<string, string>> = {
  animatedfilm: 'cartoon',
};

// Context is different from formal entailment. Shrek, for example, is BOTH
// an animated cartoon and a film, so "cartoon yes" does not mean "film no".
// The broad film/series questions would, however, sound like starting over.
// Offer a more precise animated-film follow-up instead.
const TOO_BROAD_AFTER_YES: Readonly<Record<string, readonly string[]>> = {
  cartoon: ['anime', 'film', 'series', 'novela'],
  anime: ['cartoon', 'film', 'series', 'novela'],
};

export const CERTAIN_CLASSIFICATIONS = new Set(['real', 'fictional', 'group', 'br', 'us', 'jp', 'uk', 'mx']);

export type FactReport = { facts: Map<string, boolean>; conflict: number | null; reason: string | null };

/** Each fact retains the answer that established it, including implications.
 * Overlapping media are never made mutually exclusive. A conflict suspends
 * decisions until the player edits an answer. */
export function analyzeFacts(game: Game): FactReport {
  const facts = new Map<string, boolean>();
  const source = new Map<string, number>();
  let conflict: number | null = null;
  let reason: string | null = null;
  const assign = (id: string, value: boolean, index: number) => {
    if (facts.has(id)) {
      if (facts.get(id) !== value && conflict === null) {
        conflict = index;
        reason = id;
      }
      return false;
    }
    facts.set(id, value);
    source.set(id, index);
    return true;
  };
  for (const [index, action] of game.actions.entries()) {
    if (action.kind !== 'answer' || (action.answer !== 'yes' && action.answer !== 'no')) continue;
    assign(action.questionId, action.answer === 'yes', index);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, yes] of [...facts]) {
        const origin = source.get(id) ?? index;
        if (yes) {
          for (const family of EXCLUSIVE_FAMILIES) {
            if (family.includes(id))
              for (const sibling of family)
                if (sibling !== id) changed = assign(sibling, false, origin) || changed;
          }
          for (const parent of IMPLIES[id] ?? []) changed = assign(parent, true, origin) || changed;
        } else {
          // If A implies B, then "no B" implies "no A".
          for (const [child, parents] of Object.entries(IMPLIES)) {
            if (parents.includes(id)) changed = assign(child, false, origin) || changed;
          }
        }
      }
    }
  }
  return { facts, conflict, reason };
}

export function logicalFacts(game: Game): Map<string, boolean> {
  return analyzeFacts(game).facts;
}

export function isQuestionAllowed(game: Game, question: Question): boolean {
  const { facts, conflict } = analyzeFacts(game);
  if (conflict !== null) return false;
  if (facts.has(question.id)) return false;
  const prerequisite = ONLY_AFTER_YES[question.id];
  if (prerequisite && facts.get(prerequisite) !== true) return false;
  if (
    Object.entries(TOO_BROAD_AFTER_YES).some(
      ([answered, blocked]) => facts.get(answered) === true && blocked.includes(question.id),
    )
  )
    return false;
  if (question.applicable?.every((type) => facts.get(type) === false)) return false;
  return true;
}
