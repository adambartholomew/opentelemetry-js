/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';
import Sinon = require('sinon');
import sinon = require('sinon');
import { Instrumentation, InstrumentationBase, InstrumentationModuleDefinition } from '../../src';

class TestNodeInstrumentation extends InstrumentationBase {
  constructor() {
    super('TestNode', '1.0.0');
  }
  enable() {}
  disable() {}
  init() {}
}

describe('InstrumentationBase', () => {
  let instrumentation: Instrumentation;
  beforeEach(() => {
    instrumentation = new TestNodeInstrumentation();
  });

  it('should create an instance', () => {
    assert.ok(instrumentation instanceof InstrumentationBase);
  });

  it('should have a name', () => {
    assert.deepStrictEqual(instrumentation.instrumentationName, 'TestNode');
  });

  it('should have a version', () => {
    assert.deepStrictEqual(instrumentation.instrumentationVersion, '1.0.0');
  });

  describe('constructor', () => {
    it('should enable instrumentation by default', () => {
      let called = false;
      class TestNodeInstrumentation2 extends TestNodeInstrumentation {
        enable() {
          called = true;
        }
      }
      instrumentation = new TestNodeInstrumentation2();
      assert.strictEqual(called, true);
    });
  });

  describe('_onRequire', () => {
    let instrumentation: TestNodeInstrumentation;
    let versionStub: Sinon.SinonStub;
    let supportedStub: Sinon.SinonStub;
    let modulePatchSpy: Sinon.SinonSpy;
    let filePatchSpy: Sinon.SinonSpy;
    let exportDefinition: unknown;
    let moduleDefinition: InstrumentationModuleDefinition<unknown>;

    beforeEach(() => {
      instrumentation = new TestNodeInstrumentation();
      // @ts-expect-error access internal property for testing
      instrumentation._enabled = true;
      modulePatchSpy = sinon.spy();
      filePatchSpy = sinon.spy();

      exportDefinition = {};
      moduleDefinition = {
        supportedVersions: ['^1.1.0'],
        name: 'test-module',
        patch: modulePatchSpy as unknown,
        files: [{
          name: 'test-file',
          supportedVersions: ['^1.1.0'],
          patch: filePatchSpy as unknown
        }]
      } as InstrumentationModuleDefinition<unknown>;
    })

    describe('when module version is supported', () => {
      beforeEach(() => {
        // @ts-expect-error access internal property for testing
        versionStub = sinon.stub(instrumentation, 'getPackageVersion').returns('1.1.0');
        // @ts-expect-error access internal property for testing
        supportedStub = sinon.stub(instrumentation, 'isSupported').returns(true)
      });

      it('patches main module', () => {
        // @ts-expect-error access internal property for testing
        instrumentation._onRequire<unknown>(
          moduleDefinition,
          exportDefinition,
          'test-module',
          '/foo/bar'
        )

        assert.strictEqual(moduleDefinition.moduleVersion, '1.1.0')
        assert.strictEqual(moduleDefinition.moduleExports, exportDefinition)
        sinon.assert.calledOnceWithExactly(versionStub, '/foo/bar')
        sinon.assert.calledWith(supportedStub, ['^1.1.0'], '1.1.0')
        sinon.assert.calledOnceWithExactly(modulePatchSpy, exportDefinition, '1.1.0')
        sinon.assert.notCalled(filePatchSpy)
      })

      it('patches module file', () => {
        // @ts-expect-error access internal property for testing
        instrumentation._onRequire<unknown>(
          moduleDefinition,
          exportDefinition,
          'test-file',
          '/foo/bar'
        )

        assert.strictEqual(moduleDefinition.moduleVersion, '1.1.0')
        assert.strictEqual(moduleDefinition.files[0].moduleExports, exportDefinition)
        sinon.assert.calledOnceWithExactly(versionStub, '/foo/bar')
        sinon.assert.calledWith(supportedStub, ['^1.1.0'], '1.1.0')
        sinon.assert.notCalled(modulePatchSpy)
        sinon.assert.calledOnceWithExactly(filePatchSpy, exportDefinition, '1.1.0')
      })

      it('patches module when no baseDir specified', () => {
        // @ts-expect-error access internal property for testing
        instrumentation._onRequire<unknown>(
          moduleDefinition,
          exportDefinition,
          'test-module'
        )

        assert.strictEqual(moduleDefinition.moduleVersion, undefined)
        assert.strictEqual(moduleDefinition.moduleExports, exportDefinition)
        sinon.assert.notCalled(versionStub)
        sinon.assert.notCalled(supportedStub)
        sinon.assert.calledOnceWithExactly(modulePatchSpy, exportDefinition)
        sinon.assert.notCalled(filePatchSpy)
      })
    })

    describe('when module version is not supported', () => {
      beforeEach(() => {
        // @ts-expect-error access internal property for testing
        versionStub = sinon.stub(instrumentation, 'getPackageVersion').returns('2.1.0');
        // @ts-expect-error access internal property for testing
        supportedStub = sinon.stub(instrumentation, 'isSupported').returns(false)
      });

      it('does not patch main module', () => {
        // @ts-expect-error access internal property for testing
        instrumentation._onRequire<unknown>(
          moduleDefinition,
          exportDefinition,
          'test-module',
          '/foo/bar'
        )

        assert.strictEqual(moduleDefinition.moduleVersion, '2.1.0')
        sinon.assert.calledOnceWithExactly(versionStub, '/foo/bar')
        sinon.assert.calledWith(supportedStub, ['^1.1.0'], '2.1.0')
        sinon.assert.notCalled(modulePatchSpy)
        sinon.assert.notCalled(filePatchSpy)
      })

      it('does not patch module file', () => {
        // @ts-expect-error access internal property for testing
        instrumentation._onRequire<unknown>(
          moduleDefinition,
          exportDefinition,
          'test-file',
          '/foo/bar'
        )

        assert.strictEqual(moduleDefinition.moduleVersion, '2.1.0')
        sinon.assert.calledOnceWithExactly(versionStub, '/foo/bar')
        sinon.assert.calledWith(supportedStub, ['^1.1.0'], '2.1.0')
        sinon.assert.notCalled(modulePatchSpy)
        sinon.assert.notCalled(filePatchSpy)
      })

      it('patches module when no baseDir specified', () => {
        // @ts-expect-error access internal property for testing
        instrumentation._onRequire<unknown>(
          moduleDefinition,
          exportDefinition,
          'test-module'
        )

        assert.strictEqual(moduleDefinition.moduleVersion, undefined)
        sinon.assert.notCalled(versionStub)
        sinon.assert.notCalled(supportedStub)
        sinon.assert.calledOnceWithExactly(modulePatchSpy, exportDefinition)
        sinon.assert.notCalled(filePatchSpy)
      })
    })
  })

  describe('isSupported', () => {
    let instrumentation: TestNodeInstrumentation;

    beforeEach(() => {
      instrumentation = new TestNodeInstrumentation();
    })

    it('returns true on matching version', () => {
      // @ts-expect-error access internal property for testing
      const actual = instrumentation.isSupported(['^1.1.0'], '1.1.1')
      assert.strictEqual(actual, true)
    })

    it('returns false on non-matching version', () => {
      // @ts-expect-error access internal property for testing
      const actual = instrumentation.isSupported(['^1.1.0'], '2.1.1')
      assert.strictEqual(actual, false)
    })

    it('returns true on wildcard', () => {
      // @ts-expect-error access internal property for testing
      const actual = instrumentation.isSupported(['*'], '2.1.1')
      assert.strictEqual(actual, true)
    })

    it('returns true on wildcard regardless of missing version', () => {
      // @ts-expect-error access internal property for testing
      const actual = instrumentation.isSupported(['*'], undefined)
      assert.strictEqual(actual, true)
    })
  })
});
