'use strict';

var summarize = require('./lib/summarize-model');
var hint = angular.hint = require('angular-hint-log');
var debounceOn = require('debounce-on');

hint.emit = function () {};

module.exports = angular.module('ngHintScopes', []).config(['$provide', function ($provide) {
  $provide.decorator('$rootScope', ['$delegate', '$parse', decorateRootScope]);
}]);

function decorateRootScope($delegate, $parse) {

  var scopes = {},
      watching = {};

  var debouncedEmitModelChange = debounceOn(emitModelChange, 10, byScopeId);

  hint.watch = function (scopeId, path) {
    path = typeof path === 'string' ? path.split('.') : path;

    if (!watching[scopeId]) {
      watching[scopeId] = {};
    }

    for (var i = 1, ii = path.length; i <= ii; i += 1) {
      var partialPath = path.slice(0, i).join('.');
      if (!watching[scopeId][partialPath]) {
        var get = gettterer(scopeId, partialPath);
        var value = summarize(get());
        watching[scopeId][partialPath] = {
          get: get,
          value: value
        };
        hint.emit('model:change', {
          id: scopeId,
          path: partialPath,
          value: value
        });
      }
    }
  };


  var debouncedEmit = debounceOn(hint.emit, 10, function (params) {
    return params.id + params.path;
  });


  var scopePrototype = ('getPrototypeOf' in Object) ?
      Object.getPrototypeOf($delegate) : $delegate.__proto__;

  var _watch = scopePrototype.$watch;
  scopePrototype.$watch = function (watchExpression, reactionFunction) {
    var watchStr = humanReadableWatchExpression(watchExpression);
    var scopeId = this.$id;
    if (typeof watchExpression === 'function') {
      arguments[0] = function () {
        var start = performance.now();
        var ret = watchExpression.apply(this, arguments);
        var end = performance.now();
        hint.emit('scope:watch', {
          id: scopeId,
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
          id: scopeId,
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
          id: this.$id,
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
    var id = this.id;

    hint.emit('scope:destroy', { id: id });

    delete scopes[id];
    delete watching[id];

    return _destroy.apply(this, arguments);
  };


  var _new = scopePrototype.$new;
  scopePrototype.$new = function () {
    var child = _new.apply(this, arguments);

    scopes[child.$id] = child;
    watching[child.$id] = {};

    hint.emit('scope:new', { parent: this.$id, child: child.$id });
    return child;
  };


  var _digest = scopePrototype.$digest;
  scopePrototype.$digest = function (fn) {
    var start = performance.now();
    var ret = _digest.apply(this, arguments);
    var end = performance.now();
    hint.emit('scope:digest', { id: this.$id, time: end - start });
    debouncedEmitModelChange(this);
    return ret;
  };


  var _apply = scopePrototype.$apply;
  scopePrototype.$apply = function (fn) {
    var start = performance.now();
    var ret = _apply.apply(this, arguments);
    var end = performance.now();
    hint.emit('scope:apply', { id: this.$id, time: end - start });
    return ret;
  };


  function gettterer (scopeId, path) {
    var getter = $parse(path);
    return function () {
      return getter(scopes[scopeId]);
    };
  }

  function emitModelChange (scope) {
    if (watching[scope.$id]) {
      Object.keys(watching[scope.$id]).forEach(function (path) {
        var model = watching[scope.$id][path];
        var value = summarize(model.get());
        if (value !== model.value) {
          hint.emit('model:change', {
            id: scope.$id,
            path: path,
            oldValue: model.value,
            value: value
          });
          model.value = value;
        }
      });
    }
  }

  return $delegate;
}

function byScopeId (scope) {
  return scope.$id
}

function humanReadableWatchExpression (fn) {
  if (fn.exp) {
    fn = fn.exp;
  } else if (fn.name) {
    fn = fn.name;
  }
  return fn.toString();
}
