import resolve from './resolve.js';
import unaddress from './unaddress.js';
import uncurry from './uncurry.js';

export default function (prop, ctx) {
  return print(uncurry(unaddress(resolve(prop, ctx))));
}

function print(prop, lPrec = 0, rPrec = 0) {
  if (prop.type === 'IDENT') {
    const { text } = prop;
    return text;
  } else if (prop.type === 'BIN_PROP') {
    const { op, lhs, rhs } = prop;

    const innerPrec = opPrec[op];
    const wrap =
      (op === 'IMPL' ? innerPrec <= rPrec : innerPrec < rPrec) ||
      innerPrec < lPrec;

    const lhsP = print(lhs, wrap ? 0 : lPrec, innerPrec);
    const rhsP = print(rhs, innerPrec, wrap ? 0 : rPrec);

    return parenIf(`${lhsP} ${opText[op]} ${rhsP}`, wrap);
  } else if (prop.type === 'UN_PROP') {
    const { op, prop: innerProp } = prop;

    return `${opText[op]}${print(innerProp, opPrec[op], 0)}`;
  } else if (prop.type === 'FORALL') {
    const { params, body } = prop;

    return `forall ${params.join(', ')}; ${print(body, lPrec, rPrec)}`;
  } else if (prop.type === 'ANY') {
    return 'any';
  } else if (prop.type === 'UNIT') {
    return '()';
  }
}

const opPrec = {
  IMPL: 1,
  DISJ: 2,
  CONJ: 3,
  NEG: 4,
};

const opText = {
  IMPL: '=>',
  DISJ: '|',
  CONJ: '&',
  NEG: '~',
};

function parenIf(text, cond) {
  if (cond) {
    return `(${text})`;
  } else {
    return text;
  }
}
