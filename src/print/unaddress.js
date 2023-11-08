export default function unaddress(prop, params = []) {
  if (prop.type === 'IDENT') {
    return prop;
  } else if (prop.type === 'ADDR') {
    return { type: 'IDENT', text: params[prop.addr] };
  } else if (prop.type === 'BIN_PROP') {
    const { op, lhs, rhs } = prop;

    return {
      type: 'BIN_PROP',
      op,
      lhs: unaddress(lhs, params),
      rhs: unaddress(rhs, params),
    };
  } else if (prop.type === 'UN_PROP') {
    const { op, prop: innerProp } = prop;

    return {
      type: 'UN_PROP',
      op,
      prop: unaddress(innerProp, params),
    };
  } else if (prop.type === 'FORALL') {
    const { param, body } = prop;

    const param1 = freshParam(params, param ?? 'P');

    return {
      type: 'FORALL',
      param: param1,
      body: unaddress(body, [param1, ...params]),
    };
  } else if (prop.type === 'ANY') {
    return prop;
  } else if (prop.type === 'UNIT') {
    return prop;
  }
}

function freshParam(used, like) {
  let candidate = like;
  let index = 0;

  while (used.includes(candidate)) {
    candidate = `${like}_${index}`;
    index++;
  }

  return candidate;
}
