/**
 * Replace let ascriptions with annotations of their righthand side terms.
 */
export default function annotate(term) {
  if (term.type === 'ADDR') {
    return term;
  } else if (term.type === 'SUPP') {
    const { param, body } = term;

    return {
      type: 'SUPP',
      param,
      body: annotate(body),
    };
  } else if (term.type === 'INVOC') {
    const { rator, rand } = term;

    return {
      type: 'INVOC',
      rator: annotate(rator),
      rand: annotate(rand),
    };
  } else if (term.type === 'PROP_ABS') {
    const { param, body } = term;

    return {
      type: 'PROP_ABS',
      param,
      body: annotate(body),
    };
  } else if (term.type === 'PROP_APP') {
    const { rator, rand } = term;

    return {
      type: 'PROP_APP',
      rator: annotate(rator),
      rand,
    };
  } else if (term.type === 'TRUST_ME') {
    return term;
  } else if (term.type === 'LET') {
    const { ident, ascription, term: rhsTerm, body } = term;

    const annotatedRhs = annotate(rhsTerm);

    return {
      type: 'LET',
      ident,
      term: ascription
        ? {
            type: 'ANN',
            term: annotatedRhs,
            prop: ascription,
          }
        : annotatedRhs,
      body: annotate(body),
    };
  } else if (term.type === 'CHECK') {
    const { term: innerTerm, body } = term;

    return {
      type: 'CHECK',
      term: annotate(innerTerm),
      body: annotate(body),
    };
  } else if (term.type === 'UNIT') {
    return term;
  }
}
