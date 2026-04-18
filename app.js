// ── Constants ─────────────────────────────────────────────
const LS_GRADES = 'pg_grades_v2';
const LS_GROUPS = 'pg_groups_v2';
const LS_CRIT   = 'pg_criteria_v2';

// ── State ─────────────────────────────────────────────────
let groups   = [];
let grades   = {};
let curLab   = '';
let curNick  = '';
let step     = 1;
let criteria = [
  { label: 'Presentation clarity',    max: 20 },
  { label: 'Technical understanding', max: 20 },
  { label: 'Contribution to project', max: 20 },
  { label: 'Answering questions',     max: 20 }
];

// ── Boot: restore from localStorage ──────────────────────
(function boot() {
  try {
    const sg = localStorage.getItem(LS_GROUPS);
    const sc = localStorage.getItem(LS_CRIT);
    const sv = localStorage.getItem(LS_GRADES);
    if (sg && sv) {
      groups   = JSON.parse(sg);
      grades   = JSON.parse(sv);
      if (sc) criteria = JSON.parse(sc);
      renderCrit();
      document.getElementById('restore-banner').style.display = 'flex';
      goStep(2);
      return;
    }
  } catch (e) {
    console.warn('restore failed', e);
  }
  renderCrit();
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

// ── Parsing helpers ───────────────────────────────────────
function ts(v) {
  return String(v == null ? '' : v).trim();
}

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
      seen.add(s.name);
      return true;
    });
    return g;
  }).filter(g => g.students.length > 0);

  persist();
  goStep(2);
}

// ── Criteria ──────────────────────────────────────────────
function renderCrit() {
  document.getElementById('crit-list').innerHTML = criteria.map((c, i) => `
    <div class="crit-row">
      <input type="text" value="${ea(c.label)}" oninput="criteria[${i}].label=this.value">
      <span style="font-size:13px;color:#ccc">/</span>
      <input type="number" value="${c.max}" min="1" max="100" oninput="criteria[${i}].max=+this.value" style="width:58px;text-align:center">
      <button class="danger" onclick="rmCrit(${i})">remove</button>
    </div>`).join('');
}

function addCrit() {
  criteria.push({ label: 'New criterion', max: 20 });
  renderCrit();
}

function rmCrit(i) {
  criteria.splice(i, 1);
  renderCrit();
}

// ── Persistence ───────────────────────────────────────────
function persist() {
  try {
    localStorage.setItem(LS_GROUPS, JSON.stringify(groups));
    localStorage.setItem(LS_GRADES, JSON.stringify(grades));
    localStorage.setItem(LS_CRIT,   JSON.stringify(criteria));
  } catch (e) {
    showBadge('⚠ could not save', false);
  }
}

function clearSaved() {
  if (!confirm('Clear all saved grades? This cannot be undone.')) return;
  localStorage.removeItem(LS_GROUPS);
  localStorage.removeItem(LS_GRADES);
  localStorage.removeItem(LS_CRIT);
  groups = []; grades = {}; curLab = ''; curNick = ''; step = 1;
  document.getElementById('restore-banner').style.display = 'none';
  goStep(1);
}

// ── Navigation ────────────────────────────────────────────
function tryGoStep(n) {
  if (n === 1)                              goStep(1);
  else if (n === 2 && groups.length > 0)   goStep(2);
  else if (n === 3 && curLab)              goStep(3);
  else if (n === 4 && curLab && curNick)   goStep(4);
}

function goStep(n) {
  step = n;
  [1, 2, 3, 4].forEach(i => {
    document.getElementById('sec' + i).style.display = i === n ? 'block' : 'none';
  });
  updateBC();
  if (n === 2) renderLabs();
  if (n === 3) renderNicks();
  if (n === 4) renderGrading();
}

function updateBC() {
  const reachable = [
    true,
    groups.length > 0,
    groups.length > 0 && !!curLab,
    groups.length > 0 && !!curLab && !!curNick
  ];
  [1, 2, 3, 4].forEach(i => {
    const el = document.getElementById('bc' + i);
    el.className = 'bc-btn' +
      (i === step ? ' current' : reachable[i - 1] ? ' reachable' : '');
  });
}

