import { describe, expect, it } from 'vitest';
import { getExercise } from '../ui/App';

describe('Academia', () => {
  it('gera quatro modalidades com resposta selecionável e alternativas distintas', () => {
    for (const mode of ['memory', 'reading', 'split', 'error'] as const) {
      const exercise = getExercise(mode, 3);
      expect(exercise.mode).toBe(mode);
      expect(exercise.options).toContain(exercise.correct);
      expect(new Set(exercise.options).size).toBe(exercise.options.length);
      expect(exercise.note.length).toBeGreaterThan(30);
    }
  });
  it('alterna situações de erro em vez de repetir um gabarito fixo', () => {
    const cases = [0, 1, 2].map((step) => getExercise('error', step));
    expect(new Set(cases.map((c) => c.correct)).size).toBe(3);
  });
  it('uma ficha sem anotação explícita ensina “Não sei”, nunca “Não”', () => {
    const exercises = Array.from({ length: 100 }, (_, i) => getExercise('reading', i));
    expect(exercises.some((exercise) => exercise.correct === 'Não sei')).toBe(true);
  });
});
