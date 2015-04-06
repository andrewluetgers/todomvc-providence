/**
 *  Copyright (c) 2014-2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * Forked from: https://github.com/facebook/immutable-js/tree/3799d5f223315a41ceb524b627e558c548f3b7c5/contrib/cursor
 *
 * Why?
 *
 * - customize behaviour of 'wrapper' for reference to a path in a nested immutable data structure
 */

/**
 * Cursor is expected to be required in a node or other CommonJS context:
 *
 *     var Cursor = require('immutable/contrib/cursor');
 *
 * If you wish to use it in the browser, please check out Browserify or WebPack!
 */

const Immutable = require('immutable');
const Iterable = Immutable.Iterable;
const Iterator = Iterable.Iterator;
const Seq = Immutable.Seq;
const Map = Immutable.Map;

// TODO: eventually remove this
const _ = require('lodash');

const identity = x => x;
const LISTENERS = {};

function cursorFrom(data, keyPath, options) {

  /**
   * legal full structure for options:
   *
   * options = {
   *   root: {
   *     data: any,
   *     box: function,
   *     unbox: function
   *   },
   *
   *   keyPath: array, // this precedes options.key
   *   key: any,
   *   toKeyPath: function
   * }
   */

  const _newProto = {
    root: {
      data: data,
      box: identity,
      unbox: identity,
    },

    keyPath: [],
    toKeyPath: valToKeyPath,

    onChange: void 0,

    // parasitic object that get inherited by all subcursors
    _meta: {
      listeners: Immutable.Map()
    }
  };

  switch(arguments.length) {
    case 1:
      options = {};
      keyPath = [];

      if (_.isPlainObject(keyPath)) {
        options = data;
        data = options.root.data; // absolutely required
        keyPath = (options.keyPath || options.key) || [];
      }
      break;
    case 2:
      if (_.isPlainObject(keyPath)) {
        options = keyPath;
        keyPath = (options.keyPath || options.key) || [];
      } else {
        options = {};
      }
      break;
    default:
  }

  let proto = makeProto(_newProto, options);
  proto.keyPath = proto.toKeyPath(keyPath);

  return makeCursor(proto);
}


var KeyedCursorPrototype = Object.create(Seq.Keyed.prototype);
var IndexedCursorPrototype = Object.create(Seq.Indexed.prototype);

function KeyedCursor(proto) {
  applyProto(this, proto);
}
KeyedCursorPrototype.constructor = KeyedCursor;

function IndexedCursor(proto) {
  applyProto(this, proto);
}
IndexedCursorPrototype.constructor = IndexedCursor;

KeyedCursorPrototype.toString = function() {
  return this.__toString('Cursor {', '}');
}
IndexedCursorPrototype.toString = function() {
  return this.__toString('Cursor [', ']');
}

KeyedCursorPrototype.deref =
KeyedCursorPrototype.valueOf =
IndexedCursorPrototype.deref =
IndexedCursorPrototype.valueOf = function(notSetValue) {
  const rootData = this.root.unbox(this.root.data);
  return rootData.getIn(this.keyPath, notSetValue);
}

KeyedCursorPrototype.get =
IndexedCursorPrototype.get = function(key, notSetValue) {
  return this.getIn([key], notSetValue);
}

KeyedCursorPrototype.getIn =
IndexedCursorPrototype.getIn = function(keyPath, notSetValue) {
  keyPath = listToKeyPath(keyPath);
  if (keyPath.length === 0) {
    return this;
  }
  const rootData = this.root.unbox(this.root.data);
  var value = rootData.getIn(newKeyPath(this.keyPath, keyPath), NOT_SET);
  return value === NOT_SET ? notSetValue : wrappedValue(this, keyPath, value);
}

IndexedCursorPrototype.set =
KeyedCursorPrototype.set = function(key, value) {
  return updateCursor(this, function (m) { return m.set(key, value); }, [key]);
}

IndexedCursorPrototype.push = function(/* values */) {
  var args = arguments;
  return updateCursor(this, function (m) {
    return m.push.apply(m, args);
  });
}

IndexedCursorPrototype.pop = function() {
  return updateCursor(this, function (m) {
    return m.pop();
  });
}

