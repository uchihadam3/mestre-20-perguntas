import { targets } from './targets';
import { attribute, questions, validateTraitEvidence } from './questions';

export function validateData(): string[] {
  const issues: string[] = validateTraitEvidence(targets);
  if (targets.length < 150) issues.push(`A seed tem apenas ${targets.length} alvos`);
  if (questions.length < 35) issues.push(`O catálogo tem apenas ${questions.length} perguntas`);
  const unique = (items: string[], label: string) => {
    if (new Set(items).size !== items.length) issues.push(`${label} duplicado`);
  };
  unique(
    targets.map((t) => t.id),
    'ID de alvo',
  );
  unique(
    targets.map((t) => t.name.toLowerCase()),
    'Nome de alvo',
  );
  unique(
    questions.map((q) => q.id),
    'ID de pergunta',
  );
  for (const t of targets) {
    if (!t.name || !t.origin || !t.provenance) issues.push(`Ficha incompleta: ${t.id}`);
    if (t.fameTier < 1 || t.fameTier > 5) issues.push(`Nível inválido: ${t.id}`);
    if (t.tags.filter((tag) => ['real', 'fictional', 'group'].includes(tag)).length !== 1)
      issues.push(`Tipo contraditório: ${t.id}`);
    if (t.tags.filter((tag) => ['br', 'us', 'jp', 'uk', 'mx'].includes(tag)).length > 1)
      issues.push(`Origem contraditória: ${t.id}`);
    if (t.tags.includes('hero') && t.tags.includes('villain')) issues.push(`Papel contraditório: ${t.id}`);
  }
  for (const q of questions) {
    const values = targets.map((t) => attribute(t, q));
    if (!values.includes('yes') || (!values.includes('no') && !values.includes('unknown')))
      issues.push(`Pergunta sem divisão: ${q.id}`);
    if (q.unknownRate < 0 || q.unknownRate >= 1 || q.cost < 0) issues.push(`Parâmetros inválidos: ${q.id}`);
  }
  return issues;
}
