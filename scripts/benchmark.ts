import { targets } from '../src/data/targets';
import { questions } from '../src/data/questions';
import { simulate } from '../src/engine/simulate';

console.log(
  JSON.stringify(
    {
      reference12: [simulate(targets, questions, 'fixed'), simulate(targets, questions, 'adaptive')],
      broader60: simulate(targets, questions, 'adaptive', 60),
    },
    null,
    2,
  ),
);
