
module.exports = function summarizeModel (dest) {

  if (dest instanceof Array) {
    return JSON.stringify(dest.map(summarizeProperty));
  } else if (typeof dest === 'object') {
    return JSON.stringify(Object.
        keys(dest).
        filter(isAngularPrivatePropertyName).
        reduce(shallowSummary, {}));
  } else {
    return dest;
  }

  function shallowSummary (obj, prop) {
    obj[prop] = summarizeProperty(dest[prop]);
    return obj;
  }
};

function isAngularPrivatePropertyName (key) {
  return key[0] !== '$' || key[1] !== '$';
}

// TODO: handle DOM nodes, fns, etc better.
function summarizeProperty (obj) {
  return obj instanceof Array ?
      { '~array-length': obj.length } :
    obj === null ?
      null :
    typeof obj === 'object' ?
      { '~object': true } :
      obj;
}
