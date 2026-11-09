import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

class Element {
  children = [];
  attributes = {};
  classes = new Set();
  classList = { toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name) };
  setAttribute(name, value) { this.attributes[name] = value; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

test('all nine robots appear immediately and route controls highlight without closing any zone', () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const source = readFileSync(new URL('../office.js', import.meta.url), 'utf8').split('const formatter')[0];
  runInNewContext(source, { document: { getElementById: get, createElement: () => new Element(), createElementNS: () => new Element() } });
  const robots = () => get('rooms').children.flatMap(zone => zone.children.filter(child => child.attributes.class === 'robot'));
  assert.equal(robots().length, 9);
  const arrows = get('flows').children;
  assert.ok(arrows.length > 3);
  assert.ok(arrows.every(arrow => arrow.children[0].attributes['marker-end']));
  get('nav').children[3].onclick();
  assert.equal(get('room-title').textContent, 'Công nghệ');
  assert.ok(arrows.some(arrow => arrow.classes.has('is-related')));
  assert.ok(arrows.some(arrow => arrow.classes.has('is-muted')));
  assert.equal(robots().length, 9);
  get('toggle-flows').onclick();
  assert.equal(get('flows').attributes.visibility, 'hidden');
  assert.equal(get('toggle-flows').attributes['aria-pressed'], false);
});

test('camera zooms, rotates, mirrors and resets', () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const source = readFileSync(new URL('../office.js', import.meta.url), 'utf8').split('const formatter')[0];
  runInNewContext(source, { document: { getElementById: get, createElement: () => new Element(), createElementNS: () => new Element() } });
  get('zoom-in').onclick();
  assert.match(get('camera').attributes.transform, /scale\(1\.2 1\.2\)/);
  get('rotate-right').onclick();
  get('mirror-view').onclick();
  assert.match(get('camera').attributes.transform, /rotate\(90\) scale\(-[0-9.]+ [0-9.]+\)/);
  get('reset-view').onclick();
  assert.match(get('camera').attributes.transform, /rotate\(0\) scale\(1 1\)/);
});

test('central screen switches between coding and testing from real phase status', () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const source = readFileSync(new URL('../office.js', import.meta.url), 'utf8').split('const formatter')[0];
  const context = { document: { getElementById: get, createElement: () => new Element(), createElementNS: () => new Element() } };
  runInNewContext(source, context);
  runInNewContext("paintWorkScreen({phase:'implementation',status:'running',agent:'Codex'}, true)", context);
  assert.equal(get('work-screen').attributes['data-mode'], 'implementation');
  runInNewContext("paintWorkScreen({phase:'verification',status:'running',agent:'Codex'}, true)", context);
  assert.equal(get('work-screen').attributes['data-mode'], 'verification');
  assert.doesNotMatch(get('screen-heading').textContent, /Hoàn tất/);
  runInNewContext("paintWorkScreen({phase:'verification',status:'failed',agent:'Codex'}, false)", context);
  assert.match(get('screen-heading').textContent, /Gặp lỗi/);
});
