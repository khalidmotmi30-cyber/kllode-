const STORAGE_KEY = 'operations-dashboard-units-v1';
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
