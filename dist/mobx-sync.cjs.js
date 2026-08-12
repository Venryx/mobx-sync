'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var mobx = require('mobx');
var tslib = require('tslib');

/*!
 *
 * Copyright 2017 - acrazing
 *
 * @author acrazing joking.young@gmail.com
 * @since 2017-12-15 12:29:38
 * @version 1.0.0
 * @desc consts.ts
 */
var noop = function () {
  return void 0;
};

/*!
 *
 * Copyright 2018 - acrazing
 *
 * @author acrazing joking.young@gmail.com
 * @since 2018-01-06 12=23=01
 * @version 1.0.0
 * @desc constants.ts
 */
const KeyVersions = '__mobx_sync_versions__';
const KeyDefaultKey = '__mobx_sync__';
const KeyActionName = '__PERSIST__';
const KeyNodeVersion = '__mobx_sync_this__';
const KeyIgnores = '__mobx_ignores__';
const KeyFormat = '__mobx_sync_format__';
const KeyInject = '__mobx_sync_inject__';

/*!
 * Copyright 2018 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2018-06-27 00:21:42
 */
function isPrimitive(value) {
  if (value === void 0 || value === null) {
    return true;
  }
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}
/**
 * Collect the serializable fields of a store instance. With mobx 6/7 +
 * Stage-3 decorators (`@observable accessor`), fields are declared as
 * non-enumerable accessors on the prototype, so neither `for..in` nor
 * `JSON.stringify`'s default enumeration can see them. This walks the own
 * enumerable properties and every accessor (getter) property on the prototype
 * chain, so both classic fields and modern observable accessors are collected.
 */
function collectFields(instance) {
  const data = {};
  for (const key of Object.keys(instance)) {
    data[key] = collectFieldValue(instance[key]);
  }
  let proto = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc && desc.get && !(key in data)) {
        data[key] = collectFieldValue(instance[key]);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return data;
}
/**
 * Convert an observable map to a plain object so it serializes to `{}`/`{k: v}`
 * instead of mobx's `toJSON` entries array (which is not what persisted stores
 * expect). Non-map values pass through untouched.
 */
function collectFieldValue(value) {
  if (mobx.isObservableMap(value)) {
    return Object.fromEntries(value);
  }
  return value;
}
/**
 * A `JSON.stringify` replacer that reconstructs each object layer with its
 * accessor fields made enumerable, so nested observable stores (including the
 * mobx 7 `@observable accessor` fields, which are non-enumerable) are
 * serialized correctly. Objects that expose a `toJSON` (e.g. via
 * `inject`/`format`/`ignore`) are returned as-is so their custom serialization
 * is honoured.
 */
function collectFieldsReplacer(_key, value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (typeof value.toJSON === 'function') {
      return value;
    }
    return collectFields(value);
  }
  return value;
}
function toJSON(data, recursive = true) {
  if (recursive) {
    const str = JSON.stringify(data, collectFieldsReplacer);
    if (str === void 0) {
      return void 0;
    }
    return JSON.parse(str);
  }
  if (!data || !('toJSON' in data)) {
    return data;
  }
  return data.toJSON();
}
// TODO support es5 browsers
function parseCycle(input, map = new Map(), prefix = '') {
  if (isPrimitive(input)) {
    return [];
  }
  if (!map.has(input)) {
    map.set(input, [prefix || '.']);
  }
  for (const item of Object.entries(input)) {
    if (isPrimitive(item[1]) || Object.keys(item[1]).length === 0) {
      continue;
    }
    const subPrefix = prefix + '.' + item[0];
    if (!map.has(item[1])) {
      map.set(item[1], [subPrefix]);
      parseCycle(item[1], map, subPrefix);
    } else {
      map.get(item[1]).push(subPrefix);
    }
  }
  if (prefix !== '') {
    return [];
  }
  const output = [];
  map.forEach((value, key) => {
    if (value.length > 1) {
      output.push([key, value]);
    }
  });
  return output;
}

