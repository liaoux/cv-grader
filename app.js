// ── Constants ─────────────────────────────────────────────
const LS_GRADES = 'pg_grades_v4';
const LS_GROUPS = 'pg_groups_v4';

const PROJECT_MAX = {
  '1': 16, 'document scanner': 16,
  '2': 16, 'instagram': 16, 'filter': 16,
  '3': 18, 'barcode': 18, 'qr': 18,
  '4': 18, 'panorama': 18,
  '5': 20, 'license': 20, 'deblur': 20,
};

function projectMax(proj) {
  if (!proj) return 20;
  const p = proj.toLowerCase();
  for (const [k, v] of Object.entries(PROJECT_MAX)) {
    if (p.includes(k)) return v;
  }
  const m = p.match(/\d+/);
  if (m && PROJECT_MAX[m[0]]) return PROJECT_MAX[m[0]];
  return 20;
}

// ── State ─────────────────────────────────────────────────
let groups  = [];
let grades  = {};   // grades[gKey][studentName] = { score, card, comment }
let curLab  = '';
let curNick = '';
let step    = 1;

// ── Boot ──────────────────────────────────────────────────
(function boot() {
  try {
    const sg = localStorage.getItem(LS_GROUPS);
    const sv = localStorage.getItem(LS_GRADES);
    if (sg && sv) {
      groups = JSON.parse(sg);
      grades = JSON.parse(sv);
      document.getElementById('restore-banner').style.display = 'flex';
      goStep(2);
      return;
    }
  } catch (e) { console.warn('restore failed', e); }
})();

// ── File upload ───────────────────────────────────────────
document.getElementById('fin').addEventListener('change', function (e) {
  const f = e.target.files[0];
  if (!f) return;
  document.getElementById('fname').textContent = f.name;
  const r = new FileReader();
  r.onload = ev => {
    const wb = XLSX.read(ev.target.result, { type: 'binary' });
    parseGroups(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
  };
  r.readAsBinaryString(f);
});

// ── Parsing ───────────────────────────────────────────────
function ts(v) { return String(v == null ? '' : v).trim(); }

function colVal(row, ...names) {
  for (const k of Object.keys(row)) {
    const kl = k.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const n of names) {
      if (kl === n || kl.includes(n)) return ts(row[k]);
    }
  }
  return '';
}

function parseGroups(data) {
  const map = {};
  data.forEach(row => {
    const nick = colVal(row, 'nickname');
    const lab  = colVal(row, 'lab group');
    const proj = colVal(row, 'project');
    const key  = lab + '||' + (nick || proj || ts(row['ID']));
    if (!map[key]) map[key] = { key, nickname: nick, labGroup: lab, project: proj, students: [] };
    for (let n = 1; n <= 4; n++) {
      let nm = '', id = '';
      for (const k of Object.keys(row)) {
        const kl = k.toLowerCase().trim();
        if (kl === `student ${n} name`) nm = ts(row[k]);
        if (kl === `student ${n} id`)   id = ts(row[k]);
      }
      if (nm) map[key].students.push({ name: nm, id });
    }
  });
  groups = Object.values(map).map(g => {
    const seen = new Set();
    g.students = g.students.filter(s => {
      if (seen.has(s.name)) return false;
      seen.add(s.name); return true;
    });
    return g;
  }).filter(g => g.students.length > 0);
  persist();
  goStep(2);
}

// ── Persistence ───────────────────────────────────────────
function persist() {
  try {
    localStorage.setItem(LS_GROUPS, JSON.stringify(groups));
    localStorage.setItem(LS_GRADES, JSON.stringify(grades));
  } catch(e) { showBadge('⚠ could not save', false); }
}

function clearSaved() {
  if (!confirm('Clear all saved grades? This cannot be undone.')) return;
  [LS_GRADES, LS_GROUPS].forEach(k => localStorage.removeItem(k));
  groups = []; grades = {}; curLab = ''; curNick = ''; step = 1;
  document.getElementById('restore-banner').style.display = 'none';
  goStep(1);
}

// ── Navigation ────────────────────────────────────────────
function tryGoStep(n) {
  if (n === 1)                             goStep(1);
  else if (n === 2 && groups.length > 0)  goStep(2);
  else if (n === 3 && curLab)             goStep(3);
  else if (n === 4 && curLab && curNick)  goStep(4);
}

function goStep(n) {
  step = n;
  [1,2,3,4].forEach(i =>
    document.getElementById('sec'+i).style.display = i===n ? 'block' : 'none');
  updateBC();
  if (n===2) renderLabs();
  if (n===3) renderNicks();
  if (n===4) renderGrading();
}

