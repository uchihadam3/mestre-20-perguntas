import { validateData } from '../src/data/validate';
import { targets } from '../src/data/targets';
import { questions } from '../src/data/questions';

const issues = validateData();
console.log(
  `${targets.length} alvos; ${questions.length} perguntas; ${issues.length} problemas estruturais.`,
);
for (const issue of issues) console.error(`- ${issue}`);
if (issues.length) process.exitCode = 1;
