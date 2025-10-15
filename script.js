/* Fitness Scorer – CSV‑driven rules + one‑screen UI */
const ageEl = document.getElementById('age');
const sexEl = document.getElementById('sex');
const puEl = document.getElementById('pushups');
const suEl = document.getElementById('situps');
const rtEl = document.getElementById('runtime');
const calcBtn = document.getElementById('calcBtn');
const saveBtn = document.getElementById('saveBtn');
const csvInput = document.getElementById('csvInput');
const exportSavedBtn = document.getElementById('exportSavedBtn');
const clearSavedBtn = document.getElementById('clearSavedBtn');
const saveNameEl = document.getElementById('saveName');
const finalScoreEl = document.getElementById('finalScore');
const categoryEl = document.getElementById('category');
const pScoreEl = document.getElementById('pScore');
const sScoreEl = document.getElementById('sScore');
const rScoreEl = document.getElementById('rScore');
const savedListEl = document.getElementById('savedList');

/** Populate dropdown "wheels" */
function range(start, end, step=1) {
  const out = [];
  for (let v=start; v<=end; v+=step) out.push(v);
  return out;
}
function pad(n){return String(n).padStart(2, '0');}

function buildDropdowns(){
  // 0..100 reps
  for(const n of range(0,100)){
    const o1=document.createElement('option'); o1.textContent=n; puEl.appendChild(o1);
    const o2=document.createElement('option'); o2.textContent=n; suEl.appendChild(o2);
  }
  // Run times 8:00..20:00 in 5-sec steps
  for(let t=8*60;t<=20*60;t+=5){
    const mm=Math.floor(t/60), ss=t%60;
    const opt=document.createElement('option');
    opt.textContent = `${pad(mm)}:${pad(ss)}`;
    opt.value = t; // total seconds
    rtEl.appendChild(opt);
  }
}
buildDropdowns();

/** CSV rules: AGE,GENDER,CAT,EVENT,RESULT,SCORE
 * Push/Sit: use largest RESULT <= reps
 * Run times: RESULT is seconds; use smallest RESULT >= userSec (slower -> lower score)
 */
let RULES = []; // loaded from scores.csv by default
async function loadDefaultRules(){
  const res = await fetch('scores.csv');
  const txt = await res.text();
  RULES = parseCSV(txt);
}
function parseCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cols = splitCSVLine(lines[i]);
    if(cols.length < 6) continue;
    const [AGE,GENDER,CAT,EVENT,RESULT,SCORE] = cols.map(s=>s.trim());
    rows.push({AGE,GENDER,CAT,EVENT,RESULT,SCORE:parseFloat(SCORE)});
  }
  return rows;
}
// Split respecting commas and quotes
function splitCSVLine(line){
  const out=[]; let cur='', inQ=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='\"'){ inQ=!inQ; continue; }
    if(c===',' && !inQ){ out.push(cur); cur=''; } else { cur+=c; }
  }
  out.push(cur);
  return out;
}

function filterRules(age, sex, event){
  return RULES.filter(r => r.AGE===age && r.GENDER.toLowerCase()===sex.toLowerCase() && r.EVENT===event);
}

function lookupRepsScore(age, sex, event, reps){
  const rs = filterRules(age, sex, event)
    .filter(r => !isNaN(parseFloat(r.RESULT)))
    .map(r => ({res: parseFloat(r.RESULT), score: r.SCORE}))
    .sort((a,b)=>a.res-b.res);
  let best = 0.0;
  for(const row of rs){ if(reps >= row.res) best = row.score; else break; }
  return best;
}

function lookupRunScore(age, sex, userSec){
  const rs = filterRules(age, sex, 'Run')
    .filter(r => !isNaN(parseFloat(r.RESULT)))
    .map(r => ({sec: parseFloat(r.RESULT), score: r.SCORE}))
    .sort((a,b)=>a.sec-b.sec);
  // Choose the first row with RESULT >= userSec (i.e., slower time -> lower score)
  let chosen = 0.0;
  for(const row of rs){
    if(userSec <= row.sec){ chosen = row.score; break; }
    chosen = row.score; // fallback to last if faster than best row
  }
  return chosen;
}

