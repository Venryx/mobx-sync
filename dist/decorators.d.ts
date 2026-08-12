/*!
 * Copyright 2018 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2018-06-27 00:25:38
 */
/**
 * Stage-3 decorator field context (the `context` argument passed to a
 * field/accessor decorator). `addInitializer` runs with `this` bound to the
 * instance, after the field initializers have completed, so we can reach the
 * owning class via `this.constructor` and store per-class metadata on its
 * prototype (mirroring the old legacy `(target, propertyKey)` behaviour).
 */
type FieldContext = {
  kind: string;
  name: string | symbol;
  static: boolean;
  private: boolean;
  addInitializer(fn: (this: any) => void): void;
};
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
export declare function format<I, O = I>(
  deserializer: (persistedValue: O, currentValue: I) => I,
  serializer?: (value: I) => O,
): (_value: unknown, context: FieldContext) => void;
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
export declare const date: (_value: unknown, context: FieldContext) => void;
export interface RegExpStore {
  flags: string;
  source: string;
}
/**
 * the short hand for format RegExp
 */
export declare const regexp: (_value: unknown, context: FieldContext) => void;
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
declare function ignore(value: unknown, context: FieldContext): void;
declare namespace ignore {
  var ssr: (value: unknown, context: FieldContext) => void;
  var ssrOnly: (value: unknown, context: FieldContext) => void;
}
export { ignore };
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
export declare function version(
  value: number | string,
): (target: any, context: any) => any;