// ── Step 2: Lab groups ────────────────────────────────────
function renderLabs() {
  const labs = [...new Set(groups.map(g => g.labGroup).filter(Boolean))].sort();
  document.getElementById('lab-btns').innerHTML = labs.map(l => {
    const done = groups.filter(g => g.labGroup === l).every(g => isGraded(g));
    const cls  = 'pill' + (done ? ' done' : '') + (l === curLab ? ' active' : '');
    return `<button class="${cls}" onclick="selectLab('${ej(l)}')">${l}${done ? ' ✓' : ''}</button>`;
  }).join('');
  updateOverall();
}

function selectLab(lab) {
  curLab  = lab;
  curNick = '';
  goStep(3);
}

function updateOverall() {
  const tot  = groups.length;
  const done = groups.filter(g => isGraded(g)).length;
  const pct  = tot ? Math.round(done / tot * 100) : 0;
  document.getElementById('overall-lbl').textContent = done + ' / ' + tot + ' groups graded';
  document.getElementById('overall-bar').style.width = pct + '%';
}

// ── Step 3: Nicknames ─────────────────────────────────────
function renderNicks() {
  document.getElementById('lab-info').innerHTML = 'Lab group: <strong>' + curLab + '</strong>';
  const labGs = groups.filter(g => g.labGroup === curLab);
  document.getElementById('nick-btns').innerHTML = labGs.map(g => {
    const done = isGraded(g);
    const lbl  = g.nickname || g.key;
    const cls  = 'pill' + (done ? ' done' : '') + (lbl === curNick ? ' active' : '');
    return `<button class="${cls}" onclick="selectNick('${ej(lbl)}')">${lbl}${done ? ' ✓' : ''}</button>`;
  }).join('');
  const done = labGs.filter(g => isGraded(g)).length;
  const pct  = labGs.length ? Math.round(done / labGs.length * 100) : 0;
  document.getElementById('lab-prog-lbl').textContent = done + ' / ' + labGs.length + ' groups graded in ' + curLab;
  document.getElementById('lab-prog-bar').style.width = pct + '%';
}

function selectNick(nick) {
  curNick = nick;
  goStep(4);
}

function isGraded(g) {
  return g.students.length > 0 && g.students.every(s =>
    criteria.every(c => {
      const v = grades[g.key]?.[s.name]?.[c.label];
      return v !== undefined && v !== '';
    })
  );
}

// ── Step 4: Grading ───────────────────────────────────────
function renderGrading() {
  const g = groups.find(x => x.labGroup === curLab && (x.nickname || x.key) === curNick);
  if (!g) { goStep(3); return; }

  document.getElementById('grp-info').innerHTML =
    'Lab: <strong>' + curLab + '</strong> &nbsp;·&nbsp; Group: <strong>' + (g.nickname || g.key) + '</strong>' +
    (g.project ? ' &nbsp;·&nbsp; ' + g.project : '') +
    ' &nbsp;·&nbsp; ' + g.students.length + ' student' + (g.students.length !== 1 ? 's' : '');

  document.getElementById('students-list').innerHTML = g.students.map(st => `
    <div class="s-card">
      <div class="s-header">
        <div class="avatar">${inits(st.name)}</div>
        <div>
          <div class="s-name">${st.name}</div>
          <div class="s-id">${st.id || 'no ID'}</div>
        </div>
        <span class="s-total" id="tot-${tid(g.key, st.name)}"></span>
      </div>
      <div class="grades-grid">
        ${criteria.map(c => `
          <div class="g-cell">
            <label>${c.label}</label>
            <div class="g-row">
              <input type="number" min="0" max="${c.max}" value="${getG(g.key, st.name, c.label)}"
                oninput="setG('${ej(g.key)}','${ej(st.name)}','${ej(c.label)}',+this.value,${c.max},'${tid(g.key, st.name)}')">
              <span class="g-max">/ ${c.max}</span>
            </div>
          </div>`).join('')}
      </div>
      <div>
        <label style="font-size:11px;color:#ccc;display:block;margin-bottom:3px">Comment (optional)</label>
        <textarea rows="2" placeholder="Notes..." oninput="setComment('${ej(g.key)}','${ej(st.name)}',this.value)">${grades[g.key]?.[st.name]?.['_comment'] || ''}</textarea>
      </div>
    </div>`).join('');

  g.students.forEach(st => updateTot(g.key, st.name));
  updateGradeProg(g);
}

