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

test('trading floor has a front director desk, ten meeting seats and greenery', () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const source = readFileSync(new URL('../office.js', import.meta.url), 'utf8').split('const formatter')[0];
  const context = { document: { getElementById: get, createElement: () => new Element(), createElementNS: () => new Element() } };
  runInNewContext(source, context);
  const zones = get('rooms').children;
  assert.ok(zones[0].attributes.class.includes('director-zone'));
  const meeting = zones.find(zone => zone.attributes['aria-label'] === 'Phòng họp AI');
  assert.equal(meeting.children.flatMap(node => node.children).filter(node => node.attributes.class === 'meeting-chair').length, 10);
  assert.ok(get('plants').children.length >= 4);
  runInNewContext("paintWorkScreen({phase:'implementation',status:'running',agent:'Codex',title:'Task',project:'ROBO AI OFFICE'}, true)", context);
  assert.equal(get('project-led').textContent, 'ROBO AI OFFICE');
});

test('floor handles wheel zoom, left drag, right drag and two-finger gestures', () => {
  const elements = new Map();
  const handlers = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  Object.assign(get('scene'), {
    addEventListener: (name, fn) => handlers.set(name, fn),
    getBoundingClientRect: () => ({left:0,top:0,width:900}),
    setPointerCapture() {},
  });
  const source = readFileSync(new URL('../office.js', import.meta.url), 'utf8');
  const gestures = source.split('projects();')[1].split('let workRequest')[0];
  runInNewContext(source.split('const formatter')[0] + gestures, {
    document: { getElementById: get, createElement: () => new Element(), createElementNS: () => new Element() },
    setTimeout,
  });
  const event = (name, args) => handlers.get(name)({ preventDefault() {}, ...args });
  const camera = () => get('camera').attributes.transform;
  event('wheel', { deltaY:-120, deltaMode:0, clientX:450, clientY:225 });
  assert.ok(parseInt(get('view-level').textContent) > 100);
  get('reset-view').onclick();
  const pointer = (name,id,x,y,button=0,type='mouse') => event('pointer'+name,{pointerId:id,clientX:x,clientY:y,button,pointerType:type,isPrimary:id===1});
  pointer('down',1,450,225);
  pointer('move',1,475,245);
  pointer('up',1,475,245);
  assert.match(camera(), /^translate\(475 245\)/);
  pointer('down',1,450,225,2);
  pointer('move',1,515,225,2);
  pointer('up',1,515,225,2);
  assert.doesNotMatch(camera(), /rotate\(0\)/);
  get('reset-view').onclick();
  pointer('down',1,400,225,0,'touch');
  pointer('down',2,500,225,0,'touch');
  pointer('move',2,540,265,0,'touch');
  assert.ok(parseInt(get('view-level').textContent) > 100);
  assert.doesNotMatch(camera(), /rotate\(0\)/);
});

test('tracking OCR shows a clearly inactive LED until a live event arrives', () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const source = readFileSync(new URL('../office.js', import.meta.url), 'utf8').split('const formatter')[0];
  const context = { document: { getElementById: get, createElement: () => new Element(), createElementNS: () => new Element() } };
  runInNewContext(source, context);
  get('track-ocr').onclick();
  assert.match(get('project-led').textContent, /Dự án 03/);
  assert.match(get('project-led-caption').textContent, /CHƯA CÓ TÍN HIỆU/);
  assert.equal(get('project-led').attributes['data-active'], false);
  runInNewContext("paintWorkScreen({phase:'implementation',status:'running',agent:'Codex',project:ocrProject}, true)", context);
  assert.equal(get('project-led').attributes['data-active'], true);
  assert.equal(get('project-led-caption').textContent, 'DỰ ÁN ĐANG CHẠY');
});

test('the wall uses an integrated backdrop and does not show a passing test on a running verification', () => {
  const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(source, /class="wall-scene"[\s\S]*office-floor\.webp[\s\S]*id="project-led"[\s\S]*id="work-screen"/);
  assert.match(source, /id="wall-focus"/);
  assert.match(source, /<details class="floor-map"/);
});

test('floor arrows require a fresh handoff, and active teams are identified independently', () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const source = readFileSync(new URL('../office.js', import.meta.url), 'utf8').split('const formatter')[0];
  const context = { document: { getElementById: get, createElement: () => new Element(), createElementNS: () => new Element() } };
  runInNewContext(source, context);
  runInNewContext(`paintWallFlow([
    {status:'running', phase:'verification', previous:'implementation', updated:new Date(1000).toISOString()},
    {status:'running', phase:'implementation', updated:new Date(1000).toISOString()},
  ], 1500)`, context);
  assert.equal(get('wall-live-routes').children.length, 1);
  assert.match(get('wall-verification').textContent, /Đang kiểm thử/);
  assert.match(get('wall-implementation').textContent, /Đang thực hiện/);
  assert.match(get('wall-flow-status').textContent, /Công nghệ → Kiểm soát/);
  runInNewContext(`paintWallFlow([{status:'running', phase:'verification', previous:'implementation', phase_started:new Date(1000).toISOString(), updated:new Date(59000).toISOString()}], 60000)`, context);
  assert.equal(get('wall-live-routes').children.length, 0);
  assert.match(get('wall-verification').textContent, /Đang kiểm thử/);
  runInNewContext('paintWallFlow([], 60000, false)', context);
  assert.match(get('wall-flow-status').textContent, /Mất kết nối/);
});

test('a real failed CI run remains on the wall without implying Work is running', () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const source = readFileSync(new URL('../office.js', import.meta.url), 'utf8').split('const formatter')[0];
  const context = { document: { getElementById:get, createElement:() => new Element(), createElementNS:() => new Element() } };
  runInNewContext(source, context);
  runInNewContext(`ciRun = {name:'OpenMausBot bridge CI', status:'completed', conclusion:'failure', source:'render', updated:'2026-11-09T18:15:12Z', url:'https://github.com/run'};
    paintWorkScreen(null);
    paintWallFlow([]);`, context);
  assert.equal(get('project-led').textContent, 'ROBO AI OFFICE');
  assert.equal(get('project-led').attributes['data-active'], false);
  assert.equal(get('screen-heading').textContent, 'Thất bại');
  assert.equal(get('wall-live-routes').children.length, 1);
  assert.match(get('wall-flow-status').textContent, /GitHub Actions → Văn phòng.*Thất bại/);
});

test('only working stations animate and queued CI does not simulate coding', () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const source = readFileSync(new URL('../office.js', import.meta.url), 'utf8').split('const formatter')[0];
  const context = {document:{getElementById:get, createElement:()=>new Element(), createElementNS:()=>new Element()}};
  runInNewContext(source, context);
  runInNewContext("paintWallFlow([{status:'running',phase:'implementation',updated:new Date(1000).toISOString()}], 1500)", context);
  assert.equal(get('wall-station-implementation').attributes['data-activity'], 'code');
  assert.equal(get('wall-station-planning').attributes['data-activity'], 'idle');
  runInNewContext("ciRun = {status:'queued',name:'CI'}; paintWallFlow([])", context);
  assert.equal(get('wall-station-verification').attributes['data-activity'], 'waiting');
  assert.equal(get('wall-station-implementation').attributes['data-activity'], 'idle');
  runInNewContext("ciRun = {status:'completed',conclusion:'failure',name:'CI'}; paintWallFlow([])", context);
  assert.equal(get('wall-station-verification').attributes['data-activity'], 'idle');
});