/*!
 *
 * Copyright 2018 - acrazing
 *
 * @author acrazing joking.young@gmail.com
 * @since 2018-01-06 12:24:06
 * @version 1.0.0
 * @desc parse-store.ts
 */
exports.parseStore = (store, data, isFromServer) => {
  // if store or data is empty, break it
  if (!store || !data) {
    return;
  }
  const dataVersions = data[KeyVersions] || {};
  const storeVersions = store[KeyVersions] || {};
  const deserializers = store[KeyFormat] || {};
  // version control for node
  if (KeyNodeVersion in dataVersions || KeyNodeVersion in storeVersions) {
    if (dataVersions[KeyNodeVersion] !== storeVersions[KeyNodeVersion]) {
      return;
    }
  }
  // use data to iterate for avoid store does not set default value, and then
  // the properties will not exist actually. so, the observable
  // map/array/object field must has a default value, when the object is
  // constructed.
  for (const key in data) {
    // skip internal fields
    if (key === KeyVersions) {
      continue;
    }
    if (data.hasOwnProperty(key)) {
      // the version control for a field
      if (storeVersions[key] !== dataVersions[key]) {
        continue;
      }
      // if the new version of the store skipped a field, will
      // not assign stored data to it. this method need to the
      // store init the field with a value.
      const desc = Object.getOwnPropertyDescriptor(store, key);
      if (desc && !desc.enumerable && !isFromServer) {
        continue;
      }
      const storeValue = store[key];
      const dataValue = data[key];
      if (deserializers[key] && deserializers[key].deserializer) {
        store[key] = deserializers[key].deserializer(dataValue, storeValue);
      } else if (mobx.isObservableArray(storeValue)) {
        // mobx array
        store[key] = mobx.observable.array(dataValue);
      } else if (mobx.isObservableMap(storeValue)) {
        // mobx map
        store[key] = mobx.observable.map(dataValue);
      } else if (isPrimitive(dataValue)) {
        // js/mobx primitive objects
        store[key] = dataValue;
      } else if (!storeValue) {
        // if store value is empty, assign persisted data to it directly
        store[key] = dataValue;
      } else {
        // nested pure js object or mobx observable object
        exports.parseStore(storeValue, dataValue, isFromServer);
      }
    }
  }
};
exports.parseStore = mobx.action(exports.parseStore);

/*!
 *
 * Copyright 2017 - acrazing
 *
 * @author acrazing joking.young@gmail.com
 * @since 2017-11-28 17:31:44
 * @version 1.0.0
 * @desc async.ts
 */
class AsyncTrunk {
  constructor(
    store,
    {
      storage = localStorage,
      storageKey = KeyDefaultKey,
      delay = 0,
      onError = noop,
    } = {},
  ) {
    this.store = store;
    this.storage = storage;
    this.storageKey = storageKey;
    this.delay = delay;
    this.onError = onError;
  }
  async persist() {
    try {
      await this.storage.setItem(
        this.storageKey,
        JSON.stringify(this.store, collectFieldsReplacer),
      );
    } catch (reason) {
      this.onError(reason);
    }
  }
  /**
   * init the trunk async
   */
  async init(initialState) {
    try {
      const data = await this.storage.getItem(this.storageKey);
      if (data) {
        exports.parseStore(this.store, JSON.parse(data), false);
      }
    } catch (_a) {
      // DO nothing
    }
    if (initialState) {
      exports.parseStore(this.store, initialState, true);
    }
    // persist before listen change
    this.persist();
    this.disposer = mobx.autorun(this.persist.bind(this), {
      name: KeyActionName,
      delay: this.delay,
      onError: this.onError,
    });
  }
  async clear() {
    return this.storage.removeItem(this.storageKey);
  }
  updateStore(store) {
    this.store = store;
    return this.persist();
  }
}

/*!
 * Copyright 2018 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2018-12-15 15:35:02
 */
