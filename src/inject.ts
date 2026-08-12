/*!
 * Copyright 2018 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2018-06-27 00:25:58
 */

import { KeyFormat, KeyIgnores, KeyInject, KeyVersions } from './keys';
import { collectFields, normalizeMapValues } from './utils';

export function inject(target: any, key?: string) {
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
    let data: any = toJSON ? toJSON.call(this) || {} : this;
    if (data === this) {
      data = collectFields(this);
    }
    if (this[KeyFormat]) {
      const dump: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const fmt = this[KeyFormat][key];
          // Formatters receive the RAW field value (e.g. an observable map),
          // matching the shape they always received before the mobx 7 upgrade.
          dump[key] =
            fmt && fmt.serializer ? fmt.serializer(data[key]) : data[key];
        }
      }
      data = dump;
    }

    if (this[KeyIgnores]) {
      const dump: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key) && !this[KeyIgnores][key]) {
          dump[key] = data[key];
        }
      }
      data = dump;
    }
    // Convert any remaining observable maps (i.e. fields WITHOUT a formatter)
    // to plain objects so they serialize as `{k: v}` instead of mobx 7's
    // entries array. Fields WITH a formatter were already handled above, with
    // the raw map handed to the serializer.
    for (const key of Object.keys(data)) {
      data[key] = normalizeMapValues(data[key]);
    }
    data[KeyVersions] = target[KeyVersions];
    return data;
  };
}
