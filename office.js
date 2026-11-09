const rooms = [
  ['Giám đốc', 'Phê duyệt và điều hành', '#b6a16a'],
  ['AI Manager', 'Điều phối tác vụ và xem trạng thái Agent.', '#49b7d1'],
  ['Phòng họp AI', 'Bàn họp 10 chỗ cho người điều hành và nhân viên.', '#887cba'],
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
const point = (x, y, z = 0) => [450 + 1.14 * (x - y), 78 + .52 * (x + y) - z];
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
block(byId('floor'), -15, -15, 362, 349, -16, -3, ['#1a384e','#0a1c2c','#102c40'], {stroke:'#4a788c'});
const controls = [];
const zonePositions = [[0,0],[111,0],[228,0],[0,111],[111,111],[222,111],[0,222],[111,222],[222,222]];
const position = index => zonePositions[index];
const floor = byId('floor');
for (const offset of [101, 212]) {
  face(floor, [[offset,-5],[offset+3,-5],[offset+3,322],[offset,322]], '#5b9db361');
  face(floor, [[-5,offset],[327,offset],[327,offset+3],[-5,offset+3]], '#5b9db361');
}
for (const [x,y] of [[-5,40],[47,-7],[126,330],[3,321],[335,194],[337,295]]) {
  const plants = byId('plants');
  const plant = svg('g',{class:'planter'},plants);
  block(plant,x-7,y-7,14,14,0,12,['#547167','#324c49','#283d3c']);
  const [cx,cy] = point(x,y,14);
  svg('path',{d:`M${cx} ${cy} v-23`,stroke:'#52a980','stroke-width':2},plant);
  for (const [dx,dy,angle,color] of [[-6,-10,-45,'#36a878'],[6,-13,43,'#65dc94'],[-5,-20,-38,'#4fcb87'],[3,-25,22,'#97eaa3']]) {
    const lx = cx+dx, ly = cy+dy;
    svg('ellipse',{cx:lx,cy:ly,rx:4,ry:8,fill:color,transform:`rotate(${angle} ${lx} ${ly})`},plant);
  }
}
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
let serverRepo = null;
let screenTask = null;
let screenLive = false;
let selected = -1;
let running = false;
let submitting = false;

rooms.forEach(([name, description, color], i) => {
  const [x, y] = position(i);
  const director = i === 0;
  const meeting = i === 2;
  const zoneClass = director ? 'director-zone' : meeting ? 'meeting-zone' : 'staff-zone';
  const group = svg('g', { class:'room ' + zoneClass, role:'button', tabindex:0, 'aria-label':name }, byId('rooms'));
  const width = meeting ? 105 : 95;
  face(group, [[x,y],[x+width,y],[x+width,y+95],[x,y+95]], color + '48', {class:'tile'});
  const interior = svg('g', {class:'interior'}, group);
  if (meeting) {
    const glass = {class:'meeting-glass'};
    face(interior, [[x,y],[x+105,y],[x+105,y,25],[x,y,25]], '#67c9df32', glass);
    face(interior, [[x+105,y],[x+105,y+76],[x+105,y+76,25],[x+105,y,25]], '#67c9df26', glass);
    block(interior,x+22,y+30,63,32,0,13,['#9bb7c6','#557284','#3c586d']);
    const seats = [[8,41],[91,41],...[24,41,58,75].flatMap(seat => [[seat,15],[seat,68]])];
    for (const [sx,sy] of seats) {
      block(interior,x+sx,y+sy,9,9,0,6,['#6c7baf','#3d5278','#2a3c62'],{class:'meeting-chair'});
      block(interior,x+sx,y+sy+(sy < 30 ? 0 : 7),9,2,6,12,['#96a6cb','#566b98','#3c527c']);
    }
  } else if (director) {
    block(interior,x+10,y+9,65,33,0,15,['#f0cea0','#87634c','#694836']);
    block(interior,x+21,y+15,42,3,15,27,['#88dce9','#143a53','#67bdcf']);
    block(interior,x+46,y+52,22,19,0,9,['#a97645','#694836','#493727']);
  } else {
    block(interior,x+12,y+16,64,27,0,13,['#abc8d7','#567485','#405c71']);
    for (const offset of [20,46]) {
      block(interior,x+offset,y+19,19,3,13,29,['#6ba8bc','#163d54','#66d6e8']);
    }
    block(interior,x+51,y+53,17,14,0,6,['#466a88','#36536a','#233e52']);
  }
  const robot = svg('g', {class:'robot'}, group);
  const [cx,cy] = point(x+(meeting ? 60 : 59),y+(meeting ? 50 : 58),15);
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
  const fit = angle % 180 === 0 ? 1 : 0.54;
  const scale = zoom / 100 * fit;
  const direction = mirrored ? -1 : 1;
  byId('camera').setAttribute('transform', `translate(${450 + panX} ${225 + panY}) rotate(${angle}) scale(${scale * direction} ${scale}) translate(-450 -225)`);
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

const screenModes = {
  planning: { title:'Đang lên phương án', lines:['• Đọc yêu cầu', '• Xác định phần cần thay đổi'] },
  implementation: { title:'Đang lập trình', lines:['01  // mở phần cần chỉnh', '02  function updateFeature() {', '03    // mô phỏng thao tác chỉnh sửa', '04  }'] },
  verification: { title:'Đang kiểm thử', lines:['▶  Chuẩn bị kiểm tra', '…  Đối chiếu hành vi và kết quả'] },
};
function paintWorkScreen(task, live = false) {
  const project = live ? task.project : serverRunning ? serverRepo : null;
  const active = live || serverRunning;
  byId('project-led').textContent = project ?? (live ? task.title : 'ĐANG CHỜ DỰ ÁN');
  byId('project-led-caption').textContent = live && !project ? 'TÁC VỤ ĐANG CHẠY' : 'DỰ ÁN ĐANG CHẠY';
  byId('project-led').setAttribute('data-active', active);
  const mode = live ? screenModes[task.phase] : null;
  const outcome = {completed:'Hoàn tất', failed:'Gặp lỗi', running:'Chưa có cập nhật mới'};
  byId('work-screen').setAttribute('data-mode', live ? task.phase : 'idle');
  byId('screen-heading').textContent = mode?.title ?? (task ? outcome[task.status] : 'Đang chờ tín hiệu Work');
  byId('screen-note').textContent = mode
    ? task.agent + ' · ' + phaseLabels[task.phase] + ' · Minh họa theo giai đoạn thật'
    : task ? task.agent + ' · ' + phaseLabels[task.phase] : 'Chế độ hiển thị sẽ đổi theo giai đoạn của tác vụ.';
  byId('screen-lines').replaceChildren(...(mode?.lines ?? []).map(text => {
    const row = document.createElement('li');
    row.textContent = text;
    return row;
  }));
}

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
    serverRepo = runs.find(run => run.status === 'running')?.repo ?? null;
    serverRunning = Boolean(serverRepo);
    paintWorkScreen(screenTask, screenLive);
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
    const recent = tasks.find(task => task.status === 'running' && now - Date.parse(task.updated) < 10 * 60_000);
    screenTask = recent ?? tasks[0];
    screenLive = Boolean(recent);
    paintWorkScreen(screenTask, screenLive);
    byId('work-status').textContent = tasks.length ? 'Cập nhật từ các phiên Work đã kết nối.' : 'Chưa có tác vụ Work được kết nối.';
    paintRooms();
  } catch {
    if (request !== workRequest) return;
    activeWork.clear();
    workByZone = new Map();
    byId('live-flows').replaceChildren();
    screenTask = null;
    screenLive = false;
    paintWorkScreen();
    byId('work-status').textContent = 'Tạm mất kết nối. Lịch sử bên dưới có thể đã cũ.';
    paintRooms();
  }
}
refreshWork();
setInterval(() => { if (!document.hidden) refreshWork(); }, 3500);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshWork(); });
