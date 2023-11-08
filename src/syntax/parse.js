/**
 * Parses a source file according to the following grammar:
 *
 * Prog = Item*
 *
 * Item = Let ";"
 *      | Check ";"
 *
 * Let = "let" Ident [ ":" Prop ] = Term
 *
 * Check = "$check" "(" Term ")"
 *
 * Term = Term1 ( [ "<" Prop+ ">" ] | [ "(" Term+ ")" ] )*
 * Term1 = Ident
 *       | "supposing" "(" Ident+ ")" "{" Body "}"
 *       | "<" Ident+ ">" Term
 *       | "$trust_me"
 *       | "{" Item* Term "}"
 * Body = Item* Term
 *
 * Prop = Prop1 [ "=>" Prop ]*
 * Prop1 = Prop2 [ "|" Prop2 ]*
 * Prop2 = Prop3 [ "&" Prop3 ]*
 * Prop3 = [ "~" ] Prop3 | Prop4
 * Prop4 = Ident
 *       | "forall" Ident+ ";" Prop
 *       | "(" Prop ")"
 */
export default function parse(ts) {
  const items = [];

  while (ts.hasMore()) {
    items.push(parseItem(ts));
    ts.expect('SEMI');
  }

  return items;
}

function parseItem(ts) {
  const peek = ts.peek();

  if (peek.type === 'LET_KW') {
    return parseLet(ts);
  } else if (peek.type === 'CHECK_KW') {
    return parseCheck(ts);
  } else {
    throw new Error('bad item');
  }
}

function parseLet(ts) {
  ts.expect('LET_KW');
  const ident = ts.expect('IDENT').text;

  let ascription;
  if (ts.peek().type === 'COLON') {
    ts.expect('COLON');
    ascription = parseProp(ts);
  }

  ts.expect('EQ');
  const term = parseTerm(ts);

  return {
    type: 'LET',
    ident,
    ascription,
    term,
  };
}

function parseProp(ts) {
  let prop = parseProp1(ts);

  while (ts.hasMore() && ts.peek().type === 'ARROW') {
    ts.next();
    const rhs = parseProp(ts);

    prop = {
      type: 'BIN_PROP',
      op: 'IMPL',
      lhs: prop,
      rhs,
    };
  }

  return prop;
}

function parseProp1(ts) {
  let prop = parseProp2(ts);

  while (ts.hasMore() && ts.peek().type === 'PIPE') {
    ts.next();
    const rhs = parseProp2(ts);

    prop = {
      type: 'BIN_PROP',
      op: 'DISJ',
      lhs: prop,
      rhs,
    };
  }

  return prop;
}

function parseProp2(ts) {
  let prop = parseProp3(ts);

  while (ts.hasMore() && ts.peek().type === 'AMP') {
    ts.next();
    const rhs = parseProp3(ts);

    prop = {
      type: 'BIN_PROP',
      op: 'CONJ',
      lhs: prop,
      rhs,
    };
  }

  return prop;
}

function parseProp3(ts) {
  if (ts.peek().type === 'TILDE') {
    ts.next();
    const prop = parseProp3(ts);

    return {
      type: 'UN_PROP',
      op: 'NEG',
      prop,
    };
  } else {
    return parseProp4(ts);
  }
}

function parseProp4(ts) {
  const peek = ts.peek();

  if (peek.type === 'IDENT') {
    return ts.next();
  } else if (peek.type === 'FORALL_KW') {
    return parseForall(ts);
  } else if (peek.type === 'LPAREN') {
    ts.next();
    const prop = parseProp(ts);
    ts.expect('RPAREN');
    return prop;
  } else {
    throw new Error('bad prop');
  }
}

function parseForall(ts) {
  ts.expect('FORALL_KW');
  const params = parseCommaSep(ts, parseParam, 'SEMI');
  ts.expect('SEMI');
  const body = parseProp(ts);

  return {
    type: 'FORALL',
    params,
    body,
  };
}

function parseParam(ts) {
  return ts.expect('IDENT').text;
}

function parseCommaSep(ts, parseElt, stopType) {
  const elts = [];

  elts.push(parseElt(ts));
  while (ts.peek().type !== stopType) {
    ts.expect('COMMA');

    if (ts.peek().type === stopType) {
      break;
    }

    elts.push(parseElt(ts));
  }

  return elts;
}

function parseTerm(ts) {
  let term = parseTerm1(ts);

  while (ts.hasMore() && ['LPAREN', 'LANGLE'].includes(ts.peek().type)) {
    const opener = ts.next();

    if (opener.type === 'LPAREN') {
      const rands = parseCommaSep(ts, parseTerm, 'RPAREN');
      ts.expect('RPAREN');

      term = {
        type: 'INVOC',
        rator: term,
        rands,
      };
    } else {
      const rands = parseCommaSep(ts, parseProp, 'RANGLE');
      ts.expect('RANGLE');

      term = {
        type: 'PROP_APP',
        rator: term,
        rands,
      };
    }
  }

  return term;
}

function parseTerm1(ts) {
  const peek = ts.peek();

  if (peek.type === 'IDENT') {
    return ts.next();
  } else if (peek.type === 'SUPPOSING_KW') {
    return parseSupp(ts);
  } else if (peek.type === 'LANGLE') {
    return parsePropAbs(ts);
  } else if (peek.type === 'TRUST_ME_KW') {
    ts.next();

    return {
      type: 'TRUST_ME',
    };
  } else if (peek.type === 'LCURLY') {
    return parseBlock(ts);
  } else {
    throw new Error('bad term');
  }
}

function parseSupp(ts) {
  ts.expect('SUPPOSING_KW');
  ts.expect('LPAREN');
  const params = parseCommaSep(ts, parseParam, 'RPAREN');
  ts.expect('RPAREN');

  const body = parseBlock(ts);

  return {
    type: 'SUPP',
    params,
    body,
  };
}

function parseBlock(ts) {
  const items = [];
  let term;

  ts.expect('LCURLY');
  while (ts.peek().type !== 'RCURLY') {
    if (startsItem(ts.peek().type)) {
      items.push(parseItem(ts));
      ts.expect('SEMI');
    } else {
      term = parseTerm(ts);
      break;
    }
  }
  ts.expect('RCURLY');

  return { type: 'BLOCK', items, term };
}

function startsItem(type) {
  return ['LET_KW', 'CHECK_KW'].includes(type);
}

function parsePropAbs(ts) {
  ts.expect('LANGLE');
  const params = parseCommaSep(ts, parseParam, 'RANGLE');
  ts.expect('RANGLE');
  const body = parseTerm(ts);

  return {
    type: 'PROP_ABS',
    params,
    body,
  };
}

function parseCheck(ts) {
  ts.expect('CHECK_KW');
  ts.expect('LPAREN');
  const term = parseTerm(ts);
  ts.expect('RPAREN');

  return {
    type: 'CHECK',
    term,
  };
}
