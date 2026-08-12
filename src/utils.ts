/*!
 * Copyright 2018 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2018-06-27 00:21:42
 */

import { isObservableMap } from 'mobx';

export function isPrimitive(value: any) {
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
export function collectFields(instance: any): Record<string, any> {
  const data: Record<string, any> = {};
  for (const key of Object.keys(instance)) {
    data[key] = instance[key];
  }
  let proto = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      // Collect only real accessors (getter+setter). A getter-only computed
      // property can't be restored (`store[key] = ...` throws on deserialize),
      // so it shouldn't be written to storage either.
      if (desc && desc.get && desc.set && !(key in data)) {
        data[key] = instance[key];
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return data;
}

/**
 * Normalize an observable map to a plain object (`{k: v}`) so it serializes
 * correctly. mobx 7's map `toJSON` emits an entries array `[["k", v]]`, which
 * persisted stores don't expect. Non-map values pass through untouched.
 *
 * This is deliberately a SEPARATE step from `collectFields`, which returns raw
 * field values: observable maps must stay raw until AFTER field formatters
 * (`@format`) have run, so formatters continue to receive the same shape they
 * always did (the raw `ObservableMap`, not the converted plain object).
 */
export function normalizeMapValues(value: any): any {
  return isObservableMap(value) ? Object.fromEntries(value) : value;
}

/**
 * A `JSON.stringify` replacer that reconstructs each object layer with its
 * accessor fields made enumerable, so nested observable stores (including the
 * mobx 7 `@observable accessor` fields, which are non-enumerable) are
 * serialized correctly. Objects that expose a `toJSON` (e.g. via
 * `inject`/`format`/`ignore`) are returned as-is so their custom serialization
 * is honoured.
 */
export function collectFieldsReplacer(_key: string, value: any): any {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (typeof value.toJSON === 'function') {
      return value;
    }
    const fields = collectFields(value);
    for (const key of Object.keys(fields)) {
      fields[key] = normalizeMapValues(fields[key]);
    }
    return fields;
  }
  return value;
}

export function toJSON(data: any, recursive = true) {
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
export function parseCycle(
  input: object,
  map = new Map<object, string[]>(),
  prefix = '',
): [any, string[]][] {
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
      (map.get(item[1]) as string[]).push(subPrefix);
    }
  }
  if (prefix !== '') {
    return [];
  }
  const output: [any, string[]][] = [];
  map.forEach((value, key) => {
    if (value.length > 1) {
      output.push([key, value]);
    }
  });
  return output;
}
