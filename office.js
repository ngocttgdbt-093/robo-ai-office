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
const label = (parent, text, [x,y]) => { svg('text', { x, y, 'text-anchor': 'middle' }, parent).textContent = text; };
block(byId('floor'), -15, -15, 349, 349, -16, -3, ['#1a384e','#0a1c2c','#102c40'], {stroke:'#4a788c'});
const controls = [];
let selected = -1;
let running = false;
let submitting = false;

rooms.forEach(([name, description, color], i) => {
  const x = (i % 3) * 111;
  const y = Math.floor(i / 3) * 111;
  const group = svg('g', { class:'room', role:'button', tabindex:0, 'aria-label':name }, byId('rooms'));
  block(group, x, y, 95, 95, -8, 0, [color + '80','#21475e','#17364d'], {class:'tile'});
  const interior = svg('g', {class:'interior'}, group);
  const glass = {stroke:color,'stroke-width':1.2,'fill-opacity':.45};
  face(interior, [[x,y,0],[x+95,y,0],[x+95,y,44],[x,y,44]], color, glass);
  face(interior, [[x,y,0],[x,y+95,0],[x,y+95,44],[x,y,44]], color, glass);
  block(interior,x+17,y+16,54,28,0,15,['#c5e4ec','#688da0','#4b6d84']);
  block(interior,x+29,y+20,29,4,15,35,['#638da4','#123447','#7be8ff']);
  const [cx,cy] = point(x+59,y+58,15);
  svg('ellipse',{cx,cy:cy+14,rx:15,ry:5,fill:'#0a2336'},interior);
  svg('rect',{x:cx-10,y:cy-5,width:20,height:18,rx:7,fill:'url(#silver)'},interior);
  svg('rect',{x:cx-15,y:cy-22,width:30,height:20,rx:8,fill:'url(#silver)',stroke:'#bcecff'},interior);
  svg('rect',{x:cx-10,y:cy-17,width:20,height:9,rx:4,fill:'#123044'},interior);
  for (const offset of [-4,4]) svg('circle',{cx:cx+offset,cy:cy-12,r:1.8,fill:'#78efff'},interior);
  const [lx,ly] = point(x+82,y+67,1);
  svg('circle',{cx:lx,cy:ly,r:4,class:'light',fill:'#a4b7c1'},group);
  label(group,name,point(x+70,y+83,-2));
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = name;
  button.onclick = group.onclick = () => selectRoom(i);
  group.onkeydown = event => {
    if (['Enter',' '].includes(event.key)) { event.preventDefault(); selectRoom(i); }
  };
  byId('nav').append(button);
  controls.push({ group, button, description });
});

function paintRooms() {
  controls.forEach(({group,button}, i) => {
    const active = i === 3 && running;
    group.classList.toggle('is-selected', i === selected);
    group.classList.toggle('is-open', i === selected || active);
    group.classList.toggle('is-running', active);
    for (const element of [group, button]) element.setAttribute('aria-pressed', i === selected);
  });
}
function selectRoom(i) {
  selected = i;
  paintRooms();
  byId('room-title').textContent = rooms[i]?.[0] ?? 'Toàn cảnh văn phòng';
  byId('room-description').textContent = controls[i]?.description ?? 'Chọn một phòng để mở không gian và xem chức năng.';
}
byId('overview').onclick = () => selectRoom(-1);
selectRoom(-1);

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
    running = submitting || runs.some(run => run.status === 'running');
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
    byId('runtime-status').textContent = running ? 'Agent Công nghệ đang chạy' : 'Đã kết nối · Sẵn sàng nhận việc';
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
  byId('runtime-status').textContent = 'Agent Công nghệ đang chạy';
  paintRooms();
  let failure;
  try {
    const run = await api('runs', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repo:byId('repo').value})});
    failure = run.error;
  } catch (error) { failure = error.message; }
  submitting = running = false;
  paintRooms();
  await history();
  if (failure) byId('runtime-status').textContent = failure;
};
byId('refresh').onclick = projects;
byId('refresh-runs').onclick = history;
setInterval(() => { if (running && !submitting && !document.hidden) history(); }, 3500);
history();
projects();
