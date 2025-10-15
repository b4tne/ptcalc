/* Fitness Scorer (Static CSV Version) — resilient matching + auto-calc */
const ageEl=document.getElementById('age');
const sexEl=document.getElementById('sex');
const puEl=document.getElementById('pushups');
const suEl=document.getElementById('situps');
const rtEl=document.getElementById('runtime');
const calcBtn=document.getElementById('calcBtn');
const saveBtn=document.getElementById('saveBtn');
const exportSavedBtn=document.getElementById('exportSavedBtn');
const clearSavedBtn=document.getElementById('clearSavedBtn');
const saveNameEl=document.getElementById('saveName');
const finalScoreEl=document.getElementById('finalScore');
const categoryEl=document.getElementById('category');
const pScoreEl=document.getElementById('pScore');
const sScoreEl=document.getElementById('sScore');
const rScoreEl=document.getElementById('rScore');
const savedListEl=document.getElementById('savedList');

function range(start,end,step=1){const out=[];for(let v=start;v<=end;v+=step)out.push(v);return out;}
function pad(n){return String(n).padStart(2,'0');}
function buildDropdowns(){
  for(const n of range(0,100)){let o1=document.createElement('option');o1.textContent=n;puEl.appendChild(o1);
    let o2=document.createElement('option');o2.textContent=n;suEl.appendChild(o2);}
  for(let t=8*60;t<=20*60;t+=5){const mm=Math.floor(t/60),ss=t%60;const opt=document.createElement('option');
    opt.textContent=`${pad(mm)}:${pad(ss)}`;opt.value=t;rtEl.appendChild(opt);}
  // default to 0s and ~13:00 for visibility
  puEl.value="0"; suEl.value="0"; rtEl.value=String(13*60);
}
buildDropdowns();

let RULES=[];
async function loadRules(){
  const res=await fetch('scores.csv');const txt=await res.text();RULES=parseCSV(txt);
}
function parseCSV(text){
  const lines=text.trim().split(/\r?\n/);
  const rows=[];
  // split accounting for quotes
  function split(line){
    const out=[];let cur='',q=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='\"'){q=!q;continue;}
      if(c===',' && !q){out.push(cur);cur='';} else {cur+=c;}
    }
    out.push(cur);return out;
  }
  for(let i=1;i<lines.length;i++){
    if(!lines[i].trim()) continue;
    const cols=split(lines[i]);
    if(cols.length<6)continue;
    const [AGE,GENDER,CAT,EVENT,RESULT,SCORE]=cols.map(s=>s.trim());
    const scoreNum=parseFloat(SCORE);
    const resNum=parseFloat(RESULT);
    rows.push({AGE,GENDER,CAT,EVENT,RESULT: isNaN(resNum)?RESULT:resNum,SCORE: isNaN(scoreNum)?0:scoreNum});
  }
  return rows;
}

/* ---------- Matching helpers ---------- */
function norm(str){return (str||'').toString().trim().toLowerCase().replace(/\s+/g,' ');}
function eventKind(ev){
  const e=norm(ev);
  if(/run/.test(e)) return 'run';
  if(/push/.test(e)) return 'push';
  if(/sit/.test(e) || /crunch/.test(e) || /ab/.test(e)) return 'sit';
  // fallback exact keys we use
  if(e==='run') return 'run';
  if(e.includes('push-up')||e.includes('pushups')) return 'push';
  if(e.includes('sit-up')||e.includes('situps')) return 'sit';
  return 'unknown';
}

// Parse an age band text into {min,max} (inclusive), where max can be Infinity
function parseAgeBand(txt){
  const s=norm(txt).replace(/\u2013|\u2014|–|—/g,'-'); // normalize dashes
  // <25, <=24, under 25
  if(/^<\s*\d+/.test(s) || /under\s+\d+/.test(s)){
    const k = parseInt((s.match(/\d+/)||['0'])[0],10);
    return {min: -Infinity, max: k-1};
  }
  if(/\d+\s*\+\s*$/.test(s) || /\d+\s*\+\s*years?/.test(s)){
    const k = parseInt((s.match(/\d+/)||['0'])[0],10);
    return {min: k, max: Infinity};
  }
  // 25-29, 25 – 29, 25 to 29
  const m = s.match(/(\d+)\s*[-to]+\s*(\d+)/);
  if(m){
    const a=parseInt(m[1],10), b=parseInt(m[2],10);
    return {min:a, max:b};
  }
  // fallback single number
  const n = s.match(/(\d+)/);
  if(n){
    const v=parseInt(n[1],10);
    return {min:v, max:v};
  }
  return null;
}
function sameBand(a,b){
  // consider bands "equal" if their numeric spans match
  if(!a||!b) return false;
  return a.min===b.min && a.max===b.max;
}

function filterRules(ageLabel, sexLabel, desiredEvent){
  const wantKind = eventKind(desiredEvent);
  const wantAge = parseAgeBand(ageLabel);
  const wantSex = norm(sexLabel);
  const candidates = RULES.filter(r => {
    const kind = eventKind(r.EVENT);
    if (kind !== wantKind) return false;
    // match sex loosely: male/female prefixes ok
    const rSex = norm(r.GENDER);
    if(!(rSex.startsWith('m') && wantSex.startsWith('m') || rSex.startsWith('f') && wantSex.startsWith('f'))) return false;
    // age band
    const rBand = parseAgeBand(r.AGE);
    return sameBand(rBand, wantAge);
  });
  // If nothing matched, log debug
  if(candidates.length===0){
    console.warn('No rule matches for:', {ageLabel, sexLabel, desiredEvent, wantKind, wantAge});
  }
  return candidates;
}

