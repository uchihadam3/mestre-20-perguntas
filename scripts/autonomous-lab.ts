import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { targets } from '../src/data/targets';
import { questions } from '../src/data/questions';
import {
  catalogFingerprint,
  cohorts,
  indistinguishable,
  openingFor,
  runLab,
  type LabReport,
  type Summary,
} from '../src/lab/autonomous';

const flag = (name: string, fallback: number) => {
  const value = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw Error(`--${name} deve ser inteiro positivo`);
  return number;
};
const ci = process.argv.includes('--ci');
const sourcePath = process.argv
  .find((arg) => arg.startsWith('--source-report='))
  ?.slice('--source-report='.length);
const saved = sourcePath ? (JSON.parse(readFileSync(resolve(sourcePath), 'utf8')) as LabReport) : null;
const output =
  process.argv.find((arg) => arg.startsWith('--output='))?.slice('--output='.length) ?? 'reports/latest';
const seed = flag('seed', saved?.config.seed ?? 20261015);
const repeats = flag('repeats', saved?.config.trials ?? (ci ? 1 : 8));
const maxMs = flag('max-ms', ci ? 120000 : 1200000);
const search = flag('search', ci ? 2 : 4);
const sampleLimit = ci ? flag('sample', 6) : undefined;
const report = saved
  ? {
      ...saved,
      catalog: {
        targets: targets.length,
        questions: questions.length,
        fingerprint: catalogFingerprint(targets, questions),
      },
      opening: openingFor(
        cohorts(targets, seed).train,
        questions,
        questions.find((q) => q.id === saved.opening.first)!,
      ),
      indistinguishable: indistinguishable(targets, questions),
    }
  : runLab(targets, questions, { seed, repeats, maxMs, search, sampleLimit });
const path = resolve(output);
mkdirSync(dirname(path), { recursive: true });
writeFileSync(`${path}.json`, JSON.stringify(report, null, 2) + '\n');

const row = (name: string, s: Summary) =>
  `| ${name} | ${s.wins}/${s.games} | ${s.within5} | ${s.within10} | ${s.within15} | ${s.within20} | ${s.meanActions.toFixed(1)} | ${s.falseGuesses} | ${s.wasted} | ${s.weak} | ${s.conflicts} |`;
const table = (entries: [string, Summary][]) =>
  [
    '| Política / cenário | Acertos | ≤5 | ≤10 | ≤15 | ≤20 | Ações médias | Palpites errados | Sem divisão | Ganho < 0,01 | Conflitos |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...entries.map(([name, summary]) => row(name, summary)),
  ].join('\n');
const top = report.alternatives.map(
  ({ first, validation }) =>
    [questions.find((q) => q.id === first)?.text ?? first, validation] as [string, Summary],
);
const markdown = `# Laboratório Autônomo — simulação ${ci ? 'reduzida do CI' : 'ampla'}

Seed ${seed}; ${report.catalog.targets} fichas, ${report.catalog.questions} perguntas; coortes treino/validação/holdout ${report.cohorts.train}/${report.cohorts.validation}/${report.cohorts.holdout}. Cenários pareados usam os mesmos alvos e seeds por política. O holdout não seleciona perguntas. Popularidade e atributos são hipóteses editoriais, não respostas humanas.

## Estratégias na validação (respostas conhecidas)

${table(report.strategies.map((c) => [c.policy, c.overall]))}

## Primeiras perguntas candidatas na validação

${table(top)}

Escolha exploratória: **${questions.find((q) => q.id === report.opening.first)?.text ?? report.opening.first}**.
${report.alternatives.filter((a) => a.validation.within20 === report.alternatives[0].validation.within20).length > 1 ? 'Houve empate em acertos na validação; nenhuma primeira pergunta superior foi comprovada.' : 'A escolha venceu as alternativas no critério primário da validação, sujeita ao holdout.'}

| Resposta | Massa no treino | Próxima pergunta | Terceiras se a próxima for Sim / Não / Talvez / Não sei |
|---|---:|---|---|
${report.opening.branches.map((b) => `| ${b.answer} | ${(b.mass * 100).toFixed(1)}% | ${questions.find((q) => q.id === b.next)?.text ?? 'Sem divisão confiável'} | ${(['yes', 'no', 'maybe', 'dont_know'] as const).map((answer) => questions.find((q) => q.id === b.thirdByAnswer[answer])?.text ?? '—').join(' / ')} |`).join('\n')}

## Holdout — mesma distribuição e seeds

${table([
  ['política publicada', report.baseline.overall],
  ['abertura candidata', report.holdout[0].overall],
  ...Object.entries(report.baseline.scenarios).map(
    ([key, value]) => [`atual / ${key}`, value] as [string, Summary],
  ),
  ...Object.entries(report.holdout[0].scenarios).map(
    ([key, value]) => [`candidata / ${key}`, value] as [string, Summary],
  ),
])}

Promoção automática: **${report.approved ? 'elegível para revisão humana e integração' : 'não aprovada'}**. ${report.reason} A estratégia publicada não é alterada por este comando nem pelo agendamento.

## Cobertura e limites

- Alvos indistinguíveis: ${report.indistinguishable.length} grupos. Prioridade de curadoria:
${
  report.indistinguishable
    .slice(0, 8)
    .map((pair) => `  - ${pair.names.join(' / ')} — ${pair.research}`)
    .join('\n') || '  - Nenhum grupo detectado.'
}
- Fichas sem resposta explícita são respondidas “Não sei”. O cenário “fora” remove o alvo da base de candidatos; não atribui um palpite correto fictício. “Talvez” e ruído são simulados por seeds, não amostra humana.
- Há apenas ${report.cohorts.holdout} fichas diferentes no holdout e ${repeats} repetição(ões) por cenário. Mais partidas não criam novas pessoas nem corrigem lacunas factuais. Não interpretar as taxas como confiabilidade real.
- Tempo do comparativo: atual ${report.baseline.elapsedMs} ms; candidata ${report.holdout[0].elapsedMs} ms. JSON contém recortes por região e fama.
`;
writeFileSync(`${path}.md`, markdown);
const gatePath = process.argv.find((arg) => arg.startsWith('--gate='))?.slice('--gate='.length);
if (gatePath) {
  const previous = JSON.parse(readFileSync(resolve(gatePath), 'utf8')) as {
    catalog: LabReport['catalog'];
    config: { seed: number; sample: number };
    baseline: Summary;
  };
  if (
    previous.catalog.fingerprint === report.catalog.fingerprint &&
    previous.config.seed === seed &&
    previous.config.sample === sampleLimit
  ) {
    const now = report.baseline.overall;
    const before = previous.baseline;
    if (
      now.games !== before.games ||
      now.within20 < before.within20 ||
      now.within10 < before.within10 ||
      now.wasted > before.wasted ||
      now.conflicts > before.conflicts
    )
      throw Error('Regressão contra reports/regression.json; consulte o relatório do CI.');
  } else console.warn('Catálogo/coorte mudou: baseline histórico não comparável; revisar fixture.');
}
console.log(
  JSON.stringify(
    {
      output: path,
      games:
        report.baseline.overall.games +
        report.holdout[0].overall.games +
        report.strategies.reduce((n, c) => n + c.overall.games, 0) +
        report.candidates.reduce((n, c) => n + c.overall.games, 0),
      first: report.opening.first,
      baseline: report.baseline.overall,
      proposed: report.holdout[0].overall,
      approved: report.approved,
      reason: report.reason,
    },
    null,
    2,
  ),
);
