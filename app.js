const STORAGE_KEY = 'operations-dashboard-units-v1';
const CODE_HISTORY_KEY = 'operations-dashboard-code-history-v1';
const LAST_CODE_REFRESH_KEY = 'operations-dashboard-last-code-refresh-v1';
const CODE_REFRESH_MS = 30 * 60 * 1000;
let units = loadUnits();

const $ = (id) => document.getElementById(id);

function loadUnits(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(Array.isArray(saved)) return saved;
  } catch(e){}
  return structuredClone(window.DEFAULT_UNITS);
}

function saveUnits(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
}

function loadCodeHistory(){
  try {
    const saved = JSON.parse(localStorage.getItem(CODE_HISTORY_KEY));
    if(saved && typeof saved === 'object') return saved;
  } catch(e){}
  return {};
}

function saveCodeHistory(history){
  localStorage.setItem(CODE_HISTORY_KEY, JSON.stringify(history));
}

function now(){
  const d = new Date();
  const date = d.toISOString().slice(0,10);
  const time = d.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'});
  const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  return {date,time,day:days[d.getDay()]};
}

function setNow(){
  const n=now();
  $('reportDate').value=n.date;
  $('reportTime').value=n.time;
  $('reportDay').value=n.day;
  updatePreview();
}

function renderUnits(){
  $('unitList').innerHTML = units.map((u,i) => `
    <div class="unit-row">
      <span class="unit-name">${escapeHtml(u.name)}</span>
      <input class="unit-code-input" data-code-index="${i}" value="${escapeAttr(u.code || '')}" placeholder="E-000" aria-label="كود ${escapeAttr(u.name)}" />
    </div>
  `).join('');

  document.querySelectorAll('[data-code-index]').forEach(input => {
    input.addEventListener('input', e => {
      const i = Number(e.target.dataset.codeIndex);
      units[i].code = e.target.value.trim();
      saveUnits();
      updatePreview();
    });
  });

  renderAdmin();
  updatePreview();
}

function renderAdmin(){
  $('adminList').innerHTML = units.map((u,i)=>`
    <div class="admin-row">
      <span>${i+1}</span>
      <input data-index="${i}" data-field="name" value="${escapeAttr(u.name)}" />
      <input data-index="${i}" data-field="code" value="${escapeAttr(u.code || '')}" placeholder="E-000" />
      <button data-delete="${i}">حذف</button>
    </div>
  `).join('');

  document.querySelectorAll('#adminList input').forEach(el=>el.addEventListener('input',e=>{
    const i=Number(e.target.dataset.index);
    units[i][e.target.dataset.field]=e.target.value;
    saveUnits();
    if(e.target.dataset.field === 'name') renderUnits();
    else updatePreview();
  }));

  document.querySelectorAll('[data-delete]').forEach(el=>el.addEventListener('click',()=>{
    units.splice(Number(el.dataset.delete),1);
    saveUnits();
    renderUnits();
  }));
}

function codeNumber(){
  return `E-${String(Math.floor(Math.random()*999)+1).padStart(3,'0')}`;
}

function nextUniqueCode(used, history){
  for(let tries=0; tries<3000; tries++){
    const code = codeNumber();
    if(!used.has(code) && !history.includes(code)) return code;
  }
  for(let n=1;n<=999;n++){
    const code=`E-${String(n).padStart(3,'0')}`;
    if(!used.has(code) && !history.includes(code)) return code;
  }
  return codeNumber();
}

function refreshCodes(showToast=true){
  const history = loadCodeHistory();
  const used = new Set();

  units.forEach(u=>{
    const key = u.name || 'وحدة';
    const oldCodes = String(u.code || '').split('/').map(x=>x.trim()).filter(Boolean);
    const previous = Array.isArray(history[key]) ? history[key] : [];
    const count = key.includes('وحدات البحث والإنقاذ') ? 2 : 1;
    const newCodes = [];

    for(let i=0;i<count;i++){
      const code = nextUniqueCode(used, previous);
      used.add(code);
      newCodes.push(code);
    }

    u.code = newCodes.join(' / ');
    history[key] = [...previous, ...newCodes].slice(-120);
  });

  saveCodeHistory(history);
  saveUnits();
  localStorage.setItem(LAST_CODE_REFRESH_KEY, String(Date.now()));
  renderUnits();
  updateRefreshStatus();
  if(showToast) toast('تم تحديث الأكواد — لن يتكرر الكود السابق لنفس الوحدة');
}

function updateRefreshStatus(){
  const el = $('codeRefreshStatus');
  if(!el) return;
  const last = Number(localStorage.getItem(LAST_CODE_REFRESH_KEY) || 0);
  if(!last){
    el.textContent = 'التحديث التلقائي كل 30 دقيقة';
    return;
  }
  const remaining = Math.max(0, CODE_REFRESH_MS - (Date.now() - last));
  if(remaining === 0){
    el.textContent = 'جاري تحديث الأكواد...';
    return;
  }
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  el.textContent = `التحديث القادم بعد ${minutes}:${String(seconds).padStart(2,'0')}`;
}

function checkAutoCodeRefresh(){
  const last = Number(localStorage.getItem(LAST_CODE_REFRESH_KEY) || 0);
  if(last && Date.now() - last >= CODE_REFRESH_MS){
    refreshCodes(true);
  }
  updateRefreshStatus();
}

function updatePreview(){
  const no=$('reportNo').value || '—';
  const day=$('reportDay').value || '—';
  const date=$('reportDate').value || '—';
  const time=$('reportTime').value || '—';
  const lines = units.map(u => `: ${u.name} ${u.code || '—'}`).join('\n');
  $('reportPreview').textContent = `تم تحديث تقرير عمليات ( ساندي و بوليتو ) رقم ( ${no} ) في تمام الساعه ( ${time} ) في يوم ( ${day} ) التاريخ ${date}\n\n${lines}`;
}

function escapeHtml(s){
  return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&#92;','"':'&quot;'}[c]));
}
function escapeAttr(s){return escapeHtml(s).replace(/'/g,'&#39;');}

['reportNo','reportDay','reportDate','reportTime'].forEach(id=>$(id).addEventListener('input',updatePreview));
$('refreshTime').addEventListener('click',setNow);
$('refreshCodes').addEventListener('click',()=>refreshCodes(true));
$('copyReport').addEventListener('click',async()=>{
  try{
    await navigator.clipboard.writeText($('reportPreview').textContent);
    toast('تم نسخ التقرير بنجاح');
  }catch(e){
    toast('تعذر النسخ تلقائياً، انسخ النص من المعاينة');
  }
});

$('addUnit').addEventListener('click',()=>{
  units.push({name:'وحدة جديدة',code:''});
  saveUnits();
  renderUnits();
});

$('resetUnits').addEventListener('click',()=>{
  if(confirm('إعادة جميع الوحدات الافتراضية؟')){
    units=structuredClone(window.DEFAULT_UNITS);
    saveUnits();
    renderUnits();
  }
});

document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  $(btn.dataset.view==='report'?'reportView':'unitsView').classList.add('active');
  $('pageTitle').textContent=btn.dataset.view==='report'?'التقرير الرئيسي':'إدارة الوحدات';
}));

function toast(text){
  const t=$('toast');
  t.textContent=text;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

setNow();
renderUnits();
updateRefreshStatus();
setInterval(checkAutoCodeRefresh, 1000);
