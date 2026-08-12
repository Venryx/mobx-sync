/*!
 * Copyright 2018 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2018-06-27 00:21:42
 */
export declare function isPrimitive(value: any): boolean;
/**
 * Collect the serializable fields of a store instance. With mobx 6/7 +
 * Stage-3 decorators (`@observable accessor`), fields are declared as
 * non-enumerable accessors on the prototype, so neither `for..in` nor
 * `JSON.stringify`'s default enumeration can see them. This walks the own
 * enumerable properties and every accessor (getter) property on the prototype
 * chain, so both classic fields and modern observable accessors are collected.
 */
export declare function collectFields(instance: any): Record<string, any>;
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
export declare function normalizeMapValues(value: any): any;
/**
 * A `JSON.stringify` replacer that reconstructs each object layer with its
 * accessor fields made enumerable, so nested observable stores (including the
 * mobx 7 `@observable accessor` fields, which are non-enumerable) are
 * serialized correctly. Objects that expose a `toJSON` (e.g. via
 * `inject`/`format`/`ignore`) are returned as-is so their custom serialization
 * is honoured.
 */
export declare function collectFieldsReplacer(_key: string, value: any): any;
export declare function toJSON(data: any, recursive?: boolean): any;
export declare function parseCycle(
  input: object,
  map?: Map<object, string[]>,
  prefix?: string,
): [any, string[]][];