function updateBC() {
  const ok = [true, groups.length>0, groups.length>0&&!!curLab, groups.length>0&&!!curLab&&!!curNick];
  [1,2,3,4].forEach(i => {
    const el = document.getElementById('bc'+i);
    el.className = 'bc-btn'+(i===step?' current':ok[i-1]?' reachable':'');
  });
}

// ── Step 2: Lab groups ────────────────────────────────────
function renderLabs() {
  const labs = [...new Set(groups.map(g=>g.labGroup).filter(Boolean))].sort();
  document.getElementById('lab-btns').innerHTML = labs.map(l => {
    const done = groups.filter(g=>g.labGroup===l).every(g=>isGraded(g));
    const cls  = 'pill'+(done?' done':'')+(l===curLab?' active':'');
    return `<button class="${cls}" onclick="selectLab('${ej(l)}')">${l}${done?' ✓':''}</button>`;
  }).join('');
  updateOverall();
}

function selectLab(lab) { curLab = lab; curNick = ''; goStep(3); }

function updateOverall() {
  const tot  = groups.length;
  const done = groups.filter(g=>isGraded(g)).length;
  const pct  = tot ? Math.round(done/tot*100) : 0;
  document.getElementById('overall-lbl').textContent = done+' / '+tot+' groups graded';
  document.getElementById('overall-bar').style.width = pct+'%';
}

// ── Step 3: Project groups ────────────────────────────────
function renderNicks() {
  document.getElementById('lab-info').innerHTML = 'Lab group: <strong>'+curLab+'</strong>';
  const labGs = groups.filter(g=>g.labGroup===curLab);
  document.getElementById('nick-btns').innerHTML = labGs.map(g => {
    const done = isGraded(g);
    const lbl  = g.nickname || g.key;
    const pmx  = projectMax(g.project);
    const cls  = 'pill'+(done?' done':'')+(lbl===curNick?' active':'');
    return `<button class="${cls}" onclick="selectNick('${ej(lbl)}')">${lbl}`+
           (g.project ? ` <span class="proj-tag">${g.project}</span>` : '')+
           `<span class="max-tag">/${pmx}</span>${done?' ✓':''}</button>`;
  }).join('');
  const done = labGs.filter(g=>isGraded(g)).length;
  const pct  = labGs.length ? Math.round(done/labGs.length*100) : 0;
  document.getElementById('lab-prog-lbl').textContent = done+' / '+labGs.length+' groups graded in '+curLab;
  document.getElementById('lab-prog-bar').style.width = pct+'%';
}

function selectNick(nick) { curNick = nick; goStep(4); }

function isGraded(g) {
  return g.students.length > 0 && g.students.every(s => {
    const v = grades[g.key]?.[s.name]?.score;
    return v !== undefined && v !== '';
  });
}

// ── Step 4: Grading ───────────────────────────────────────
function renderGrading() {
  const g = groups.find(x => x.labGroup===curLab && (x.nickname||x.key)===curNick);
  if (!g) { goStep(3); return; }

  const pmx = projectMax(g.project);

  document.getElementById('grp-info').innerHTML =
    'Lab: <strong>'+curLab+'</strong> &nbsp;·&nbsp; Group: <strong>'+(g.nickname||g.key)+'</strong>'+
    (g.project ? ' &nbsp;·&nbsp; <span class="proj-tag-inline">'+g.project+'</span>' : '')+
    ' &nbsp;·&nbsp; '+g.students.length+' student'+(g.students.length!==1?'s':'')+
    ' &nbsp;·&nbsp; <span class="max-badge">max '+pmx+'/20</span>';

  document.getElementById('students-list').innerHTML = g.students.map(st => {
    const entry   = grades[g.key]?.[st.name] || {};
    const card    = entry.card    ?? '';
    const score   = entry.score   ?? '';
    const comment = entry.comment ?? '';
    const pct     = score !== '' && pmx ? Math.round(score / pmx * 100) : null;
    const dispCls = pct === null ? '' : pct >= 80 ? 'disp-good' : pct >= 50 ? 'disp-mid' : 'disp-low';

    return `
    <div class="s-card">
      <div class="s-header">
        <div class="avatar">${inits(st.name)}</div>
        <div style="flex:1;min-width:0">
          <div class="s-name">${st.name}</div>
          <div class="s-id">${st.id || 'no ID'}</div>
        </div>
        <div class="card-picker">
          <span class="card-pick-lbl">Card drawn:</span>
          <button class="card-pick${card==='code'?' card-pick-active card-pick-code':''}"
            onclick="setCard('${ej(g.key)}','${ej(st.name)}','code')">💻 Code</button>
          <button class="card-pick${card==='concept'?' card-pick-active card-pick-concept':''}"
            onclick="setCard('${ej(g.key)}','${ej(st.name)}','concept')">💡 Concept</button>
          <button class="card-pick${card===''?' card-pick-active card-pick-none':''}"
            onclick="setCard('${ej(g.key)}','${ej(st.name)}','')" title="Clear">—</button>
        </div>
      </div>

      <div class="score-row">
        <span class="score-lbl">Mark</span>
        <input
          type="number" min="0" max="${pmx}" step="0.5"
          class="score-input"
          placeholder="—"
          value="${score}"
          oninput="setScore('${ej(g.key)}','${ej(st.name)}',this.value,${pmx})">
        <span class="score-max">/ ${pmx}</span>
        <span class="score-pct ${dispCls}" id="disp-${tid(g.key,st.name)}">${pct !== null ? pct+'%' : ''}</span>
      </div>

      <div class="comment-row">
        <label class="comment-lbl">Comment <span style="color:#ccc;font-weight:400">(optional)</span></label>
        <textarea rows="2" placeholder="Notes for this student..."
          oninput="setComment('${ej(g.key)}','${ej(st.name)}',this.value)">${comment}</textarea>
      </div>
    </div>`;
  }).join('');

  updateGradeProg(g);
}

