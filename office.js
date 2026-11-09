const rooms = [
  ['Giám đốc', 'Phê duyệt và điều hành', '#b6a16a'],
  ['AI Manager', 'Điều phối tác vụ và xem trạng thái Agent.', '#49b7d1'],
  ['Phòng họp AI', 'Không gian phối hợp và phản biện.', '#887cba'],
  ['Công nghệ', 'Theo dõi hoạt động mã nguồn và giao tác vụ kiểm tra commit.', '#60a6d6'],
  ['Dữ liệu', 'Theo dõi dự án dashboard và báo cáo.', '#59b8a6'],
  ['Nghiệp vụ', 'Không gian nghiệp vụ bảo hiểm.', '#b08667'],
  ['Kinh doanh', 'Không gian CRM và dự án DNS.', '#ae7d9e'],
  ['Nghiên cứu', 'Không gian nghiên cứu và thử nghiệm.', '#738ec2'],
  ['Kiểm soát', 'Xem lịch sử thực thi và kiểm tra kết quả.', '#6ab2b7'],
];
const byId = id => document.getElementById(id);
const svg = (tag, attributes, parent) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent.append(node);
  return node;
};
const point = (x, y, z = 0) => [450 + 1.14 * (x - y), 125 + .52 * (x + y) - z];
const face = (parent, vertices, fill, extra = {}) => svg('polygon', {
  points: vertices.map(vertex => point(...vertex).join(',')).join(' '), fill, ...extra,
}, parent);
function block(parent, x, y, w, d, base, top, colors, extra) {
  face(parent, [[x,y+d,base],[x+w,y+d,base],[x+w,y+d,top],[x,y+d,top]], colors[1]);
  face(parent, [[x+w,y,base],[x+w,y+d,base],[x+w,y+d,top],[x+w,y,top]], colors[2]);
  return face(parent, [[x,y,top],[x+w,y,top],[x+w,y+d,top],[x,y+d,top]], colors[0], extra);
}
const labels = [];
const label = (parent, text, [x,y], className = '') => {
  const node = svg('text', { x, y, 'text-anchor': 'middle', class:className }, parent);
  node.textContent = text;
  labels.push({node,x,y});
  return node;
};
block(byId('floor'), -15, -15, 349, 349, -16, -3, ['#1a384e','#0a1c2c','#102c40'], {stroke:'#4a788c'});
const controls = [];
const position = index => [(index % 3) * 111, Math.floor(index / 3) * 111];
const routes = [
  [0, 1, 'command'], [1, 2, 'command'], [1, 3, 'command'], [1, 4, 'command'],
  [2, 5, 'activity'], [3, 4, 'activity'], [4, 5, 'activity'],
  [6, 7, 'activity'], [7, 8, 'activity'], [5, 8, 'activity'],
];
function drawRoute(from, to, kind, parent) {
  const [fx, fy] = position(from);
  const [tx, ty] = position(to);
  const dx = Math.sign(tx - fx), dy = Math.sign(ty - fy);
  const start = point(fx + 48 + 34 * dx, fy + 48 + 34 * dy, 3);
  const end = point(tx + 48 - 34 * dx, ty + 48 - 34 * dy, 3);
  const bend = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 - 11];
  const d = `M${start.join(' ')} Q${bend.join(' ')} ${end.join(' ')}`;
  const group = svg('g', { class: `flow ${kind}` }, parent);
  svg('path', {d, class:'route-line', 'marker-end':`url(#${kind}-arrow)`}, group);
  svg('path', {d, class:'route-pulse'}, group);
  return { group, from, to };
}
const flows = routes.map(([from,to,kind]) => drawRoute(from,to,kind,byId('flows')));
const phaseZones = { planning: 1, implementation: 3, verification: 8 };
const phaseLabels = { planning: 'AI Manager', implementation: 'Công nghệ', verification: 'Kiểm soát' };
const activeWork = new Map();
let workByZone = new Map();
let showFlows = true;
let serverRunning = false;
let selected = -1;
let running = false;
let submitting = false;

