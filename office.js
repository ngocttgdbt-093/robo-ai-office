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
const label = (parent, text, [x,y], className = '') => {
  const node = svg('text', { x, y, 'text-anchor': 'middle', class:className }, parent);
  node.textContent = text;
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
function drawHandoff(from, to, parent) {
  const [fx, fy] = position(from);
  const [tx, ty] = position(to);
  const dx = Math.sign(tx - fx), dy = Math.sign(ty - fy);
  const start = point(fx + 48 + 34 * dx, fy + 48 + 34 * dy, 3);
  const end = point(tx + 48 - 34 * dx, ty + 48 - 34 * dy, 3);
  const bend = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 - 11];
  const d = `M${start.join(' ')} Q${bend.join(' ')} ${end.join(' ')}`;
  const group = svg('g', { class:'flow work' }, parent);
  svg('path', {d, class:'route-line', 'marker-end':'url(#work-arrow)'}, group);
  svg('path', {d, class:'route-pulse'}, group);
}
const phaseZones = { planning: 1, implementation: 3, verification: 8 };
const phaseLabels = { planning: 'AI Manager', implementation: 'Công nghệ', verification: 'Kiểm soát' };
const activeWork = new Map();
let workByZone = new Map();
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
  for (const offset of [-15,15]) svg('circle',{cx:cx+offset,cy:cy-12,r:2.6,class:'map-ear'},robot);
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
  const workers = workByZone.get(selected) ?? [];
  byId('zone-work').textContent = workers.map(task =>
    task.agent + (task.skills.length ? ' · ' + task.skills.join(', ') : '')).join(' | ');
}
function selectRoom(i) {
  selected = i;
  paintRooms();
  byId('room-title').textContent = rooms[i]?.[0] ?? 'Toàn cảnh văn phòng';
  byId('room-description').textContent = controls[i]?.description ?? 'Chọn một khu để xem chức năng và trạng thái.';
}
byId('overview').onclick = () => selectRoom(-1);
selectRoom(-1);

