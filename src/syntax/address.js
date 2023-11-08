/**
 * Replace identifiers in terms and props with their lexical addresses.
 */
export default function address(term, params = [], propParams = []) {
  if (term.type === 'IDENT') {
    const { text } = term;
    const addr = params.indexOf(text);
    if (addr < 0) {
      throw new Error(`unbound ident: ${text}`);
    }

    return {
      type: 'ADDR',
      addr,
    };
  } else if (term.type === 'SUPP') {
    const { param, body } = term;

    return {
      type: 'SUPP',
      param,
      body: address(body, [param, ...params], propParams),
    };
  } else if (term.type === 'INVOC') {
    const { rator, rand } = term;

    return {
      type: 'INVOC',
      rator: address(rator, params, propParams),
      rand: address(rand, params, propParams),
    };
  } else if (term.type === 'PROP_ABS') {
    const { param, body } = term;

    return {
      type: 'PROP_ABS',
      param,
      body: address(body, params, [param, ...propParams]),
    };
  } else if (term.type === 'PROP_APP') {
    const { rator, rand } = term;

    return {
      type: 'PROP_APP',
      rator: address(rator, params, propParams),
      rand: addressProp(rand, propParams),
    };
  } else if (term.type === 'TRUST_ME') {
    return term;
  } else if (term.type === 'LET') {
    const { ident, term: rhsTerm, ascription, body } = term;

    return {
      type: 'LET',
      ident,
      ...(ascription && {
        ascription: addressProp(ascription, propParams),
      }),
      term: address(rhsTerm, params, propParams),
      body: address(body, [ident, ...params], propParams),
    };
  } else if (term.type === 'CHECK') {
    const { term: innerTerm, body } = term;

    return {
      type: 'CHECK',
      term: address(innerTerm, params, propParams),
      body: address(body, params, propParams),
    };
  } else if (term.type === 'UNIT') {
    return term;
  }
}

function addressProp(prop, propParams) {
  if (prop.type === 'IDENT') {
    const { text } = prop;
    const addr = propParams.indexOf(text);
    if (addr < 0) {
      throw new Error(`unbound param ident: ${text}`);
    }

    return {
      type: 'ADDR',
      addr,
    };
  } else if (prop.type === 'BIN_PROP') {
    const { op, lhs, rhs } = prop;

    return {
      type: 'BIN_PROP',
      op,
      lhs: addressProp(lhs, propParams),
      rhs: addressProp(rhs, propParams),
    };
  } else if (prop.type === 'UN_PROP') {
    const { op, prop: innerProp } = prop;

    return {
      type: 'UN_PROP',
      op,
      prop: addressProp(innerProp, propParams),
    };
  } else if (prop.type === 'FORALL') {
    const { param, body } = prop;

    return {
      type: 'FORALL',
      param,
      body: addressProp(body, [param, ...propParams]),
    };
  }
}
