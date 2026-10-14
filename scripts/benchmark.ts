import { targets } from '../src/data/targets';
import { questions } from '../src/data/questions';
import { simulate } from '../src/engine/simulate';

console.log(
  JSON.stringify([simulate(targets, questions, 'fixed'), simulate(targets, questions, 'adaptive')], null, 2),
);