IndexedCursorPrototype.unshift = function(/* values */) {
  var args = arguments;
  return updateCursor(this, function (m) {
    return m.unshift.apply(m, args);
  });
}

IndexedCursorPrototype.shift = function() {
  return updateCursor(this, function (m) {
    return m.shift();
  });
}

IndexedCursorPrototype.setIn =
KeyedCursorPrototype.setIn = Map.prototype.setIn;

KeyedCursorPrototype.remove =
KeyedCursorPrototype['delete'] =
IndexedCursorPrototype.remove =
IndexedCursorPrototype['delete'] = function(key) {
  return updateCursor(this, function (m) { return m.remove(key); }, [key]);
}

IndexedCursorPrototype.removeIn =
IndexedCursorPrototype.deleteIn =
KeyedCursorPrototype.removeIn =
KeyedCursorPrototype.deleteIn = Map.prototype.deleteIn;

KeyedCursorPrototype.clear =
IndexedCursorPrototype.clear = function() {
  return updateCursor(this, function (m) { return m.clear(); });
}

IndexedCursorPrototype.update =
KeyedCursorPrototype.update = function(keyOrFn, notSetValue, updater) {
  return arguments.length === 1 ?
    updateCursor(this, keyOrFn) :
    this.updateIn([keyOrFn], notSetValue, updater);
}

IndexedCursorPrototype.updateIn =
KeyedCursorPrototype.updateIn = function(keyPath, notSetValue, updater) {
  return updateCursor(this, function (m) {
    return m.updateIn(keyPath, notSetValue, updater);
  }, keyPath);
}

IndexedCursorPrototype.merge =
KeyedCursorPrototype.merge = function(/*...iters*/) {
  var args = arguments;
  return updateCursor(this, function (m) {
    return m.merge.apply(m, args);
  });
}

IndexedCursorPrototype.mergeWith =
KeyedCursorPrototype.mergeWith = function(merger/*, ...iters*/) {
  var args = arguments;
  return updateCursor(this, function (m) {
    return m.mergeWith.apply(m, args);
  });
}

IndexedCursorPrototype.mergeIn =
KeyedCursorPrototype.mergeIn = Map.prototype.mergeIn;

IndexedCursorPrototype.mergeDeep =
KeyedCursorPrototype.mergeDeep = function(/*...iters*/) {
  var args = arguments;
  return updateCursor(this, function (m) {
    return m.mergeDeep.apply(m, args);
  });
}

IndexedCursorPrototype.mergeDeepWith =
KeyedCursorPrototype.mergeDeepWith = function(merger/*, ...iters*/) {
  var args = arguments;
  return updateCursor(this, function (m) {
    return m.mergeDeepWith.apply(m, args);
  });
}

IndexedCursorPrototype.mergeDeepIn =
KeyedCursorPrototype.mergeDeepIn = Map.prototype.mergeDeepIn;

KeyedCursorPrototype.withMutations =
IndexedCursorPrototype.withMutations = function(fn) {
  return updateCursor(this, function (m) {
    return (m || Map()).withMutations(fn);
  });
}

KeyedCursorPrototype.cursor =
IndexedCursorPrototype.cursor = function(subKeyPath) {
  subKeyPath = this.toKeyPath(subKeyPath);
  return subKeyPath.length === 0 ? this : subCursor(this, subKeyPath);
}

KeyedCursorPrototype.observe =
IndexedCursorPrototype.observe = function(observer) {

  const _keyPath = newKeyPath(this.keyPath, [LISTENERS, observer]);
  this._meta.listeners = this._meta.listeners.setIn(_keyPath, observer);

  return function() {
    // TODO: unobserve
  };
}

/**
 * All iterables need to implement __iterate
 */
KeyedCursorPrototype.__iterate =
IndexedCursorPrototype.__iterate = function(fn, reverse) {
  var cursor = this;
  var deref = cursor.deref();
  return deref && deref.__iterate ? deref.__iterate(
    function (v, k) { return fn(wrappedValue(cursor, [k], v), k, cursor); },
    reverse
  ) : 0;
}

/**
 * All iterables need to implement __iterator
 */
