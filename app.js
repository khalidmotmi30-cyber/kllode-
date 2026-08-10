const STORAGE_KEY = 'operations-dashboard-units-v1';
const CODE_HISTORY_KEY = 'operations-dashboard-code-history-v1';
const LAST_CODE_REFRESH_KEY = 'operations-dashboard-last-code-refresh-v1';
const CODE_REFRESH_MS = 30 * 60 * 1000;
const REFRESHABLE_UNITS = new Set(['سين','سين 1','باء','باء 1','جيم 1','جيم 2']);
const REFRESHABLE_CODE_COUNTS = {'سين 1':5,'سين':4,'باء 1':4,'باء':4,'جيم 1':3,'جيم 2':3};
const FIXED_REPORT_ORDER = ['قيادة','إشراف عام','مشرف ميداني','العمليات','نائب العمليات','سين 1','سين','باء 1','باء','جيم 1','جيم 2','دعم','الميناء','وحدات البحث والإنقاذ','تسجيل خروج'];
let units = loadUnits();
const $ = (id) => document.getElementById(id);

function normalizeUnit(u){
  let codes = Array.isArray(u.codes) ? u.codes.slice() : String(u.code || '').split(' / ').filter(Boolean);
  if (!codes.length) codes = [''];
  const required = REFRESHABLE_CODE_COUNTS[u.name];
  if (required) while (codes.length < required) codes.push('');
  return {...u, codes, code: codes.join(' / ')};
}
function loadUnits(){
  try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(Array.isArray(saved)) return saved.map(normalizeUnit); } catch(e){}
  return structuredClone(window.DEFAULT_UNITS).map(normalizeUnit);
}
function saveUnits(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(units)); }
function loadCodeHistory(){ try { const saved=JSON.parse(localStorage.getItem(CODE_HISTORY_KEY)); if(saved&&typeof saved==='object') return saved; } catch(e){} return {}; }
function saveCodeHistory(h){localStorage.setItem(CODE_HISTORY_KEY,JSON.stringify(h));}
function now(){const d=new Date();return {date:d.toISOString().slice(0,10),time:d.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'}),day:['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][d.getDay()]};}
function setNow(){const n=now();$('reportDate').value=n.date;$('reportTime').value=n.time;$('reportDay').value=n.day;updatePreview();}
function addCode(index){units[index].codes.push('');syncUnitCode(index);saveUnits();renderUnits();const inputs=document.querySelectorAll(`[data-code-index="${index}"]`);inputs[inputs.length-1]?.focus();}
function removeCode(index,codeIndex){const required=REFRESHABLE_CODE_COUNTS[units[index].name];if(required&&units[index].codes.length<=required)return;if(units[index].codes.length<=1)return;units[index].codes.splice(codeIndex,1);syncUnitCode(index);saveUnits();renderUnits();}
function syncUnitCode(index){units[index].code=units[index].codes.join(' / ');}
function renderUnits(){
  const html=[];
  units.forEach((raw,i)=>{
    const u=normalizeUnit(raw); units[i]=u;
    html.push(`<div class="unit-row"><div class="unit-name-wrap"><span class="unit-name">${escapeHtml(u.name)}</span></div><div class="codes-stack">${u.codes.map((code,j)=>`<div class="code-line"><input class="unit-code-input" data-code-index="${i}" data-code-item="${j}" value="${escapeAttr(code)}" placeholder="E-000" aria-label="كود ${escapeAttr(u.name)} ${j+1}" />${u.codes.length>1 && !(REFRESHABLE_CODE_COUNTS[u.name] && u.codes.length<=REFRESHABLE_CODE_COUNTS[u.name])?`<button class="remove-code" data-remove-code="${i}" data-remove-item="${j}" title="حذف الكود">×</button>`:''}</div>`).join('')}</div><div class="unit-add-row"><button class="add-inline" data-add-code="${i}" title="إضافة كود">＋ إضافة كود</button></div></div>`);
  });
  $('unitList').innerHTML=html.join('');
  document.querySelectorAll('[data-code-index]').forEach(input=>input.addEventListener('input',e=>{const i=+e.target.dataset.codeIndex,j=+e.target.dataset.codeItem;units[i].codes[j]=e.target.value.trim();syncUnitCode(i);handleLogoutCodeChange(i);saveUnits();updatePreview();}));
  document.querySelectorAll('[data-add-code]').forEach(b=>b.addEventListener('click',()=>addCode(+b.dataset.addCode)));
  document.querySelectorAll('[data-remove-code]').forEach(b=>b.addEventListener('click',()=>removeCode(+b.dataset.removeCode,+b.dataset.removeItem)));
  renderAdmin();updatePreview();
}
function handleLogoutCodeChange(index){
  const unit=units[index];
  if(unit.name!=='تسجيل خروج') return;
  const logoutCodes=new Set(unit.codes.map(c=>c.trim()).filter(Boolean));
  if(!logoutCodes.size) return;
  units.forEach((u,i)=>{
    if(i===index) return;
    if(!Array.isArray(u.codes)) return;
    u.codes=u.codes.map(c=>logoutCodes.has(c.trim())?'':c);
    syncUnitCode(i);
  });
}
function renderAdmin(){
  $('adminList').innerHTML=units.map((u,i)=>`<div class="admin-row"><span>${i+1}</span><input data-index="${i}" data-field="name" value="${escapeAttr(u.name)}" /><input data-index="${i}" data-field="code" value="${escapeAttr(u.code||'')}" placeholder="E-000 / E-000" /><button data-delete="${i}">حذف</button></div>`).join('');
  document.querySelectorAll('#adminList input').forEach(el=>el.addEventListener('input',e=>{const i=+e.target.dataset.index,f=e.target.dataset.field;if(f==='code'){units[i].codes=e.target.value.split('/').map(s=>s.trim()).filter(Boolean);if(!units[i].codes.length)units[i].codes=[''];units[i]=normalizeUnit(units[i]);}units[i][f]=e.target.value;syncUnitCode(i);handleLogoutCodeChange(i);saveUnits();renderUnits();}));
  document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{units.splice(+b.dataset.delete,1);saveUnits();renderUnits();}));
}
function codeNumber(){return `E-${String(Math.floor(Math.random()*999)+1).padStart(3,'0')}`;}
function nextUniqueCode(used,history){for(let t=0;t<3000;t++){const c=codeNumber();if(!used.has(c)&&!history.includes(c))return c;}return codeNumber();}
function refreshCodes(showToast=true){
  const history=loadCodeHistory(),used=new Set();
  units.forEach((raw,i)=>{units[i]=normalizeUnit(raw);units[i].codes.forEach(c=>{if(c)used.add(c);});});
  units.forEach((u,index)=>{
    if(!REFRESHABLE_UNITS.has(u.name)) return;
    const required=REFRESHABLE_CODE_COUNTS[u.name]||u.codes.length;
    while(u.codes.length<required) u.codes.push('');
    const key=u.name||'وحدة',previous=Array.isArray(history[key])?history[key]:[];
    // الأكواد ذات البدايات غير E مثل P / R / H / G تبقى كما وضعها المستخدم ولا تُحذف عند التحديث.
    u.codes=u.codes.map(code=>{
      const value=String(code||'').trim();
      if(value && !/^E-\d{3}$/i.test(value)) return value;
      return nextUniqueCode(used,previous);
    });
    u.codes.forEach(c=>used.add(c));
    syncUnitCode(index);
    history[key]=[...previous,...u.codes.filter(c=>/^E-\d{3}$/i.test(c))].slice(-120);
  });
  saveCodeHistory(history);saveUnits();localStorage.setItem(LAST_CODE_REFRESH_KEY,String(Date.now()));renderUnits();updateRefreshStatus();if(showToast)toast('تم تحديث أكواد E فقط، وحفظ أكواد P و R و H و G بدون حذف أو تكرار');
}
function updateRefreshStatus(){const el=$('codeRefreshStatus');if(!el)return;const last=+(localStorage.getItem(LAST_CODE_REFRESH_KEY)||0);if(!last){el.textContent='التحديث التلقائي كل 30 دقيقة';return;}const r=Math.max(0,CODE_REFRESH_MS-(Date.now()-last));if(!r){el.textContent='جاري تحديث الأكواد...';return;}el.textContent=`التحديث القادم بعد ${Math.floor(r/60000)}:${String(Math.floor(r%60000/1000)).padStart(2,'0')}`;}
function checkAutoCodeRefresh(){const last=+(localStorage.getItem(LAST_CODE_REFRESH_KEY)||0);if(last&&Date.now()-last>=CODE_REFRESH_MS)refreshCodes(true);updateRefreshStatus();}
function formatReportSection(unit){
  const codes=(Array.isArray(unit.codes)?unit.codes:[]).map(c=>String(c).trim()).filter(Boolean);
  if(!codes.length) return `${unit.name}: —`;
  return `${unit.name}:\n${codes.join('\n')}`;
}
function updatePreview(){
  const no=$('reportNo').value||'—',day=$('reportDay').value||'—',date=$('reportDate').value||'—',time=$('reportTime').value||'—';
  const byName=new Map(units.map(u=>[u.name,u]));
  const ordered=FIXED_REPORT_ORDER.map(name=>byName.get(name)).filter(Boolean);
  const sections=ordered.map(formatReportSection);
  $('reportPreview').textContent=`تم تحديث تقرير عمليات ( ساندي و بوليتو ) رقم ( ${no} ) في تمام الساعه ( ${time} ) في يوم ( ${day} ) التاريخ ${date}\n\n`+sections.join('\n\n');
}
function escapeHtml(s){return String(s??'').replace(/[&<>"\\]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\\':'&#92;'}[c]||c));}
function escapeAttr(s){return escapeHtml(s).replace(/'/g,'&#39;');}
['reportNo','reportDay','reportDate','reportTime'].forEach(id=>$(id).addEventListener('input',updatePreview));
$('refreshTime').addEventListener('click',setNow);$('refreshCodes').addEventListener('click',()=>refreshCodes(true));
$('copyReport').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('reportPreview').textContent);toast('تم نسخ التقرير بنجاح');}catch(e){toast('تعذر النسخ تلقائياً');}});
$('addUnit').addEventListener('click',()=>{units.push({name:'وحدة جديدة',code:'',codes:['']});saveUnits();renderUnits();});
$('resetUnits').addEventListener('click',()=>{if(confirm('إعادة الوحدات الافتراضية؟')){units=structuredClone(window.DEFAULT_UNITS).map(normalizeUnit);saveUnits();renderUnits();}});
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(btn.dataset.view==='report'?'reportView':'unitsView').classList.add('active');$('pageTitle').textContent=btn.dataset.view==='report'?'التقرير الرئيسي':'إدارة الوحدات';}));
function toast(text){const t=$('toast');t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}
setNow();renderUnits();updateRefreshStatus();setInterval(checkAutoCodeRefresh,1000);
