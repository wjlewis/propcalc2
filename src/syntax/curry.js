/**
 * Curries abstractions, applications, and quantified types. Does not introduce
 * any new terms or props.
 */
export default function curry(term) {
  if (term.type === 'IDENT') {
    return term;
  } else if (term.type === 'SUPP') {
    const { params, body } = term;

    return params.reduceRight(
      (body, param) => ({
        type: 'SUPP',
        param,
        body,
      }),
      curry(body)
    );
  } else if (term.type === 'INVOC') {
    const { rator, rands } = term;

    return rands.reduce(
      (rator, rand) => ({
        type: 'INVOC',
        rator,
        rand: curry(rand),
      }),
      curry(rator)
    );
  } else if (term.type === 'PROP_ABS') {
    const { params, body } = term;

    return params.reduceRight(
      (body, param) => ({
        type: 'PROP_ABS',
        param,
        body,
      }),
      curry(body)
    );
  } else if (term.type === 'PROP_APP') {
    const { rator, rands } = term;

    return rands.reduce(
      (rator, rand) => ({
        type: 'PROP_APP',
        rator,
        rand: curryProp(rand),
      }),
      curry(rator)
    );
  } else if (term.type === 'TRUST_ME') {
    return term;
  } else if (term.type === 'LET') {
    const { ident, ascription, term: rhsTerm, body } = term;

    return {
      type: 'LET',
      ident,
      ...(ascription && { ascription: curryProp(ascription) }),
      term: curry(rhsTerm),
      body: curry(body),
    };
  } else if (term.type === 'CHECK') {
    const { term: innerTerm, body } = term;

    return {
      type: 'CHECK',
      term: curry(innerTerm),
      body: curry(body),
    };
  } else if (term.type === 'UNIT') {
    return term;
  }
}

function curryProp(prop) {
  if (prop.type === 'IDENT') {
    return prop;
  } else if (prop.type === 'BIN_PROP') {
    const { op, lhs, rhs } = prop;

    return {
      type: 'BIN_PROP',
      op,
      lhs: curryProp(lhs),
      rhs: curryProp(rhs),
    };
  } else if (prop.type === 'UN_PROP') {
    const { op, prop: innerProp } = prop;

    return {
      type: 'UN_PROP',
      op,
      prop: curryProp(innerProp),
    };
  } else if (prop.type === 'FORALL') {
    const { params, body } = prop;

    return params.reduceRight(
      (body, param) => ({
        type: 'FORALL',
        param,
        body,
      }),
      curryProp(body)
    );
  }
}
