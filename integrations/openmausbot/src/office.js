export const officeHtml = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ROBO AI OFFICE · Trạng thái GitHub</title>
<style>
:root{font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#eaf1fa;background:#071522}
*{box-sizing:border-box}body{margin:0;padding:clamp(16px,3vw,45px);max-width:1100px;margin-inline:auto}
h1{margin:0 0 8px;font-size:clamp(24px,4vw,36px)}p{color:#a9bed2;line-height:1.5}header{border-bottom:1px solid #25445b;padding-bottom:24px;margin-bottom:24px}
small{color:#b6c6d8}.board{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px}
article{background:#10283c;border:1px solid #2c475c;padding:18px;border-radius:14px;min-width:0}
strong{display:block;font-size:17px;margin:8px 0;overflow-wrap:anywhere}a{color:#73d6ff}.tag{display:inline-block;border-radius:99px;padding:4px 10px;background:#304459;font-size:12px}
.running{background:#194f7a}.completed{background:#19563f}.failed{background:#782c39}
.awaiting_approval{background:#695026}.queued{background:#504a75}
.meta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:12px 0}
.notice{padding:14px;border:1px solid #4e6576;border-radius:10px;background:#102538;margin:15px 0}
button{padding:9px 15px;border-radius:8px;border:1px solid #426583;background:#1b405d;color:white;cursor:pointer}
</style></head><body>
<header><small>ROBO AI OFFICE / BẢNG TRẠNG THÁI THỬ NGHIỆM</small>
<h1>Giám sát công việc GitHub</h1>
<p>Thông tin chạy GitHub Actions công khai từ repository robo-ai-office. Đây chưa phải trạng thái Agent OpenMausBot và chưa phải văn phòng 3D.</p></header>
<div class="meta"><button id="reload">Tải lại</button><small id="updated">Đang đọc dữ liệu…</small></div>
<div class="notice" id="message">Đang kết nối nguồn GitHub Actions…</div>
<main class="board" id="board" aria-live="polite"></main>
<script>
const board=document.getElementById('board'), message=document.getElementById('message'), updated=document.getElementById('updated');
const labels={idle:'Chờ lệnh',queued:'Trong hàng đợi',running:'Đang chạy',awaiting_approval:'Chờ duyệt',failed:'Thất bại',completed:'Hoàn thành',unknown:'Chưa rõ'};
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node}
async function load(){
try{
 const response=await fetch('/api/github-status',{cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status);
 const data=await response.json();board.replaceChildren();
 updated.textContent='Nguồn: '+data.source+' · Cập nhật: '+(data.observedAt||'chưa có');
 message.textContent=!data.stale?'Dữ liệu GitHub Actions đã đọc được. Không đồng nghĩa Agent đang chạy.':'Nguồn GitHub chưa xác minh được, dữ liệu có thể cũ hoặc thiếu.';
 for(const run of data.workflowRuns){
   const card=el('article'),badge=el('span',(run.status==='completed'?(run.conclusion||'Hoàn thành'):run.status),'tag '+(run.status==='completed'?(run.conclusion||'completed'):run.status));
   card.append(badge,el('strong',run.name),el('small','Nguồn: GitHub Actions'),el('p','Cập nhật: '+(run.updatedAt||'không rõ')));
   if(run.url){const link=el('a','Mở lần chạy trên GitHub');link.href=run.url;link.target='_blank';link.rel='noopener noreferrer';card.append(link)}
   board.append(card);
 }
 for(const pr of data.pullRequests){const card=el('article');card.append(el('span',pr.draft?'PR chờ hoàn thiện':'Pull Request','tag'),el('strong','#'+pr.number+' '+pr.title));const link=el('a','Xem Pull Request');link.href=pr.url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);board.append(card)}
 if(!data.workflowRuns.length&&!data.pullRequests.length)board.append(el('p','Chưa có sự kiện công khai từ GitHub.'));
}catch{message.textContent='Không thể lấy dữ liệu GitHub. Trạng thái không xác định.';board.replaceChildren();updated.textContent='Chưa xác minh'}
}
document.getElementById('reload').addEventListener('click',load);load();setInterval(load,60000);
</script></body></html>`;
