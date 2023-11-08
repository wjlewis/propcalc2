import printProp from './print/print.js';

export default function synth(term, ctx = new Context()) {
  if (term.type === 'ADDR') {
    const { addr } = term;

    return ctx.lookup(addr);
  } else if (term.type === 'INVOC') {
    const { rator, rand } = term;

    const ratorProp = synth(rator, ctx);
    if (ratorProp.type !== 'BIN_PROP' || ratorProp.op !== 'IMPL') {
      throw new Error(
        `only =>'s can be invoked, not ${printProp(ratorProp, ctx)}`
      );
    }

    const { lhs, rhs } = ratorProp;
    check(rand, lhs, ctx);

    return rhs;
  } else if (term.type === 'PROP_APP') {
    const { rator, rand } = term;

    const ratorProp = synth(rator, ctx);
    if (ratorProp.type !== 'FORALL') {
      throw new Error(
        `only forall props can be applied, not ${printProp(ratorProp, ctx)}`
      );
    }

    const { body } = ratorProp;
    return shiftFree(subst(shiftFree(rand, 1), body, 0), -1);
  } else if (term.type === 'TRUST_ME') {
    return { type: 'ANY' };
  } else if (term.type === 'LET') {
    const { term: rhsTerm, body } = term;

    const prop = synth(rhsTerm, ctx);
    return synth(body, ctx.bindProp(prop));
  } else if (term.type === 'CHECK') {
    const { term: innerTerm, body } = term;

    const prop = synth(innerTerm, ctx);
    console.log(printProp(prop, ctx));
    return synth(body, ctx);
  } else if (term.type === 'UNIT') {
    return { type: 'UNIT' };
  } else if (term.type === 'ANN') {
    const { term: innerTerm, prop } = term;

    return check(innerTerm, prop, ctx);
  } else {
    throw new Error("can't synthesize a prop (try adding an ascription)");
  }
}

function check(term, prop, ctx) {
  if (term.type === 'SUPP') {
    const { body } = term;
    if (prop.type !== 'BIN_PROP' || prop.op !== 'IMPL') {
      throw new Error(`thm must have => prop, not ${printProp(prop, ctx)}`);
    }
    const { lhs, rhs } = prop;
    check(body, rhs, ctx.bindProp(lhs));
    return prop;
  } else if (term.type === 'PROP_ABS') {
    const { body } = term;
    if (prop.type !== 'FORALL') {
      throw new Error(
        `prop abs must have forall prop, not ${printProp(prop, ctx)}`
      );
    }
    const { param, body: forallBody } = prop;
    // Will we always have a param here?
    check(body, forallBody, ctx.bindIsProp(param));
    return prop;
  } else {
    const synthd = synth(term, ctx);
    if (!isCompatible(prop, synthd)) {
      throw new Error(
        `expected ${printProp(prop, ctx)} but got ${printProp(synthd, ctx)}`
      );
    }
    return prop;
  }
}

function isCompatible(prop1, prop2) {
  if (prop1.type === 'ANY' || prop2.type === 'ANY') {
    // `Any` is a subtype of every type.
    return true;
  } else if (prop1.type !== prop2.type) {
    return false;
  } else if (prop1.type === 'ADDR') {
    return prop1.addr === prop2.addr;
  } else if (prop1.type === 'BIN_PROP') {
    return (
      prop1.op === prop2.op &&
      isCompatible(prop1.lhs, prop2.lhs) &&
      isCompatible(prop1.rhs, prop2.rhs)
    );
  } else if (prop1.type === 'UN_PROP') {
    return prop1.op === prop2.op && isCompatible(prop1.prop, prop2.prop);
  } else if (prop1.type === 'FORALL') {
    return isCompatible(prop1.body, prop2.body);
  } else if (prop1.type === 'UNIT') {
    return true;
  }
}

function shiftFree(prop, n, quantifierCount = 0) {
  if (prop.type === 'ADDR') {
    const { addr } = prop;

    return {
      type: 'ADDR',
      addr: addr < quantifierCount ? addr : addr + n,
    };
  } else if (prop.type === 'BIN_PROP') {
    const { op, lhs, rhs } = prop;

    return {
      type: 'BIN_PROP',
      op,
      lhs: shiftFree(lhs, n, quantifierCount),
      rhs: shiftFree(rhs, n, quantifierCount),
    };
  } else if (prop.type === 'UN_PROP') {
    const { op, prop: innerProp } = prop;

    return {
      type: 'UN_PROP',
      op,
      prop: shiftFree(innerProp, n, quantifierCount),
    };
  } else if (prop.type === 'FORALL') {
    const { param, body } = prop;

    return {
      type: 'FORALL',
      param,
      body: shiftFree(body, n, quantifierCount + 1),
    };
  } else if (prop.type === 'ANY') {
    return prop;
  } else if (prop.type === 'UNIT') {
    return prop;
  }
}

function subst(sub, main, addr) {
  if (main.type === 'ADDR') {
    return main.addr === addr ? sub : main;
  } else if (main.type === 'BIN_PROP') {
    const { op, lhs, rhs } = main;

    return {
      type: 'BIN_PROP',
      op,
      lhs: subst(sub, lhs, addr),
      rhs: subst(sub, rhs, addr),
    };
  } else if (main.type === 'UN_PROP') {
    const { op, prop: innerProp } = main;

    return {
      type: 'UN_PROP',
      op,
      prop: subst(sub, innerProp, addr),
    };
  } else if (main.type === 'FORALL') {
    const { name, body } = main;
    return {
      type: 'FORALL',
      name,
      body: subst(shiftFree(sub, 1), body, addr + 1),
    };
  } else if (main.type === 'ANY') {
    return main;
  } else if (main.type === 'UNIT') {
    return main;
  }
}

class Context {
  constructor(bindings = []) {
    this.bindings = bindings;
  }

  bindProp(prop) {
    return new Context([{ type: 'PROP', prop }, ...this.bindings]);
  }

  lookup(addr) {
    function loop(bindings, addr, quantifierCount = 0) {
      // We checked all addresses during the `address` stage, so this should
      // never occur. Still...
      if (bindings.length === 0) {
        throw new Error('unreachable');
      }

      const [first, ...rest] = bindings;

      if (first.type === 'PROP') {
        return addr === 0
          ? shiftFree(first.prop, quantifierCount)
          : loop(rest, addr - 1, quantifierCount);
      } else if (first.type === 'IS_PROP') {
        return loop(rest, addr, quantifierCount + 1);
      }
    }

    return loop(this.bindings, addr);
  }

  bindIsProp(param) {
    return new Context([
      { type: 'IS_PROP', prop: { type: 'IDENT', text: param } },
      ...this.bindings,
    ]);
  }

  lookupProp(addr) {
    function loop(bindings, addr) {
      if (bindings.length === 0) {
        throw new Error('unreachable');
      }

      const [first, ...rest] = bindings;

      if (first.type === 'IS_PROP') {
        return addr === 0 ? first.prop : loop(rest, addr - 1);
      } else if (first.type === 'PROP') {
        return loop(rest, addr);
      }
    }

    return loop(this.bindings, addr);
  }
}
