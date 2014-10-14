'use strict';

var hint = angular.hint = require('angular-hint-log');

hint.emit = function () {};

module.exports = angular.module('ngHintScopes', []).config(['$provide', function ($provide) {
  $provide.decorator('$rootScope', ['$delegate', decorateRootScope]);
}]);

function decorateRootScope($delegate) {

  var scopePrototype = ('getPrototypeOf' in Object) ?
      Object.getPrototypeOf($delegate) : $delegate.__proto__;

  var _watch = scopePrototype.$watch;
  scopePrototype.$watch = function (watchExpression, reactionFunction) {
    var watchStr = humanReadableWatchExpression(watchExpression);

    if (typeof watchExpression === 'function') {
      arguments[0] = function () {
        var start = performance.now();
        var ret = watchExpression.apply(this, arguments);
        var end = performance.now();
        hint.emit('scope:watch', {
          scope: this,
          watch: watchStr,
          time: end - start
        });
        return ret;
      };
    } else {
      var thatScope = this;
      arguments[0] = function () {
        var start = performance.now();
        var ret = thatScope.$eval(watchExpression);
        var end = performance.now();
        hint.emit('scope:watch', {
          scope: thatScope,
          watch: watchStr,
          time: end - start
        });
        return ret;
      };
    }

    if (typeof reactionFunction === 'function') {
      var applyStr = reactionFunction.toString();
      arguments[1] = function () {
        var start = performance.now();
        var ret = reactionFunction.apply(this, arguments);
        var end = performance.now();
        hint.emit('scope:reaction', {
          scope: this,
          watch: watchStr,
          time: end - start
        });
        return ret;
      };
    }

    return _watch.apply(this, arguments);
  };


  var _destroy = scopePrototype.$destroy;
  scopePrototype.$destroy = function () {
    hint.emit('scope:destroy', { id: this.id });
    return _destroy.apply(this, arguments);
  };


  var _new = scopePrototype.$new;
  scopePrototype.$new = function () {
    var ret = _new.apply(this, arguments);
    hint.emit('scope:new', { parent: this, child: ret });
    return ret;
  };


  var _digest = scopePrototype.$digest;
  scopePrototype.$digest = function (fn) {
    var ret = _digest.apply(this, arguments);
    hint.emit('scope:digest', { scope: this });
    return ret;
  };


  var _apply = scopePrototype.$apply;
  scopePrototype.$apply = function (fn) {
    var start = performance.now();
    var ret = _apply.apply(this, arguments);
    var end = performance.now();
    hint.emit('scope:apply', { scope: this, time: end - start });
    return ret;
  };

  return $delegate;
}

function humanReadableWatchExpression (fn) {
  if (fn.exp) {
    fn = fn.exp;
  } else if (fn.name) {
    fn = fn.name;
  }
  return fn.toString();
}
