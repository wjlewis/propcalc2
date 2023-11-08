export default function resolve(prop, ctx) {
  if (prop.type === 'ADDR') {
    const { addr } = prop;
    return ctx.lookupProp(addr);
  } else if (prop.type === 'BIN_PROP') {
    const { op, lhs, rhs } = prop;

    return {
      type: 'BIN_PROP',
      op,
      lhs: resolve(lhs, ctx),
      rhs: resolve(rhs, ctx),
    };
  } else if (prop.type === 'UN_PROP') {
    const { op, prop: innerProp } = prop;

    return {
      type: 'UN_PROP',
      op,
      prop: resolve(innerProp, ctx),
    };
  } else if (prop.type === 'FORALL') {
    const { param, body } = prop;

    return {
      type: 'FORALL',
      param,
      body: resolve(body, ctx.bindIsProp(param)),
    };
  } else if (prop.type === 'ANY') {
    return prop;
  } else if (prop.type === 'UNIT') {
    return prop;
  }
}
