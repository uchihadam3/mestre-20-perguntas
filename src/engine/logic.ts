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
  // Western animation and Japanese anime/manga as origin classifications.
  ['cartoon', 'anime'],
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
  marvelheroine: ['marvel', 'film', 'real'],
  spyheroine: ['marvel', 'film', 'real'],
};

const ONLY_AFTER_YES: Readonly<Record<string, string>> = {
  animatedfilm: 'cartoon',
};

// Context is different from formal entailment. Shrek, for example, is BOTH
// an animated cartoon and a film, so "cartoon yes" does not mean "film no".
// The broad film/series questions would, however, sound like starting over.
// Offer a more precise animated-film follow-up instead.
const TOO_BROAD_AFTER_YES: Readonly<Record<string, readonly string[]>> = {
  cartoon: ['film', 'series', 'novela'],
  anime: ['film', 'series', 'novela'],
};

export const CERTAIN_CLASSIFICATIONS = new Set([
  'real', 'fictional', 'group',
  'br', 'us', 'jp', 'uk', 'mx',
  'cartoon', 'anime',
]);

export function logicalFacts(game: Game): Map<string, boolean> {
  const facts = new Map<string, boolean>();
  for (const action of game.actions) {
    if (action.kind !== 'answer' || (action.answer !== 'yes' && action.answer !== 'no')) continue;
    facts.set(action.questionId, action.answer === 'yes');
  }

  // Compute implications and their contrapositives to a fixed point.
  // A contradiction in previously stored responses does not erase history;
  // the UI needs to offer undo/correction, rather than asking more guesses.
  let changed = true;
  while (changed) {
    changed = false;
    const assign = (id: string, value: boolean) => {
      if (facts.has(id)) return;
      facts.set(id, value);
      changed = true;
    };
    for (const [id, yes] of [...facts]) {
      if (yes) {
        for (const family of EXCLUSIVE_FAMILIES) {
          if (family.includes(id)) for (const sibling of family) if (sibling !== id) assign(sibling, false);
        }
        for (const parent of IMPLIES[id] ?? []) assign(parent, true);
      } else {
        // If A implies B, then "no B" implies "no A".
        for (const [child, parents] of Object.entries(IMPLIES)) {
          if (parents.includes(id)) assign(child, false);
        }
      }
    }
  }
  return facts;
}

export function isQuestionAllowed(game: Game, question: Question): boolean {
  const facts = logicalFacts(game);
  if (facts.has(question.id)) return false;
  const prerequisite = ONLY_AFTER_YES[question.id];
  if (prerequisite && facts.get(prerequisite) !== true) return false;
  if (
    Object.entries(TOO_BROAD_AFTER_YES).some(
      ([answered, blocked]) => facts.get(answered) === true && blocked.includes(question.id),
    )
  ) return false;
  if (question.applicable?.every((type) => facts.get(type) === false)) return false;
  return true;
}