const options = {
  /**
   * is ssr or not, this only need to be set as true at server side.
   */
  ssr: false,
};
/**
 * update the configuration
 * @param input
 */
function config(input) {
  tslib.__assign(options, input);
}

/*!
 * Copyright 2018 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2018-06-27 00:25:58
 */
function inject(target, key) {
  if (key !== void 0 && !target.hasOwnProperty(key)) {
    Object.defineProperty(target, key, {
      enumerable: false,
      value: Object.create(target[key] || null),
    });
  }
  if (target.hasOwnProperty(KeyInject)) {
    return;
  }
  Object.defineProperty(target, KeyInject, {
    value: true,
    configurable: false,
    enumerable: false,
  });
  const { toJSON } = target;
  target.toJSON = function () {
    let data = toJSON ? toJSON.call(this) || {} : this;
    if (data === this) {
      data = collectFields(this);
    }
    if (this[KeyFormat]) {
      const dump = {};
      for (const key in data) {
        if (
          data.hasOwnProperty(key) &&
          this[KeyFormat][key] &&
          this[KeyFormat][key].serializer
        ) {
          dump[key] = this[KeyFormat][key].serializer(data[key]);
        } else {
          dump[key] = data[key];
        }
      }
      data = dump;
    }
    if (this[KeyIgnores]) {
      const dump = {};
      for (const key in data) {
        if (data.hasOwnProperty(key) && !this[KeyIgnores][key]) {
          dump[key] = data[key];
        }
      }
      data = dump;
    }
    data[KeyVersions] = target[KeyVersions];
    return data;
  };
}

/*!
 * Copyright 2018 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2018-06-27 00:25:38
 */
/**
 * define a custom stringify/parse function for a field, it is useful for
 * builtin objects, just like Date, TypedArray, etc.
 *
 * @example
 *
 * // this example shows how to format a date to timestamp,
 * // and load it from serialized string,
 * // if the date is invalid, will not persist it.
 * class SomeStore {
 *   @format<Date, number>(
 *      (timestamp) => new Date(timestamp),
 *      (date) => date ? +date : void 0,
 *   )
 *   dateField = new Date()
 * }
 *
 * @param deserializer - the function to parse the serialized data to
 *      custom object, the first argument is the data serialized by
 *      `serializer`, and the second is the current value of the field.
 * @param serializer - the function to serialize the object to pure js
 *      object or any else could be stringify safely by `JSON.stringify`.
 */
function format(deserializer, serializer) {
  return (_value, context) => {
    context.addInitializer(function () {
      const proto = this.constructor.prototype;
      inject(proto, KeyFormat);
      proto[KeyFormat][context.name] = { deserializer, serializer };
    });
  };
}
/**
 * The short hand for format date to ISO string
 *
 * @example
 *
 * class FooStore {
 *   @date
 *   dateField = new Date()
 * }
 */
const date = format((value) => new Date(value));
/**
 * the short hand for format RegExp
 */
const regexp = format(
  (value) => new RegExp(value.source, value.flags),
  (value) => ({ flags: value.flags, source: value.source }),
);
function _ignore(proto, propertyKey) {
  inject(proto, KeyIgnores);
  proto[KeyIgnores][propertyKey] = true;
}
/**
 * Build an `ignore`-style field decorator whose behaviour is gated by
 * `shouldIgnore()` (evaluated once, at instance initialisation time).
 */
function ignoreImpl(shouldIgnore) {
  return (_value, context) => {
    context.addInitializer(function () {
      if (!shouldIgnore()) {
        return;
      }
      _ignore(this.constructor.prototype, context.name);
    });
  };
}
/**
 * ignore the field, which means: if serialize the current store, it will
 * be omitted, and if the previous version does not omit it, will also
 * be omitted when call `parseStore`.
 *
 * Note: if set current runtime as ssr, will do nothing.
 *
 * @example
 *
 * class FooStore {
 *   @ignore
 *   bigTable = observable.map()
 * }
 */