// ── Setters ───────────────────────────────────────────────
function ensure(gk, sn) {
  if (!grades[gk])     grades[gk]     = {};
  if (!grades[gk][sn]) grades[gk][sn] = {};
}

function setScore(gk, sn, val, max) {
  ensure(gk, sn);
  const parsed = parseFloat(val);
  grades[gk][sn].score = isNaN(parsed) ? '' : Math.min(Math.max(parsed, 0), max);
  // update pct display
  const el  = document.getElementById('disp-'+tid(gk, sn));
  const pmx = max;
  if (el) {
    const s = grades[gk][sn].score;
    if (s === '') { el.textContent = ''; el.className = 'score-pct'; }
    else {
      const pct = Math.round(s / pmx * 100);
      el.textContent = pct + '%';
      el.className = 'score-pct ' + (pct>=80?'disp-good':pct>=50?'disp-mid':'disp-low');
    }
  }
  persist();
  showBadge('✓ saved', true);
  const g = groups.find(x=>x.key===gk);
  if (g) { updateGradeProg(g); renderNicks(); renderLabs(); }
}

function setComment(gk, sn, val) {
  ensure(gk, sn);
  grades[gk][sn].comment = val;
  persist();
}

function setCard(gk, sn, val) {
  ensure(gk, sn);
  grades[gk][sn].card = val;
  persist();
  showBadge('✓ saved', true);
  renderGrading();
}

function updateGradeProg(g) {
  const done = g.students.filter(s => {
    const v = grades[g.key]?.[s.name]?.score;
    return v !== undefined && v !== '';
  }).length;
  const el = document.getElementById('grade-prog-lbl');
  if (el) el.textContent = done + ' / ' + g.students.length + ' students graded';
}

function showBadge(msg, ok) {
  const b = document.getElementById('saved-badge');
  b.textContent = msg;
  b.className   = 'saved-badge show ' + (ok ? 'ok' : 'err');
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.remove('show'), 2200);
}

// ── Export ────────────────────────────────────────────────
function exportXLSX() {
  const hdr = ['Student name','Student ID','Lab Group','Group Nickname','Project','Card drawn','Mark','Max mark','Comment'];
  const rows = [hdr];
  groups.forEach(g => {
    const pmx = projectMax(g.project);
    g.students.forEach(st => {
      const e = grades[g.key]?.[st.name] || {};
      rows.push([
        st.name, st.id, g.labGroup, g.nickname, g.project,
        e.card  || '',
        e.score !== undefined && e.score !== '' ? +e.score : '',
        pmx,
        e.comment || ''
      ]);
    });
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:24},{wch:12},{wch:12},{wch:20},{wch:26},{wch:10},{wch:8},{wch:10},{wch:36}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Grades');
  XLSX.writeFile(wb, 'presentation_grades.xlsx');
}

// ── Helpers ───────────────────────────────────────────────
function ej(v)    { return String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function ea(v)    { return String(v).replace(/"/g,'&quot;'); }
function tid(g,s) { return (g+s).replace(/[^a-zA-Z0-9]/g,'_').slice(0,60); }
function inits(n) { return n.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase(); }