let ciRun = null;
const ciActive = run => Boolean(run && ['in_progress','queued','requested','waiting','pending'].includes(run.status));
function ciLabel(run) {
  const state = {in_progress:'Đang chạy',queued:'Đang xếp hàng',requested:'Đã yêu cầu',waiting:'Đang chờ',pending:'Đang chờ',completed:'Đã kết thúc'};
  const outcome = {success:'Thành công',failure:'Thất bại',cancelled:'Đã hủy',timed_out:'Hết thời gian',skipped:'Đã bỏ qua',action_required:'Cần xử lý'};
  return outcome[run.conclusion] ?? state[run.status] ?? run.status;
}
const projectNames = { pti093db: '07-Dashboard số liệu GĐBT 093' };
function projectName(value) {
  if (!value) return 'CHƯA CÓ TÊN DỰ ÁN';
  const repo = value.toLowerCase().replace(/^ngocttgdbt-093\//, '');
  return Object.hasOwn(projectNames, repo) ? projectNames[repo] : value;
}
function fitLed() {
  const viewport = byId('project-led-viewport');
  const text = byId('project-led');
  const width = viewport.clientWidth;
  const length = text.scrollWidth;
  viewport.classList.toggle('is-overflowing', width > 0 && length > width);
  if (width > 0 && length > width) {
    viewport.style.setProperty('--led-start', width + 'px');
    viewport.style.setProperty('--led-time', Math.max(6, (width + length) / 34) + 's');
  }
}
if (typeof ResizeObserver === 'function') {
  const ledObserver = new ResizeObserver(fitLed);
  ledObserver.observe(byId('project-led-viewport'));
  ledObserver.observe(byId('project-led'));
}
const ocrProject = 'Dự án 03 — OCR giấy tờ TBTN/YCBT';
let trackedProject = null;
let ocrSignalUnavailable = false;
byId('track-ocr').onclick = () => {
  trackedProject = trackedProject ? null : ocrProject;
  byId('track-ocr').setAttribute('aria-pressed', Boolean(trackedProject));
  paintWorkScreen(screenTask, screenLive);
  paintWallFlow(wallTasks, Date.now(), wallConnected);
};

byId('wall-focus').onclick = () => {
  const wall = byId('wall-scene');
  const expanded = wall.getAttribute('data-expanded') !== 'true';
  wall.setAttribute('data-expanded', String(expanded));
  byId('wall-focus').setAttribute('aria-pressed', expanded);
  byId('wall-focus').textContent = expanded ? 'Về phối cảnh' : 'Phóng màn hình';
};

const screenModes = {
  planning: { title:'Đang lên phương án', lines:['Đã nhận tín hiệu phân tích'] },
  implementation: { title:'Đang thực hiện', lines:['Đã nhận tín hiệu thực hiện'] },
  verification: { title:'Đang kiểm thử', lines:['Đã nhận tín hiệu kiểm thử', 'Đang chờ bằng chứng kết quả'] },
};
function paintWorkScreen(task, live = false) {
  const ci = !task && !serverRunning && !trackedProject ? ciRun : null;
  const active = live || serverRunning;
  const project = active ? projectName(live ? task.project : serverRepo) : trackedProject ?? 'ĐANG CHỜ DỰ ÁN';
  const tracking = !active && trackedProject;
  if (byId('project-led').textContent !== project) byId('project-led').textContent = project;
  byId('project-led-caption').textContent = tracking
    ? ocrSignalUnavailable ? 'ĐANG XEM · MẤT KẾT NỐI' : 'ĐANG XEM · CHƯA CÓ TÍN HIỆU'
    : active ? 'DỰ ÁN ĐANG CHẠY' : 'VĂN PHÒNG ĐIỀU HÀNH';
  if (tracking) task = null;
  byId('project-led').setAttribute('data-active', active);
  const mode = live ? screenModes[task.phase] : null;
  const outcome = {completed:'Hoàn tất', failed:'Gặp lỗi', running:'Chưa có cập nhật mới'};
  byId('work-screen').setAttribute('data-mode', live ? task.phase : 'idle');
  byId('screen-task').textContent = ci?.name ?? task?.title ?? '';
  byId('screen-source').textContent = live ? 'TÍN HIỆU WORK' : serverRunning || ci ? 'GITHUB' : 'TỔNG QUAN';
  byId('screen-run-link').hidden = !ci;
  if (ci) byId('screen-run-link').setAttribute('href', ci.url);
  byId('work-screen').setAttribute('data-ci-result', ci?.conclusion ?? '');
  byId('screen-heading').textContent = ci ? ciLabel(ci) : serverRunning && !live ? 'Đang đọc commit GitHub' : mode?.title ?? (task ? outcome[task.status] : 'Đang chờ tín hiệu Work');
  byId('screen-note').textContent = ci ? (ci.source === 'render' ? 'GitHub Actions qua Render' : 'GitHub Actions trực tiếp') +
    (ci.updated ? ' · ' + new Date(ci.updated).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}) : '') : mode
    ? task.agent + ' · ' + phaseLabels[task.phase] + ' · Tín hiệu từ phiên thực thi'
    : task ? task.agent + ' · ' + phaseLabels[task.phase] : 'Chế độ hiển thị sẽ đổi theo giai đoạn của tác vụ.';
  byId('screen-lines').replaceChildren(...(mode?.lines ?? []).map(text => {
    const row = document.createElement('li');
    row.textContent = text;
    return row;
  }));
}