rooms.forEach(([name, description, color], i) => {
  const [x, y] = position(i);
  const group = svg('g', { class:'room', role:'button', tabindex:0, 'aria-label':name }, byId('rooms'));
  face(group, [[x,y],[x+95,y],[x+95,y+95],[x,y+95]], color + '48', {class:'tile'});
  const interior = svg('g', {class:'interior'}, group);
  const lounge = [2, 5, 6].includes(i);
  block(interior,x+17,y+16,54,lounge ? 38 : 28,0,15,['#c5e4ec','#688da0','#4b6d84']);
  if (lounge) {
    block(interior,x+20,y+59,24,12,0,8,[color,'#3c596a','#27465b']);
    block(interior,x+14,y+25,7,22,0,11,[color,'#3c596a','#27465b']);
  } else {
    block(interior,x+29,y+20,29,4,15,35,['#638da4','#123447','#7be8ff']);
  }
  const robot = svg('g', {class:'robot'}, group);
  const [cx,cy] = point(x+59,y+58,15);
  svg('ellipse',{cx,cy:cy+14,rx:15,ry:5,fill:'#0a2336'},robot);
  svg('rect',{x:cx-10,y:cy-5,width:20,height:18,rx:7,fill:'url(#silver)'},robot);
  svg('rect',{x:cx-15,y:cy-22,width:30,height:20,rx:8,fill:'url(#silver)',stroke:'#bcecff'},robot);
  svg('rect',{x:cx-10,y:cy-17,width:20,height:9,rx:4,fill:'#123044'},robot);
  for (const offset of [-4,4]) svg('circle',{cx:cx+offset,cy:cy-12,r:1.8,fill:'#78efff'},robot);
  const [lx,ly] = point(x+82,y+67,1);
  svg('circle',{cx:lx,cy:ly,r:4,class:'light',fill:'#a4b7c1'},group);
  label(group,name,point(x+70,y+83,-2));
  const agentTag = label(group,'',point(x+56,y+63,48),'agent-tag');
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = name;
  button.onclick = group.onclick = () => selectRoom(i);
  group.onkeydown = event => {
    if (['Enter',' '].includes(event.key)) { event.preventDefault(); selectRoom(i); }
  };
  byId('nav').append(button);
  controls.push({ group, button, description, agentTag });
});

function paintRooms() {
  controls.forEach(({group,button,agentTag}, i) => {
    const active = (i === 3 && serverRunning) || activeWork.has(i);
    group.classList.toggle('is-selected', i === selected);
    group.classList.toggle('is-running', active);
    const worker = activeWork.get(i);
    agentTag.textContent = worker ? worker.agent + (worker.skills.length ? ' · ' + worker.skills.length + ' skill' : '') : i === 3 && serverRunning ? 'GitHub Agent' : '';
    for (const element of [group, button]) element.setAttribute('aria-pressed', i === selected);
  });
  byId('flows').setAttribute('visibility', showFlows ? 'visible' : 'hidden');
  byId('toggle-flows').setAttribute('aria-pressed', showFlows);
  const related = flows.filter(({group, from, to}) => {
    const touches = selected === from || selected === to;
    group.classList.toggle('is-related', touches);
    group.classList.toggle('is-muted', selected >= 0 && !touches);
    return touches;
  });
  byId('route-description').textContent = showFlows && selected >= 0
    ? related.map(({from, to}) => rooms[from][0] + ' → ' + rooms[to][0]).join(' · ')
    : '';
  const workers = workByZone.get(selected) ?? [];
  byId('zone-work').textContent = workers.map(task =>
    task.agent + (task.skills.length ? ' · ' + task.skills.join(', ') : '')).join(' | ');
}
function selectRoom(i) {
  selected = i;
  paintRooms();
  byId('room-title').textContent = rooms[i]?.[0] ?? 'Toàn cảnh văn phòng';
  byId('room-description').textContent = controls[i]?.description ?? 'Chọn một khu để xem chức năng và làm nổi bật các tuyến liên quan.';
}
byId('toggle-flows').onclick = () => {
  showFlows = !showFlows;
  paintRooms();
};
byId('overview').onclick = () => selectRoom(-1);
selectRoom(-1);

