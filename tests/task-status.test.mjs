import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTaskStatus } from '../src/task-status.mjs';

// Detect missing allowlist entries and incorrect/default return values.
for (const status of ['queued', 'running', 'completed', 'failed']) {
  test(`preserves ${status}`, () => {
    assert.equal(normalizeTaskStatus(status), status);
  });
}

// Detect missing trim or lowercase normalization.
for (const [input, expected] of [
  ['  QUEUED  ', 'queued'],
  ['\tRuNnInG\n', 'running'],
  [' Completed ', 'completed'],
  ['\nFaIlEd\t', 'failed'],
]) {
  test(`normalizes ${JSON.stringify(input)}`, () => {
    assert.equal(normalizeTaskStatus(input), expected);
  });
}

// Detect permissive aliases, empty defaults, substring or prototype lookup bugs.
for (const input of ['', ' \t\n', 'pending', 'done', 'error', 'run ning', 'queued extra', 'constructor', 'toString', '__proto__']) {
  test(`rejects invalid string ${JSON.stringify(input)}`, () => {
    assert.throws(() => normalizeTaskStatus(input), RangeError);
  });
}

// Detect coercion and missing type validation; do not run user-defined conversion.
for (const [label, input] of [
  ['undefined', undefined], ['null', null], ['number', 1], ['boolean', false],
  ['array', ['queued']], ['object', {}], ['boxed string', new String('queued')],
  ['symbol', Symbol('queued')], ['bigint', 1n], ['function', () => 'queued'],
  ['custom conversion', { toString() { throw new Error('must not coerce'); } }],
]) {
  test(`rejects ${label} with TypeError`, () => {
    assert.throws(() => normalizeTaskStatus(input), TypeError);
  });
}