function ignore(value, context) {
  ignoreImpl(() => !options.ssr)(value, context);
}
/**
 * same to `ignore`, but ignore the field even if the runtime is ssr.
 */
ignore.ssr = (value, context) => {
  ignoreImpl(() => true)(value, context);
};
ignore.ssrOnly = (value, context) => {
  ignoreImpl(() => options.ssr)(value, context);
};
/**
 * set the version of the field, if the persisted data's version does not
 * equal to the current version, it will be omitted.
 *
 * @example
 *
 * class FooStore {
 *   // this means the current version of users struct is 1, if
 *   // your users's struct updated with breaking changes, you may need
 *   // to update the 1 to 2 to avoid loading the previous version's
 *   // users from localStorage.
 *   @version(1)
 *   users = observable.map()
 * }
 *
 * When applied to a class, it sets the version of the node itself.
 *
 * @param value - the version number, this should be different from all the
 *    old version when update it, a best practice is use q increment number.
 */
function version(value) {
  return (target, context) => {
    if (context.kind === 'class') {
      const proto = target.prototype;
      inject(proto);
      if (!proto.hasOwnProperty(KeyVersions)) {
        proto[KeyVersions] = tslib.__assign({}, proto[KeyVersions] || {});
      }
      proto[KeyVersions][KeyNodeVersion] = value;
      return target;
    }
    context.addInitializer(function () {
      const proto = this.constructor.prototype;
      inject(proto);
      if (!proto.hasOwnProperty(KeyVersions)) {
        proto[KeyVersions] = tslib.__assign({}, proto[KeyVersions] || {});
      }
      proto[KeyVersions][context.name] = value;
    });
  };
}

/*!
 *
 * Copyright 2017 - acrazing
 *
 * @author acrazing joking.young@gmail.com
 * @since 2017-11-28 17:31:44
 * @version 1.0.0
 * @desc sync.ts
 */
class SyncTrunk {
  constructor(
    store,
    {
      storage = localStorage,
      storageKey = KeyDefaultKey,
      delay = 0,
      onError = noop,
    } = {},
  ) {
    this.store = store;
    this.storage = storage;
    this.storageKey = storageKey;
    this.delay = delay;
    this.onError = onError;
  }
  persist() {
    try {
      this.storage.setItem(
        this.storageKey,
        JSON.stringify(this.store, collectFieldsReplacer),
      );
    } catch (error) {
      this.onError(error);
    }
  }
  /**
   * init the store
   */
  init(initialState) {
    try {
      const data = this.storage.getItem(this.storageKey);
      if (data) {
        exports.parseStore(this.store, JSON.parse(data), false);
      }
    } catch (_a) {
      // DO nothing
    }
    if (initialState) {
      exports.parseStore(this.store, initialState, true);
    }
    // persist before listen change
    this.persist();
    this.disposer = mobx.autorun(this.persist.bind(this), {
      name: KeyActionName,
      delay: this.delay,
      onError: this.onError,
    });
  }
  clear() {
    this.storage.removeItem(this.storageKey);
  }
  updateStore(store) {
    this.store = store;
    this.persist();
  }
}

exports.AsyncTrunk = AsyncTrunk;
exports.KeyActionName = KeyActionName;
exports.KeyDefaultKey = KeyDefaultKey;
exports.KeyFormat = KeyFormat;
exports.KeyIgnores = KeyIgnores;
exports.KeyInject = KeyInject;
exports.KeyNodeVersion = KeyNodeVersion;
exports.KeyVersions = KeyVersions;
exports.SyncTrunk = SyncTrunk;
exports.collectFields = collectFields;
exports.collectFieldsReplacer = collectFieldsReplacer;
exports.config = config;
exports.date = date;
exports.format = format;
exports.ignore = ignore;
exports.inject = inject;
exports.isPrimitive = isPrimitive;
exports.options = options;
exports.parseCycle = parseCycle;
exports.regexp = regexp;
exports.toJSON = toJSON;
exports.version = version;
//# sourceMappingURL=mobx-sync.cjs.js.map