let zoom = 100;
let angle = 0;
let mirrored = false;
let panX = 0;
let panY = 0;
function paintCamera() {
  const fit = angle % 180 === 0 ? 1 : 0.63;
  const scale = zoom / 100 * fit;
  const direction = mirrored ? -1 : 1;
  byId('camera').setAttribute('transform', `translate(${450 + panX} ${253 + panY}) rotate(${angle}) scale(${scale * direction} ${scale}) translate(-450 -253)`);
  for (const {node,x,y} of labels) {
    node.setAttribute('transform', `translate(${x} ${y}) scale(${direction} 1) rotate(${-angle}) translate(${-x} ${-y})`);
  }
  byId('scene').setAttribute('data-pannable', zoom > 100);
  byId('view-level').textContent = zoom + '%';
  byId('zoom-in').disabled = zoom >= 180;
  byId('zoom-out').disabled = zoom <= 60;
  byId('mirror-view').setAttribute('aria-pressed', mirrored);
}
function changeView(nextZoom, nextAngle, nextMirror) {
  zoom = nextZoom;
  angle = (nextAngle + 360) % 360;
  mirrored = nextMirror;
  panX = panY = 0;
  paintCamera();
}
byId('zoom-in').onclick = () => changeView(Math.min(180, zoom + 20), angle, mirrored);
byId('zoom-out').onclick = () => changeView(Math.max(60, zoom - 20), angle, mirrored);
byId('rotate-left').onclick = () => changeView(zoom, angle - 90, mirrored);
byId('rotate-right').onclick = () => changeView(zoom, angle + 90, mirrored);
byId('mirror-view').onclick = () => changeView(zoom, angle, !mirrored);
byId('reset-view').onclick = () => changeView(100, 0, false);
paintCamera();

const formatter = new Intl.DateTimeFormat('vi-VN',{ dateStyle:'short', timeStyle:'short', timeZone:'Asia/Ho_Chi_Minh' });
const date = iso => formatter.format(new Date(iso));
async function api(path, options) {
  const response = await fetch('./api/' + path, { ...options, signal: AbortSignal.timeout(20000) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Không kết nối được máy chủ Agent.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
function commitLink(commit) {
  const link = document.createElement('a');
  link.href = commit.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = commit.title;
  return link;
}
async function projects() {
  byId('refresh').disabled = true;
  byId('github-status').textContent = 'Đang lấy dữ liệu từ GitHub…';
  try {
    const data = await api('projects');
    byId('projects').replaceChildren(...data.map(({repo,commit,error}) => {
      const card = document.createElement('article');
      card.className = 'project';
      const title = document.createElement('h3');
      title.textContent = repo;
      const summary = document.createElement('p');
      summary.textContent = commit ? date(commit.date) : error ?? 'Chưa có commit.';
      card.append(title, summary);
      if (commit) card.append(commitLink(commit));
      return card;
    }));
    byId('github-status').textContent = data.filter(project => !project.error).length + '/' + data.length + ' dự án truy xuất được';
  } catch (error) {
    byId('github-status').textContent = error.message;
  } finally { byId('refresh').disabled = false; }
}
let historyRequest = 0;
async function history() {
  const request = ++historyRequest;
  try {
    const runs = await api('runs');
    if (request !== historyRequest) return;
    serverRunning = runs.some(run => run.status === 'running');
    running = submitting || serverRunning;
    byId('history').replaceChildren(...runs.map(run => {
      const li = document.createElement('li');
      const detail = document.createElement('details');
      const summary = document.createElement('summary');
      const states = {running:'Đang chạy',completed:'Hoàn tất',failed:'Thất bại'};
      summary.textContent = run.repo + ' · ' + states[run.status] + ' · ' + date(run.started);
      detail.append(summary);
      if (run.error) { const p = document.createElement('p'); p.textContent = run.error; detail.append(p); }
      if (run.result?.length) detail.append(...run.result.map(commitLink));
      if (run.result?.length === 0) { const p = document.createElement('p'); p.textContent = 'Chưa có commit.'; detail.append(p); }
      li.append(detail);
      return li;
    }));
    if (!runs.length) {
      const empty = document.createElement('li');
      empty.textContent = 'Chưa có lần chạy.';
      byId('history').append(empty);
    }
    byId('runtime-status').textContent = serverRunning ? 'Agent Công nghệ đang chạy' : submitting ? 'Đang gửi yêu cầu…' : 'Đã kết nối · Sẵn sàng nhận việc';
    byId('run').disabled = running;
    paintRooms();
  } catch (error) {
    if (request !== historyRequest) return;
    byId('runtime-status').textContent = error.message;
    byId('run').disabled = true;
  }
}
byId('run-form').onsubmit = async event => {
  event.preventDefault();
  if (running) return;
  submitting = running = true;
  byId('run').disabled = true;
  byId('runtime-status').textContent = 'Đang gửi yêu cầu…';
  paintRooms();
  const progress = setInterval(history, 750);
  let failure;
  try {
    const run = await api('runs', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repo:byId('repo').value})});
    failure = run.error;
  } catch (error) { failure = error.message; }
  clearInterval(progress);
  submitting = running = serverRunning = false;
  paintRooms();
  await history();
  if (failure) byId('runtime-status').textContent = failure;
};
byId('refresh').onclick = projects;
byId('refresh-runs').onclick = history;
setInterval(() => { if (running && !submitting && !document.hidden) history(); }, 3500);
history();
projects();