KeyedCursorPrototype.__iterator =
IndexedCursorPrototype.__iterator = function(type, reverse) {
  var deref = this.deref();
  var cursor = this;
  var iterator = deref && deref.__iterator &&
    deref.__iterator(Iterator.ENTRIES, reverse);
  return new Iterator(function () {
    if (!iterator) {
      return { value: undefined, done: true };
    }
    var step = iterator.next();
    if (step.done) {
      return step;
    }
    var entry = step.value;
    var k = entry[0];
    var v = wrappedValue(cursor, [k], entry[1]);
    return {
      value: type === Iterator.KEYS ? k : type === Iterator.VALUES ? v : [k, v],
      done: false
    };
  });
}

KeyedCursor.prototype = KeyedCursorPrototype;
IndexedCursor.prototype = IndexedCursorPrototype;


const NOT_SET = {}; // Sentinel value

function makeCursor(proto, value) {

  if(arguments.length === 1) {
    value = proto.root.unbox(proto.root.data);
  }

  proto.size = value && value.size;
  const CursorClass = Iterable.isIndexed(value) ? IndexedCursor : KeyedCursor;
  return new CursorClass(proto);
}

function wrappedValue(cursor, keyPath, value) {
  return Iterable.isIterable(value) ? subCursor(cursor, keyPath, value) : value;
}

function subCursor(cursor, keyPath, value) {

  const proto = makeProto(cursor, {
    keyPath: newKeyPath(cursor.keyPath, keyPath)
  });

  if (arguments.length < 3) {
    // call without value
    return makeCursor(proto);
  }
  return makeCursor(proto, value);
}

function updateCursor(cursor, changeFn, changeKeyPath) {

  const deepChange = arguments.length > 2;
  const rootData = cursor.root.unbox(cursor.root.data);

  let newRootData = rootData.updateIn(
    cursor.keyPath,
    deepChange ? Map() : undefined,
    changeFn
  );

  // TODO: why? does invariant that cursor.keyPath is an array not always hold?
  const keyPath = cursor.keyPath || [];
  const args = [newRootData, rootData, deepChange ? newKeyPath(keyPath, changeKeyPath) : keyPath];

  let currentPath = [];
  let needle = 0;
  const _len = cursor.keyPath.length;

  while(needle <= _len) {

    const _keyPath = newKeyPath(currentPath, [LISTENERS]);
    const listeners = cursor._meta.listeners.getIn(_keyPath, NOT_SET);

    if(listeners !== NOT_SET) {
      listeners.forEach((observer) => {
        observer.apply(void 0, args);
      });
    }

    if(needle === _len) break;

    currentPath = newKeyPath(currentPath, [cursor.keyPath[needle]]);
    needle++;
  }

  const result = cursor.onChange && cursor.onChange.apply(undefined, args);
  if (result !== undefined) {
    newRootData = result;
  }

  const proto = makeProto(cursor, {
    root: {
      data: cursor.root.box(newRootData, cursor.root.data)
    }
  });

  return makeCursor(proto);
}

function makeProto(cursor, proto={}) {
  const _root = proto.root;
  return {
    root: {
      data: (_root && _root.data) || cursor.root.data,
      box: (_root && _root.box) || cursor.root.box,
      unbox: (_root && _root.unbox) || cursor.root.unbox
    },

    keyPath: proto.keyPath || cursor.keyPath,
    toKeyPath: proto.toKeyPath || cursor.toKeyPath,

    onChange: proto.onChange || cursor.onChange,

    _meta: cursor._meta
  };
}

function applyProto(ctx, proto) {
  ctx.size = proto.size;

  ctx.root = {
    data: proto.root.data,
    box: proto.root.box,
    unbox: proto.root.unbox
  };

  ctx.keyPath = proto.keyPath;
  ctx.toKeyPath = proto.toKeyPath;

  ctx.onChange = proto.onChange;

  ctx._meta = proto._meta;
}

function newKeyPath(head, tail) {
  return head.concat(listToKeyPath(tail));
}

function listToKeyPath(list) {
  return Array.isArray(list) ? list : Immutable.Iterable(list).toArray();
}

function valToKeyPath(val) {
  return Array.isArray(val) ? val :
    Iterable.isIterable(val) ? val.toArray() :
    [val];
}

exports.from = cursorFrom;