const wallTeams = {
  planning: { name:'Điều phối', activity:'Đang phân tích', point:[835,640] },
  implementation: { name:'Công nghệ', activity:'Đang thực hiện', point:[580,805] },
  verification: { name:'Kiểm soát', activity:'Đang kiểm thử', point:[1090,805] },
};
const wallFloorRoutes = {
  'planning:implementation': 'M835 640 C835 695 800 727 739 758 S647 801 580 805',
  'planning:verification': 'M835 640 C835 695 870 727 931 758 S1023 801 1090 805',
  'verification:planning': 'M1090 805 C1023 801 992 789 931 758 S835 695 835 640',
  'implementation:verification': 'M580 805 Q700 830 835 832 T1090 805',
};
function wallRoute(from, to, parent) {
  const key = from + ':' + to;
  const path = wallFloorRoutes[key];
  const [fx,fy] = wallTeams[from].point;
  const [tx,ty] = wallTeams[to].point;
  const d = path ?? `M${fx} ${fy} Q835 860 ${tx} ${ty}`;
  const group = svg('g', {}, parent);
  svg('path', {d, class:'wall-route-base', 'marker-end':'url(#wall-arrow)'}, group);
  svg('path', {d, class:'wall-route-pulse'}, group);
}
let wallTasks = [];
let wallConnected = false;
function paintWallFlow(tasks, now = Date.now(), connected = true) {
  wallTasks = tasks;
  wallConnected = connected;
  const active = tasks.filter(task => task.status === 'running' && now - Date.parse(task.updated) < 600000);
  const transfers = new Map();
  for (const task of active) {
    if (!wallTeams[task.previous] || !wallTeams[task.phase] || task.previous === task.phase) continue;
    if (now - Date.parse(task.phase_started ?? task.updated) >= 25000) continue;
    transfers.set(task.previous + ':' + task.phase, [task.previous, task.phase]);
  }
  const liveRoutes = byId('wall-live-routes');
  const ci = !active.length && !trackedProject && !serverRunning && ciActive(ciRun) ? ciRun : null;
  const ciRunning = ci?.status === 'in_progress';
  const signature = [...transfers.keys()].join('|') + (ci ? ':ci:' + ci.status : '');
  if (liveRoutes.flowSignature !== signature) {
    liveRoutes.flowSignature = signature;
    liveRoutes.replaceChildren();
    for (const [from,to] of transfers.values()) wallRoute(from,to,liveRoutes);
    if (ciRunning) wallRoute('verification','planning',liveRoutes);
  }
  for (const [phase, team] of Object.entries(wallTeams)) {
    const running = active.some(task => task.phase === phase) || (serverRunning && phase === 'implementation');
    const receiving = [...transfers.values()].some(([,to]) => to === phase);
    const sending = [...transfers.values()].some(([from]) => from === phase);
    const workMode = {planning:'planning', implementation:'code', verification:'test'}[phase];
    const ciMode = ci && phase === 'verification' ? ci.status === 'in_progress' ? 'ci' : ciActive(ci) ? 'waiting' : null : null;
    const stationMode = running ? workMode : ciMode ?? 'idle';
    const station = byId('wall-station-' + phase);
    station.setAttribute('data-activity', stationMode);
    station.setAttribute('data-working', running || (phase === 'verification' && ciRunning));
    byId('wall-monitor-' + phase).textContent = {
      planning:'ĐIỀU PHỐI',code:'CODE · MINH HỌA',test:'KIỂM THỬ',ci:'CI ĐANG CHẠY',waiting:'CI XẾP HÀNG',idle:'',
    }[stationMode];
    if (ci && (phase === 'verification' || phase === 'planning')) {
      byId('wall-team-' + phase).setAttribute('data-state', ciRunning ? 'active' : 'idle');
      byId('wall-' + phase).textContent = phase === 'verification' ? 'CI · ' + ciLabel(ci) : 'Nhận trạng thái CI';
      continue;
    }
    byId('wall-team-' + phase).setAttribute('data-state', receiving || running ? 'active' : sending ? 'sending' : 'idle');
    byId('wall-' + phase).textContent = receiving ? 'Nhận bàn giao · ' + team.activity
      : running ? team.activity : sending ? 'Vừa bàn giao' : 'Chờ tín hiệu';
  }
  const message = transfers.size ? [...transfers.values()].map(([from,to]) => wallTeams[from].name + ' → ' + wallTeams[to].name).join(' · ')
    : active.length ? 'Có bộ phận đang thực thi · Chưa có bàn giao mới'
    : serverRunning ? 'Công nghệ đang đọc commit GitHub'
    : ci ? 'GitHub Actions → Văn phòng · ' + ciLabel(ci)
    : connected ? 'Chưa có tác vụ Work đang chạy' : 'Mất kết nối hoặc đang chờ đọc tín hiệu Work';
  const status = byId('wall-flow-status');
  if (status.textContent !== message) status.textContent = message;
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
    paintWallFlow(wallTasks, Date.now(), wallConnected);
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

let workRequest = 0;
async function refreshWork() {
  const request = ++workRequest;
  try {
    const tasks = await api('work');
    if (request !== workRequest) return;
    const now = Date.now();
    paintWallFlow(tasks, now);
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
        if (Object.hasOwn(phaseZones, task.previous) && task.previous !== task.phase && now - Date.parse(task.phase_started ?? task.updated) < 25_000) drawHandoff(phaseZones[task.previous], phaseZones[task.phase], byId('live-flows'));
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
    const isLive = task => task.status === 'running' && now - Date.parse(task.updated) < 10 * 60_000;
    const ocrRunning = tasks.some(task => task.project === ocrProject && isLive(task));
    ocrSignalUnavailable = false;
    byId('ocr-signal').textContent = ocrRunning ? 'Đã nhận tín hiệu đang chạy từ Work.' : 'Chưa có tín hiệu đang chạy từ phiên Work của dự án.';
    const liveTasks = tasks.filter(isLive);
    const recent = liveTasks[0];
    const parallel = liveTasks.filter(task => task !== recent).slice(0,3);
    byId('screen-queue').replaceChildren(...(parallel.length ? parallel.map(task => task.project ? projectName(task.project) : task.title) : ['Chưa có tác vụ song song']).map(name => {
      const item = document.createElement('li');
      item.textContent = name;
      return item;
    }));
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
    ocrSignalUnavailable = true;
    paintWallFlow([], Date.now(), false);
    const offline = document.createElement('li');
    offline.textContent = 'Tạm mất kết nối';
    byId('screen-queue').replaceChildren(offline);
    byId('ocr-signal').textContent = 'Tạm thời không đọc được tín hiệu Work.';
    paintWorkScreen();
    byId('work-status').textContent = 'Tạm mất kết nối. Lịch sử bên dưới có thể đã cũ.';
    paintRooms();
  }
}
refreshWork();
setInterval(() => { if (!document.hidden) refreshWork(); }, 3500);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshWork(); });

async function refreshCi() {
  try {
    const {runs, source} = await api('ci');
    const latest = [...runs].sort((a,b) => Date.parse(b.updated) - Date.parse(a.updated));
    const current = latest.find(run => run.status === 'in_progress') ?? latest.find(ciActive) ?? latest[0];
    ciRun = current ? { ...current, source } : null;
    const display = byId('ci-status');
    display.textContent = source === 'render' ? 'GitHub Actions qua Render · ' : 'GitHub Actions trực tiếp · ';
    if (current) {
      const link = document.createElement('a');
      link.href = current.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = current.name;
      display.append(link, ' · ' + ciLabel(current));
    } else {
      display.append('Chưa có lượt chạy.');
    }
  } catch {
    ciRun = null;
    byId('ci-status').textContent = 'Tạm thời không đọc được GitHub Actions.';
  }
  paintWorkScreen(screenTask, screenLive);
  paintWallFlow(wallTasks, Date.now(), wallConnected);
}
refreshCi();
setInterval(() => { if (!document.hidden) refreshCi(); }, 60_000);