let drag = null;
let suppressClick = false;
const scene = byId('scene');
scene.addEventListener('pointerdown', event => {
  if (zoom <= 100 || !event.isPrimary || event.button !== 0) return;
  drag = { id:event.pointerId, x:event.clientX, y:event.clientY, panX, panY, moved:false };
});
scene.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx,dy) < 6) return;
  if (!drag.moved) scene.setPointerCapture(event.pointerId);
  drag.moved = true;
  const ratio = 900 / scene.getBoundingClientRect().width;
  panX = Math.max(-410, Math.min(410, drag.panX + dx * ratio));
  panY = Math.max(-300, Math.min(300, drag.panY + dy * ratio));
  paintCamera();
});
function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  suppressClick = event.type === 'pointerup' && drag.moved;
  drag = null;
  if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
}
scene.addEventListener('pointerup', endDrag);
scene.addEventListener('pointercancel', endDrag);
scene.addEventListener('click', event => {
  if (suppressClick) event.stopPropagation();
}, true);

let workRequest = 0;
async function refreshWork() {
  const request = ++workRequest;
  try {
    const tasks = await api('work');
    if (request !== workRequest) return;
    const now = Date.now();
    activeWork.clear();
    workByZone = new Map();
    byId('live-flows').replaceChildren();
    byId('work-list').replaceChildren(...tasks.map(task => {
      const age = now - Date.parse(task.updated);
      const live = task.status === 'running' && age < 10 * 60_000;
      if (live) {
        const zone = phaseZones[task.phase];
        if (!activeWork.has(zone)) activeWork.set(zone, task);
        workByZone.set(zone, [...(workByZone.get(zone) ?? []), task]);
        if (task.previous && age < 25_000) drawRoute(phaseZones[task.previous],phaseZones[task.phase],'work',byId('live-flows'));
      }
      const row = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = task.title;
      const note = document.createElement('p');
      const status = {completed:'Hoàn tất',failed:'Gặp lỗi',running:live ? 'Đang thực hiện' : 'Chưa có cập nhật mới'};
      note.textContent = status[task.status] + ' · ' + phaseLabels[task.phase] + ' · ' + date(task.updated);
      const badge = document.createElement('p');
      badge.className = 'worker-badge';
      badge.textContent = task.agent + (task.skills.length ? ' · ' + task.skills.join(', ') : '');
      row.append(title,note,badge);
      return row;
    }));
    byId('work-status').textContent = tasks.length ? 'Cập nhật từ các phiên Work đã kết nối.' : 'Chưa có tác vụ Work được kết nối.';
    paintRooms();
  } catch {
    if (request !== workRequest) return;
    activeWork.clear();
    workByZone = new Map();
    byId('live-flows').replaceChildren();
    byId('work-status').textContent = 'Tạm mất kết nối. Lịch sử bên dưới có thể đã cũ.';
    paintRooms();
  }
}
refreshWork();
setInterval(() => { if (!document.hidden) refreshWork(); }, 3500);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshWork(); });
