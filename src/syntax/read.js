import lex from './lex.js';
import parse from './parse.js';
import sequence from './sequence.js';
import curry from './curry.js';
import address from './address.js';
import annotate from './annotate.js';

export default function read(source) {
  return annotate(address(curry(sequence(parse(lex(source))))));
}