function getG(gk, sn, cl) {
  return grades[gk]?.[sn]?.[cl] ?? '';
}

function setG(gk, sn, cl, val, max) {
  if (!grades[gk])     grades[gk]     = {};
  if (!grades[gk][sn]) grades[gk][sn] = {};
  grades[gk][sn][cl] = Math.min(Math.max(isNaN(val) ? 0 : val, 0), max);
  updateTot(gk, sn);
  persist();
  showBadge('✓ saved', true);
  const g = groups.find(x => x.key === gk);
  if (g) updateGradeProg(g);
}

function setComment(gk, sn, val) {
  if (!grades[gk])     grades[gk]     = {};
  if (!grades[gk][sn]) grades[gk][sn] = {};
  grades[gk][sn]['_comment'] = val;
  persist();
}

function updateTot(gk, sn) {
  const el = document.getElementById('tot-' + tid(gk, sn));
  if (!el) return;
  const d   = grades[gk]?.[sn] || {};
  const tot = criteria.reduce((s, c) => s + (+d[c.label] || 0), 0);
  const mx  = criteria.reduce((s, c) => s + c.max, 0);
  const pct = mx ? Math.round(tot / mx * 100) : 0;
  el.textContent = tot + ' / ' + mx + ' (' + pct + '%)';
  el.style.color = pct >= 80 ? '#2e7d32' : pct >= 50 ? '#e65100' : '#c62828';
}

function updateGradeProg(g) {
  const done = g.students.filter(s =>
    criteria.every(c => {
      const v = grades[g.key]?.[s.name]?.[c.label];
      return v !== undefined && v !== '';
    })
  ).length;
  const el = document.getElementById('grade-prog-lbl');
  if (el) el.textContent = done + ' / ' + g.students.length + ' students fully graded';
}

function showBadge(msg, ok) {
  const b = document.getElementById('saved-badge');
  b.textContent = msg;
  b.className   = 'saved-badge show ' + (ok ? 'ok' : 'err');
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.remove('show'), 2200);
}

// ── Export to Excel ───────────────────────────────────────
function exportXLSX() {
  const mx  = criteria.reduce((s, c) => s + c.max, 0);
  const hdr = [
    'Student name', 'Student ID', 'Lab Group', 'Group Nickname', 'Project',
    ...criteria.map(c => c.label + ' (/' + c.max + ')'),
    'Total (/' + mx + ')',
    'Comment'
  ];
  const rows = [hdr];
  groups.forEach(g => g.students.forEach(st => {
    const d      = grades[g.key]?.[st.name] || {};
    const scores = criteria.map(c => d[c.label] !== undefined ? +d[c.label] : '');
    const tot    = criteria.reduce((s, c) => s + (+d[c.label] || 0), 0);
    rows.push([st.name, st.id, g.labGroup, g.nickname, g.project, ...scores, tot, d['_comment'] || '']);
  }));
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 26 },
    ...criteria.map(() => ({ wch: 20 })),
    { wch: 12 }, { wch: 32 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Grades');
  XLSX.writeFile(wb, 'presentation_grades.xlsx');
}

// ── Helpers ───────────────────────────────────────────────
function ej(v)   { return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function ea(v)   { return String(v).replace(/"/g, '&quot;'); }
function tid(g, s) { return (g + s).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60); }
function inits(n)  { return n.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase(); }