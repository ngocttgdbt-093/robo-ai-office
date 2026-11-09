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
  append(child) { this.children.push(child); }
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
