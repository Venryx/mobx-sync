/*!
 * Copyright 2018 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2018-06-27 00:31:58
 */

import * as assert from 'assert';
import { observable } from 'mobx';
import { config } from './config';
import { date, ignore, regexp, version } from './decorators';
import { inject } from './inject';
import { KeyNodeVersion, KeyVersions } from './keys';
import { parseStore } from './parse-store';
import { toJSON } from './utils';

/**
 * Stage-3 replacement of `monofile-utilities/lib/nonenumerable` (which ships a
 * legacy `(p, key, desc?)` decorator). Marks the field as a non-enumerable own
 * data property on the instance.
 */
function nonenumerable(
  _value: unknown,
  context: {
    name: string | symbol;
    addInitializer(fn: (this: any) => void): void;
  },
) {
  context.addInitializer(function (this: any) {
    Object.defineProperty(this, context.name, {
      enumerable: false,
      configurable: true,
      writable: true,
      value: this[context.name],
    });
  });
}

describe('decorator:format', () => {
  it('format date/regexp', () => {
    const time = new Date();
    const reg = /abc/gimu;

    class N {
      @date accessor date = time;
      @regexp accessor reg = reg;
    }

    const n = new N();

    assert.deepStrictEqual(toJSON(n), {
      date: time.toISOString(),
      reg: { source: reg.source, flags: reg.flags },
    });
    const data = JSON.parse(JSON.stringify(n));
    const store = new N();
    store.date = new Date(0);
    store.reg = /def/giu;
    assert.notDeepEqual(toJSON(store), toJSON(n));
    parseStore(store, data, false);
    assert.deepStrictEqual(toJSON(store), toJSON(n));
  });
});

describe('decorator:ignore', () => {
  it('should be ignored', () => {
    class Node {
      @observable accessor n0 = 'n0';
      @ignore @observable accessor ignored = 'ignored';
      @observable accessor normal = 'normal';
    }

    const node = new Node();
    assert.deepStrictEqual(toJSON(node), { normal: 'normal', n0: 'n0' });
  });

  it('should not working with nonenumerable', () => {
    class Node {
      @observable accessor n0 = 'n0';
      @nonenumerable @observable accessor n1 = 'n1';
      @observable accessor n2 = 'n2';
      @nonenumerable n3 = 'n3';
    }

    // inject is what installs `toJSON` (needed to serialize mobx 7 accessor
    // fields, which are non-enumerable). In real stores it is triggered by
    // @ignore/@version/@format; here the class uses none, so call it directly.
    inject(Node.prototype);

    assert.deepStrictEqual(toJSON(new Node()), {
      n0: 'n0',
      n1: 'n1',
      n2: 'n2',
    });
  });
});

describe('decorator:ignore:ssr', () => {
  beforeEach(() => config({ ssr: true }));
  afterEach(() => config({ ssr: false }));
  it('should not ignore with ssr', () => {
    class Node {
      @ignore @observable accessor onlyClientIgnored = 'onlyClientIgnored';
      @ignore.ssr @observable accessor ssrIgnored = 'ssrIgnored';
    }

    const node = new Node();

    assert.deepStrictEqual(toJSON(node), {
      onlyClientIgnored: 'onlyClientIgnored',
    });

    const data = new Node();
    data.onlyClientIgnored = 'new value';
    data.ssrIgnored = 'new value';
    parseStore(node, toJSON(data), true);
    assert.strictEqual(node.onlyClientIgnored, 'new value');
    assert.strictEqual(node.ssrIgnored, 'ssrIgnored');
  });
});

describe('decorator:version', () => {
  @version(2)
  class Node {
    @version(1)
    accessor id = 0;
  }

  const node = new Node();

  it('should persist versions', () => {
    assert.deepStrictEqual(toJSON(node), {
      [KeyVersions]: { id: 1, [KeyNodeVersion]: 2 },
      id: 0,
    });
  });

  it('should persist versions with extends', () => {
    class P {
      @version(1)
      accessor p = 1;
    }

    class C extends P {
      @version(2)
      accessor c = 2;
    }

    const c = new C();
    assert.deepStrictEqual(toJSON(c), {
      p: 1,
      c: 2,
      [KeyVersions]: {
        p: 1,
        c: 2,
      },
    });
  });
});
