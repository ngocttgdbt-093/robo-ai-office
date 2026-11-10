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

test('all nine robots remain selectable on a fixed map without simulated routes', () => {
  const { get } = office();
  assert.equal(get('rooms').children.length, 9);
  get('nav').children[3].onclick();
  assert.equal(get('room-title').textContent, 'Công nghệ');
  get('overview').onclick();
  assert.equal(get('room-title').textContent, 'Toàn cảnh văn phòng');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /id="(?:wall-sample|wall-sample-routes|toggle-flows|flows|zoom-in|rotate-left|mirror-view|reset-view)"/);
});

function office() {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const source = readFileSync(new URL('../office.js', import.meta.url), 'utf8').split('const formatter')[0];
  const context = { document: { getElementById: get, createElement: () => new Element(), createElementNS: () => new Element() } };
  runInNewContext(source, context);
  return { get, evaluate: code => runInNewContext(code, context) };
}

test('Dashboard Work takes priority over office CI and an unnamed task is marked explicitly', () => {
  const { get, evaluate } = office();
  evaluate(`ciRun = {name:'Office CI',status:'in_progress'};
    paintWorkScreen({phase:'implementation',status:'running',agent:'Codex',project:'pti093db'}, true)`);
  assert.equal(get('project-led').textContent, '07-Dashboard số liệu GĐBT 093');
  evaluate("paintWorkScreen({phase:'implementation',status:'running',agent:'Codex',title:'Sửa giao diện'}, true)");
  assert.equal(get('project-led').textContent, 'CHƯA CÓ TÊN DỰ ÁN');
  evaluate('paintWorkScreen(null)');
  assert.equal(get('project-led').textContent, 'ĐANG CHỜ DỰ ÁN');
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

test('the LED picker lists observed projects and live work overrides idle selection', () => {
  const { get, evaluate } = office();
  const picker = get('led-project-picker');
  picker.value = '';
  evaluate(`paintProjectPicker([
    {project:'Dự án 03 — OCR giấy tờ TBTN/YCBT'},
    {project:'pti093db'}, {project:'ngocttgdbt-093/pti093db'}, {project:null}
  ])`);
  assert.equal(picker.children.length, 3);
  assert.equal(picker.children[0].value, '');
  assert.equal(picker.children[2].value, '07-Dashboard số liệu GĐBT 093');
  picker.value = picker.children[1].value;
  picker.onchange();
  assert.match(get('project-led').textContent, /Dự án 03/);
  assert.match(get('project-led-caption').textContent, /ĐANG XEM/);
  assert.equal(get('project-led').attributes['data-active'], false);
  evaluate("paintWorkScreen({phase:'implementation',status:'running',agent:'Codex',project:'pti093db'}, true)");
  assert.equal(get('project-led').textContent, '07-Dashboard số liệu GĐBT 093');
  evaluate('paintWorkScreen(null)');
  assert.match(get('project-led').textContent, /Dự án 03/);
  evaluate("paintProjectPicker([{project:'pti093db'}]); paintWorkScreen(null)");
  assert.equal(picker.value, '');
  assert.equal(get('project-led').textContent, 'ĐANG CHỜ DỰ ÁN');
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
  assert.equal(get('project-led').textContent, 'ĐANG CHỜ DỰ ÁN');
  assert.equal(get('project-led').attributes['data-active'], false);
  assert.equal(get('screen-heading').textContent, 'Thất bại');
  assert.equal(get('wall-live-routes').children.length, 0);
  assert.match(get('wall-flow-status').textContent, /Chưa có tác vụ Work/);
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
  assert.equal(get('wall-station-implementation').attributes['data-working'], true);
  assert.equal(get('wall-station-planning').attributes['data-activity'], 'idle');
  runInNewContext("ciRun = {status:'queued',name:'CI'}; paintWallFlow([])", context);
  assert.equal(get('wall-station-verification').attributes['data-activity'], 'waiting');
  assert.equal(get('wall-station-verification').attributes['data-working'], false);
  assert.equal(get('wall-station-implementation').attributes['data-activity'], 'idle');
  runInNewContext("ciRun = {status:'completed',conclusion:'failure',name:'CI'}; paintWallFlow([])", context);
  assert.equal(get('wall-station-verification').attributes['data-activity'], 'idle');
});

test('only overflowing LED titles scroll', () => {
  const { get, evaluate } = office();
  const viewport = get('project-led-viewport');
  viewport.clientWidth = 140;
  const properties = {};
  viewport.style = { setProperty: (key, value) => { properties[key] = value; } };
  get('project-led').scrollWidth = 210;
  evaluate('fitLed()');
  assert.ok(viewport.classes.has('is-overflowing'));
  assert.equal(properties['--led-start'], '140px');
  get('project-led').scrollWidth = 130;
  evaluate('fitLed()');
  assert.ok(!viewport.classes.has('is-overflowing'));
});

test('central monitor shows the observed Codex timeline and stops on signal loss', () => {
  const { get, evaluate } = office();
  evaluate(`const date = () => '22:14';
    paintWorkScreen({phase:'verification',status:'completed',agent:'Codex',title:'Kiểm tra',
      timeline:[{activity:'test_failed'}, {activity:'test_passed'}, {activity:'completed'}]})`);
  assert.equal(get('screen-source').textContent, 'CODEX LIVE');
  assert.equal(get('screen-heading').textContent, 'Hoàn tất');
  assert.deepEqual(get('screen-lines').children.map(row => row.textContent), [
    '22:14 · Kiểm thử thất bại', '22:14 · Kiểm thử thành công', '22:14 · Codex đã hoàn tất',
  ]);
  evaluate(`workSignalUnavailable = true; paintWorkScreen(null)`);
  assert.match(get('screen-heading').textContent, /Mất kết nối/);
});
