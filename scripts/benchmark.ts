import { targets } from '../src/data/targets';
import { questions } from '../src/data/questions';
import { simulate } from '../src/engine/simulate';

console.log(
  JSON.stringify(
    {
      reference12: [simulate(targets, questions, 'fixed'), simulate(targets, questions, 'adaptive')],
      broader60: simulate(targets, questions, 'adaptive', 60),
      editorialAnswers: {
        reference12: simulate(targets, questions, 'adaptive', 12, 'editorial'),
        broader60: simulate(targets, questions, 'adaptive', 60, 'editorial', 'spaced'),
        holdout36: simulate(targets, questions, 'adaptive', 36, 'editorial', 'holdout'),
      },
      depth2Comparison: {
        reference12: simulate(targets, questions, 'adaptive', 12, 'editorial', 'reference', 2),
        holdout36: simulate(targets, questions, 'adaptive', 36, 'editorial', 'holdout', 2),
      },
    },
    null,
    2,
  ),
);
