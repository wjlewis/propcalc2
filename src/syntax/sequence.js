/**
 * Transforms sequences of items into a recursive structure to simplify the
 * handling of bound names later. This removes 'BLOCK' terms and all items, and
 * adds three new terms: 'LET', 'CHECK', and 'UNIT'.
 *
 * let a: P = b;
 * let c: Q = d;
 *
 * is equivalent to
 *
 * let a: P = b
 *  in let c: Q = d
 *      in ();
 *
 * where `()` is the unit constructor.
 *
 * In addition, bodies of `supposing` constructs are transformed into single
 * terms as well.
 *
 * We also need to handle `$check(..)` items:
 *
 * let a: P = b;
 * $check(a);
 * let c: Q = d;
 * $check(e);
 *
 * is equivalent to
 *
 * let a: P = b
 *  in $check(a)
 *     in let c: Q = d
 *         in $check(e)
 *            in ();
 */
export default function sequence(items) {
  return items.reduceRight((body, item) => sequenceItem(item, body), {
    type: 'UNIT',
  });
}

function sequenceItem(item, body) {
  if (item.type === 'LET') {
    const { ident, ascription, term } = item;

    return {
      type: 'LET',
      ident,
      ascription,
      term: sequenceTerm(term),
      body,
    };
  } else if (item.type === 'CHECK') {
    const { term } = item;

    return {
      type: 'CHECK',
      term: sequenceTerm(term),
      body,
    };
  }
}

function sequenceTerm(term) {
  if (term.type === 'IDENT') {
    return term;
  } else if (term.type === 'SUPP') {
    const { params, body } = term;

    return {
      type: 'SUPP',
      params,
      body: sequenceBlock(body),
    };
  } else if (term.type === 'INVOC') {
    const { rator, rands } = term;

    return {
      type: 'INVOC',
      rator: sequenceTerm(rator),
      rands: rands.map(sequenceTerm),
    };
  } else if (term.type === 'PROP_ABS') {
    const { params, body } = term;

    return {
      type: 'PROP_ABS',
      params,
      body: sequenceTerm(body),
    };
  } else if (term.type === 'PROP_APP') {
    const { rator, rands } = term;

    return {
      type: 'PROP_APP',
      rator: sequenceTerm(rator),
      rands,
    };
  } else if (term.type === 'TRUST_ME') {
    return term;
  } else if (term.type === 'BLOCK') {
    return sequenceBlock(term);
  }
}

function sequenceBlock(block) {
  const { items, term } = block;

  return items.reduceRight(
    (body, item) => sequenceItem(item, body),
    sequenceTerm(term)
  );
}
