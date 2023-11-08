export default function uncurry(prop) {
  if (prop.type === 'IDENT') {
    return prop;
  } else if (prop.type === 'BIN_PROP') {
    const { op, lhs, rhs } = prop;

    return {
      type: 'BIN_PROP',
      op,
      lhs: uncurry(lhs),
      rhs: uncurry(rhs),
    };
  } else if (prop.type === 'UN_PROP') {
    const { op, prop: innerProp } = prop;

    return {
      type: 'UN_PROP',
      op,
      prop: uncurry(innerProp),
    };
  } else if (prop.type === 'FORALL') {
    const { param, body } = prop;

    const body1 = uncurry(body);

    if (body1.type === 'FORALL') {
      return {
        type: 'FORALL',
        params: [param, ...body1.params],
        body: body1.body,
      };
    } else {
      return {
        type: 'FORALL',
        params: [param],
        body: body1,
      };
    }
  } else if (prop.type === 'ANY') {
    return prop;
  } else if (prop.type === 'UNIT') {
    return prop;
  }
}