function lookupRepsScore(age,sex,event,reps){
  const rs=filterRules(age,sex,event).filter(r=>!isNaN(parseFloat(r.RESULT))).map(r=>({res:parseFloat(r.RESULT),score:r.SCORE})).sort((a,b)=>a.res-b.res);
  let best=0.0;for(const row of rs){if(reps>=row.res)best=row.score;else break;}return best;}
function lookupRunScore(age,sex,userSec){
  const rs=filterRules(age,sex,'Run').filter(r=>!isNaN(parseFloat(r.RESULT))).map(r=>({sec:parseFloat(r.RESULT),score:r.SCORE})).sort((a,b)=>a.sec-b.sec);
  let chosen=0.0;for(const row of rs){if(userSec<=row.sec){chosen=row.score;break;}chosen=row.score;}return chosen;}

/* ---------- Compute & UI ---------- */
function compute(){
  const age=ageEl.value,sex=sexEl.value,repsPU=parseInt(puEl.value||'0',10),repsSU=parseInt(suEl.value||'0',10),runSec=parseInt(rtEl.value||20*60,10);
  const p=lookupRepsScore(age,sex,'1 min Push-ups',repsPU);
  const s=lookupRepsScore(age,sex,'1 min Sit-ups',repsSU);
  const r=lookupRunScore(age,sex,runSec);
  const total=+(p+s+r).toFixed(1);
  pScoreEl.textContent=p.toFixed(1);sScoreEl.textContent=s.toFixed(1);rScoreEl.textContent=r.toFixed(1);finalScoreEl.textContent=total.toFixed(1);
  applyCategory(total);return{age,sex,repsPU,repsSU,runSec,p,s,r,total};
}
function applyCategory(total){
  categoryEl.classList.remove('green','yellow','red','gray');let label='—',klass='gray';
  if(total>=72.0){label='Fit to Fight';klass='green';}else if(total>=60.0){label='Health Maintenance';klass='yellow';}else{label='Health Concern';klass='red';}
  categoryEl.textContent=label;categoryEl.classList.add(klass);
}
function triggerCompute(){compute();}

['change','input'].forEach(evt=>{
  ageEl.addEventListener(evt,triggerCompute);
  sexEl.addEventListener(evt,triggerCompute);
  puEl.addEventListener(evt,triggerCompute);
  suEl.addEventListener(evt,triggerCompute);
  rtEl.addEventListener(evt,triggerCompute);
});
calcBtn.addEventListener('click',compute);

/* Saved table */
function loadSaved(){try{return JSON.parse(localStorage.getItem('fitness_saved')||'[]');}catch{return[];}}
function saveAll(items){localStorage.setItem('fitness_saved',JSON.stringify(items));}
function renderSaved(){
  const items=loadSaved();
  if(items.length===0){savedListEl.innerHTML='<div class="empty">No saved scores yet.</div>';return;}
  const rows=items.map(it=>{const date=new Date(it.ts).toLocaleString();
    const rt=`${Math.floor(it.runSec/60).toString().padStart(2,'0')}:${(it.runSec%60).toString().padStart(2,'0')}`;
    return `<tr><td>${it.name||'—'}</td><td>${date}</td><td>${it.sex}</td><td>${it.age}</td><td>${it.repsPU}</td><td>${it.repsSU}</td><td>${rt}</td><td>${it.p.toFixed(1)}</td><td>${it.s.toFixed(1)}</td><td>${it.r.toFixed(1)}</td><td><strong>${it.total.toFixed(1)}</strong></td></tr>`;
  }).join('');
  savedListEl.innerHTML=`<table><thead><tr><th>Name</th><th>Saved</th><th>Sex</th><th>Age</th><th>PU</th><th>SU</th><th>Run</th><th>PU pts</th><th>SU pts</th><th>Run pts</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}
renderSaved();
saveBtn.addEventListener('click',()=>{
  const name=saveNameEl.value.trim();const out=compute();const items=loadSaved();
  items.unshift({...out,name,ts:Date.now()});saveAll(items);renderSaved();
});
clearSavedBtn.addEventListener('click',()=>{if(confirm('Delete all saved scores?')){localStorage.removeItem('fitness_saved');renderSaved();}});
exportSavedBtn.addEventListener('click',()=>{
  const items=loadSaved();const header=['Name','Saved','Sex','Age','Pushups','Situps','Run','PushPts','SitPts','RunPts','Total'];
  const rows=[header.join(',')];for(const it of items){const date=new Date(it.ts).toISOString();
    const rt=`${Math.floor(it.runSec/60).toString().padStart(2,'0')}:${(it.runSec%60).toString().padStart(2,'0')}`;
    rows.push([it.name||'',date,it.sex,it.age,it.repsPU,it.repsSU,rt,it.p.toFixed(1),it.s.toFixed(1),it.r.toFixed(1),it.total.toFixed(1)].join(','));}
  const blob=new Blob([rows.join('\n')],{type:'text/csv'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='saved_scores.csv';a.click();URL.revokeObjectURL(url);
});

loadRules().then(()=>{ console.log('Built-in rules loaded'); compute(); });
