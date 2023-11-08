/**
 * Produces a `Tokens` object for the provided source file. Trivia (whitespace
 * and comments) are removed. Each token includes its type and text.
 */
export default function lex(source) {
  const tokens = [];
  let pos = 0;

  function skipTrivia() {
    while (pos < source.length) {
      const c = source[pos];

      if (c === '/' && source[pos + 1] === '/') {
        skipWhile(c => !'\n\r'.includes(c));
      } else if (' \t\n\r'.includes(c)) {
        pos++;
      } else {
        break;
      }
    }
  }

  function skipWhile(pred) {
    while (pos < source.length && pred(source[pos])) {
      pos++;
    }
  }

  skipTrivia();
  while (pos < source.length) {
    const startPos = pos;
    const c = source[pos++];

    let type;
    if (c in simpleTypes) {
      type = simpleTypes[c];
      while (typeof type === 'object' && pos < source.length) {
        if (source[pos] in type) {
          type = type[source[pos++]];
        } else {
          type = type.default;
        }
      }
    } else if (startsIdent(c)) {
      skipWhile(continuesIdent);
      type = 'IDENT';
    } else {
      throw new Error('bad token');
    }

    const text = source.slice(startPos, pos);
    tokens.push({
      // Switch to the appropriate keyword type if the text was a keyword.
      type: keywords[text] ?? type,
      text,
    });

    skipTrivia();
  }

  return new Tokens(tokens);
}

const simpleTypes = {
  '(': 'LPAREN',
  ')': 'RPAREN',
  '{': 'LCURLY',
  '}': 'RCURLY',
  '<': 'LANGLE',
  '>': 'RANGLE',
  ':': 'COLON',
  ';': 'SEMI',
  ',': 'COMMA',
  '&': 'AMP',
  '|': 'PIPE',
  '~': 'TILDE',
  '=': {
    default: 'EQ',
    '>': 'ARROW',
  },
};

const keywords = {
  $check: 'CHECK_KW',
  $trust_me: 'TRUST_ME_KW',

  forall: 'FORALL_KW',
  let: 'LET_KW',
  supposing: 'SUPPOSING_KW',
};

function startsIdent(c) {
  return (
    ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z') || c === '_' || c === '$'
  );
}

function continuesIdent(c) {
  return startsIdent(c) || isDigit(c);
}

function isDigit(c) {
  return '0' <= c && c <= '9';
}

class Tokens {
  constructor(tokens) {
    this.tokens = tokens;
  }

  hasMore() {
    return this.tokens.length > 0;
  }

  peek() {
    this.assertHasMore();
    return this.tokens[0];
  }

  next() {
    this.assertHasMore();
    return this.tokens.shift();
  }

  expect(type) {
    this.assertHasMore();
    const nextType = this.tokens[0].type;
    if (nextType !== type) {
      throw new Error(`expected ${type}, not ${nextType}`);
    }
    return this.tokens.shift();
  }

  assertHasMore() {
    if (!this.hasMore()) {
      throw new Error('EOF');
    }
  }
}