function compute(){
  const age = ageEl.value;
  const sex = sexEl.value;
  const repsPU = parseInt(puEl.value||'0',10);
  const repsSU = parseInt(suEl.value||'0',10);
  const runSec = parseInt(rtEl.value|| (20*60),10);

  const p = lookupRepsScore(age, sex, '1 min Push-ups', repsPU);
  const s = lookupRepsScore(age, sex, '1 min Sit-ups', repsSU);
  const r = lookupRunScore(age, sex, runSec);

  const total = +(p + s + r).toFixed(1);

  pScoreEl.textContent = p.toFixed(1);
  sScoreEl.textContent = s.toFixed(1);
  rScoreEl.textContent = r.toFixed(1);
  finalScoreEl.textContent = total.toFixed(1);

  applyCategory(total);
  return {age, sex, repsPU, repsSU, runSec, p, s, r, total};
}

function applyCategory(total){
  categoryEl.classList.remove('green','yellow','red','gray');
  let label='—', klass='gray';
  if(total >= 72.0){ label='Fit to Fight'; klass='green'; }
  else if(total >= 60.0){ label='Health Maintenance'; klass='yellow'; }
  else { label='Health Concern'; klass='red'; }
  categoryEl.textContent = label;
  categoryEl.classList.add(klass);
}

calcBtn.addEventListener('click',compute);

/** CSV import for rules */
csvInput.addEventListener('change', async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const txt = await file.text();
  RULES = parseCSV(txt);
  alert('Scoring rules loaded from CSV.');
});

/** Saved scores (private/local) */
function loadSaved(){
  const raw = localStorage.getItem('fitness_saved') || '[]';
  try { return JSON.parse(raw); } catch { return []; }
}
function saveAll(items){
  localStorage.setItem('fitness_saved', JSON.stringify(items));
}
function renderSaved(){
  const items = loadSaved();
  if(items.length===0){ savedListEl.innerHTML = '<div class="empty">No saved scores yet.</div>'; return; }
  const rows = items.map(it=>{
    const date = new Date(it.ts).toLocaleString();
    const rt = `${Math.floor(it.runSec/60).toString().padStart(2,'0')}:${(it.runSec%60).toString().padStart(2,'0')}`;
    return `<tr>
      <td>${it.name||'—'}</td>
      <td>${date}</td>
      <td>${it.sex}</td>
      <td>${it.age}</td>
      <td>${it.repsPU}</td>
      <td>${it.repsSU}</td>
      <td>${rt}</td>
      <td>${it.p.toFixed(1)}</td>
      <td>${it.s.toFixed(1)}</td>
      <td>${it.r.toFixed(1)}</td>
      <td><strong>${it.total.toFixed(1)}</strong></td>
    </tr>`;
  }).join('');
  savedListEl.innerHTML = `<table>
    <thead><tr>
      <th>Name</th><th>Saved</th><th>Sex</th><th>Age</th>
      <th>PU</th><th>SU</th><th>Run</th>
      <th>PU pts</th><th>SU pts</th><th>Run pts</th><th>Total</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}
renderSaved();

saveBtn.addEventListener('click', ()=>{
  const name = saveNameEl.value.trim();
  const out = compute();
  const items = loadSaved();
  items.unshift({ name, ...out, ts: Date.now() });
  saveAll(items);
  renderSaved();
});

clearSavedBtn.addEventListener('click', ()=>{
  if(confirm('Delete all saved scores from this browser?')){
    localStorage.removeItem('fitness_saved');
    renderSaved();
  }
});

/** Export saved records as CSV */
exportSavedBtn.addEventListener('click', ()=>{
  const items = loadSaved();
  const header = ['Name','Saved','Sex','Age','Pushups','Situps','Run','PushPts','SitPts','RunPts','Total'];
  const rows = [header.join(',')];
  for(const it of items){
    const date = new Date(it.ts).toISOString();
    const rt = `${Math.floor(it.runSec/60).toString().padStart(2,'0')}:${(it.runSec%60).toString().padStart(2,'0')}`;
    rows.push([
      it.name||'',
      date,
      it.sex,
      it.age,
      it.repsPU,
      it.repsSU,
      rt,
      it.p.toFixed(1),
      it.s.toFixed(1),
      it.r.toFixed(1),
      it.total.toFixed(1),
    ].join(','));
  }
  const blob = new Blob([rows.join('\n')], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'saved_scores.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// Init
loadDefaultRules().then(()=>console.log('Default rules loaded'));
