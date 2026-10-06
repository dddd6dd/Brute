

// ---------- Progress: 내 기록만으로 PR·페이스·리미터·리프팅 추세 ----------
let PROGRESS_RANGE = '4w';
const MV_CATS = [
  ['체조', /muscle\s*-?\s*up|\bbmu\b|\brmu\b|hspu|handstand|rope\s*climb|toes?\s*to\s*bar|\bt2b\b|chest\s*to\s*bar|\bc2b\b|pull\s*-?\s*ups?\b|wall\s*walk|pistol|dip/i],
  ['바벨', /snatch|clean|jerk|squat|deadlift|\bohs\b|overhead|thruster|press|lunge/i],
  ['머신·유산소', /\brow\b|ski|bike|echo|assault|\brun\b|double\s*under|calorie/i],
  ['버피·박스', /burpee|box|wall\s*ball|jump/i]
];
function mvCat(n){ for(const [c, re] of MV_CATS) if(re.test(n)) return c; return '기타'; }
function spark(vals, w, hgt, invert){
  const v = vals.filter(x => x != null);
  if(v.length < 2) return '';
  const mn = Math.min(...v), mx = Math.max(...v), span = (mx - mn) || 1;
  const pts = vals.map((x, i) => x == null ? null : [Math.round(i / (vals.length - 1) * (w - 4) + 2), Math.round((invert ? (x - mn) / span : 1 - (x - mn) / span) * (hgt - 4) + 2)]).filter(Boolean);
  return '<svg width="' + w + '" height="' + hgt + '" viewBox="0 0 ' + w + ' ' + hgt + '" aria-hidden="true" style="display:block;"><polyline points="' + pts.map(p => p.join(',')).join(' ') + '" fill="none" stroke="var(--border-accent)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}
function bars(vals, higherBetter){
  const v = vals.filter(x => x != null);
  if(!v.length) return '';
  const mx = Math.max(...v), mn = Math.min(...v);
  return '<div style="display:flex; align-items:flex-end; gap:3px; height:28px;">' + vals.map(x => {
    if(x == null) return '<span style="width:8px; height:4px; border-radius:2px; background:var(--border);"></span>';
    const r = mx === mn ? 0.6 : (higherBetter ? (x - mn) / (mx - mn) : (x - mn) / (mx - mn));
    return '<span style="width:8px; height:' + Math.round(6 + r * 22) + 'px; border-radius:2px; background:var(--border-accent); opacity:' + (0.45 + r * 0.55).toFixed(2) + ';"></span>';
  }).join('') + '</div>';
}
function progCard(inner){ return '<div class="card" style="margin:0 0 12px;">' + inner + '</div>'; }
function progHead(eyebrow, title, sub){ return '<p class="eyebrow" style="margin:0 0 4px;">' + eyebrow + '</p><h3 style="font-size:17px; font-weight:500; margin:0 0 ' + (sub ? '4px' : '12px') + ';">' + title + '</h3>' + (sub ? '<p class="muted" style="font-size:13px; margin:0 0 12px;">' + sub + '</p>' : ''); }

async function renderProgress(){
  const el = document.getElementById('board-content');
  const name = localStorage.getItem('bruteLogName') || '';
  if(!name){ el.innerHTML = progCard('<p class="muted" style="margin:0;">기록 탭에서 Profile 이름을 먼저 정해주세요.</p>'); return; }
  el.innerHTML = '<p class="muted">불러오고 있어요...</p>';
  const { data: allRecs, error } = await sb.from('records').select('*').eq('name', name).order('date').order('id');
  if(error){ el.innerHTML = '<p class="status err">' + escapeHtml(error.message) + '</p>'; return; }
  if(!allRecs || !allRecs.length){
    const setting = await getProfileSetting(name);
    el.innerHTML = progCard('<p class="muted" style="margin:0;">' + (setting && setting.is_private ? '비공개 프로필이에요. 기록 탭에서 PIN을 넣으면 보여요.' : '아직 기록이 없어요.') + '</p>');
    return;
  }
  const dates = [...new Set(allRecs.map(r => r.date))];
  const { data: progs } = await sb.from('programs').select('date, items').in('date', dates);
  const progByDate = {};
  (progs || []).forEach(p => progByDate[p.date] = p.items || []);
  const unit = getPreferredUnit();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const since = PROGRESS_RANGE === '4w' ? iso(new Date(today.getTime() - 27 * 864e5)) : '0000';
  const recs = allRecs.filter(r => r.date >= since);
  const pd = r => parsePersonalDetail(r) || {};
  const isRound = r => / - \d+R$/.test(r.item_name);
  const baseOf = n => String(n).replace(/ - \d+R$/, '');
  const itemOf = (date, n) => (progByDate[date] || []).find(it => it.name === n);

  // ---- PR events (all time, so first-in-range can still be a PR) ----
  const best = {}, prEvents = [];
  allRecs.forEach(r=>{
    if(r.skipped || isRound(r) || / · Total$/.test(r.item_name) || / - /.test(r.item_name)) return;
    const d = pd(r);
    let key = null, val = null, label = '', show = '';
    if(r.type === 'weight'){ val = parseFloat(r.value); label = d.rm != null ? rmLabel(String(d.rm)) : ''; key = r.item_name + '|w' + label; show = fmtWeightRec(r, unit); }
    else if(r.type === 'distance'){ const m = String(r.value).match(/^([\d.]+)\s*(cm|m|ft)$/); if(m){ val = +m[1] * (m[2] === 'm' ? 100 : m[2] === 'ft' ? 30.48 : 1); key = r.item_name + '|d'; show = r.value; } }
    else if(r.type === 'calories' || (r.type === 'reps' && !d.igug)){ val = parseFloat(r.value); key = r.item_name + '|' + r.type; show = r.value; }
    if(key == null || isNaN(val)) return;
    const prev = best[key];
    if(prev && val > prev.val) prEvents.push({ date: r.date, item: r.item_name, label, show, prevShow: prev.show, prevDate: prev.date });
    if(!prev || val > prev.val) best[key] = { val, show, date: r.date };
  });

  // ---- week summary ----
  const dow = (today.getDay() + 6) % 7;
  const weekStart = iso(new Date(today.getTime() - dow * 864e5));
  const weekRecs = allRecs.filter(r => r.date >= weekStart);
  const weekDays = new Set(weekRecs.filter(r => !r.skipped).map(r => r.date)).size;
  const weekSkips = weekRecs.filter(r => r.skipped && !isRound(r)).length;
  const weekPRs = prEvents.filter(e => e.date >= weekStart);

  el.innerHTML = '';
  const top = document.createElement('div');
  top.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:8px; margin:0 0 12px;';
  top.innerHTML = '<span class="muted" style="font-size:13px;">' + escapeHtml(name) + '</span><div style="display:flex; gap:4px; padding:3px; border-radius:999px; background:var(--surface-2); border:0.5px solid var(--border);">'
    + ['4w', 'all'].map(k => '<button type="button" data-r="' + k + '" style="height:28px; font-size:13px; padding:0 12px; border-radius:999px; border:none; box-shadow:none; background:' + (PROGRESS_RANGE === k ? 'var(--surface-1)' : 'transparent') + '; font-weight:' + (PROGRESS_RANGE === k ? '600' : '400') + ';">' + (k === '4w' ? '최근 4주' : '전체') + '</button>').join('') + '</div>';
  top.querySelectorAll('button').forEach(b => b.onclick = ()=>{ PROGRESS_RANGE = b.dataset.r; renderProgress(); });
  el.appendChild(top);

  const sum = document.createElement('div');
  sum.className = 'card';
  sum.style.margin = '0 0 12px';
  sum.innerHTML = '<p class="eyebrow" style="margin:0 0 8px;">THIS WEEK</p>'
    + '<div style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px;">'
    + '<div><div style="font-size:22px; font-weight:600;">' + weekDays + '</div><div class="muted" style="font-size:13px;">운동한 날</div></div>'
    + '<button type="button" class="pr-btn" style="height:auto; padding:0; border:none; background:none; box-shadow:none; text-align:left;"><div style="font-size:22px; font-weight:600; color:' + (weekPRs.length ? 'var(--border-accent)' : 'inherit') + ';">' + weekPRs.length + '</div><div class="muted" style="font-size:13px;">PR 갱신' + (weekPRs.length ? ' ▾' : '') + '</div></button>'
    + '<div><div style="font-size:22px; font-weight:600;">' + weekSkips + '</div><div class="muted" style="font-size:13px;">생략</div></div>'
    + '</div><div class="pr-list" style="display:none;"></div>';
  const prList = sum.querySelector('.pr-list');
  prList.innerHTML = '<div style="margin-top:12px; border-top:0.5px solid var(--border); padding-top:8px;">' + weekPRs.map(e => '<div style="display:flex; justify-content:space-between; gap:8px; padding:6px 0; font-size:14px;"><span style="min-width:0;">' + escapeHtml(e.item) + (e.label ? ' <span class="muted">' + e.label + '</span>' : '') + '</span><span style="flex-shrink:0; text-align:right;"><strong style="font-weight:600;">' + escapeHtml(e.show) + '</strong> <span class="muted" style="font-size:12px;">이전 ' + escapeHtml(e.prevShow) + ' · ' + shortD(e.prevDate) + '</span></span></div>').join('') + '</div>';
  sum.querySelector('.pr-btn').onclick = ()=>{ if(weekPRs.length) slideToggle(prList); };
  el.appendChild(sum);

  // ---- pace sessions ----
  const sessions = [];
  const byDate = {};
  recs.forEach(r => (byDate[r.date] = byDate[r.date] || []).push(r));
  const roundNoOf = r => +r.item_name.match(/(\d+)R$/)[1];
  Object.entries(byDate).forEach(([date, list])=>{
    const prog = progByDate[date] || [];
    list.filter(r => !r.skipped && !isRound(r)).forEach(main=>{
      const md = pd(main);
      const it = itemOf(date, main.item_name);
      const rounds = list.filter(r => isRound(r) && baseOf(r.item_name) === main.item_name).sort((a, b) => roundNoOf(a) - roundNoOf(b));
      const head = it ? (splitPrescribedLines(it.prescribed).filter(Boolean)[0] || '').replace(/:$/, '') : '';
      if(rounds.length && main.type === 'for_time' && rounds.some(r => pd(r).clock != null)){
        const rest = it ? parseRestSec(it.prescribed) : 0;
        sessions.push({ date, kind: 'sets', unit: 'time', compare: rest > 0, group: wdOf(date) + ' · ' + (head || rounds.length + ' Sets'), name: main.item_name, vals: rounds.map(r => clockSec(r.value)), clocks: rounds.map(r => pd(r).clock), main, md, items: it ? [it] : [] });
      } else if(rounds.length && md.igug){
        sessions.push({ date, kind: 'igug', unit: 'reps', compare: true, group: wdOf(date) + ' · ' + (head || rounds.length + ' Sets') + ' · I GO U GO', name: main.item_name, vals: rounds.map(r => parseFloat(r.value)), stops: rounds.map(r => (pd(r).ig || {}).stop), main, md, items: it ? [it] : [] });
      } else if(main.type === 'calories' && Array.isArray(md.cals) && md.cals.length >= 2){
        const per = md.cals.map(row => { const a = Array.isArray(row) ? row : [row]; const n = a.filter(x => x != null); return n.length ? n.reduce((s, x) => s + x, 0) : null; });
        sessions.push({ date, kind: 'cal', unit: 'cal', compare: true, group: wdOf(date) + ' · ' + main.item_name, name: main.item_name, vals: per, machines: md.machines || [], cals: md.cals, main, md, items: it ? [it] : [] });
      } else if(/ · Total$/.test(main.item_name)){
        const items = prog.filter(x => normSec(x.section) === normSec(main.section) && x.type === 'for_time');
        const parts = items.map(x => list.find(r => r.item_name === x.name && normSec(r.section) === normSec(main.section))).filter(Boolean);
        if(parts.length) sessions.push({ date, kind: 'parts', unit: 'time', compare: false, group: wdOf(date) + ' · ' + main.item_name.replace(/ · Total$/, ''), name: main.item_name, vals: parts.map(r => r.skipped ? null : clockSec(r.value)), partRecs: parts, main, md, items });
      }
    });
    // 라운드별 개수 메트콘 (예: 금 AMRAP 세트별 칼로리) — 대표 기록 없이 라운드만 있음
    prog.filter(x => x.type === 'amrap_by_round' && /metcon/i.test(normSec(x.section))).forEach(x=>{
      const rounds = list.filter(r => isRound(r) && baseOf(r.item_name) === x.name && !r.skipped).sort((a, b) => roundNoOf(a) - roundNoOf(b));
      if(rounds.length < 2) return;
      sessions.push({ date, kind: 'cal', unit: 'reps', compare: true, group: wdOf(date) + ' · ' + x.name, name: x.name, vals: rounds.map(r => parseFloat(r.value)), main: { value: '' }, md: {}, items: [x] });
    });
  });

  const fmtV = (s, x) => x == null ? '-' : (s.unit === 'time' ? fmtClock(Math.round(x)) : (Math.round(x * 10) / 10) + (s.unit === 'cal' ? ' cal' : '개'));
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const median = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  const rateOf = s => {
    if(s.machines && s.machines.length > 1 && Array.isArray(s.cals)){
      const cols = s.machines.map((_, j) => s.cals.map(r => Array.isArray(r) ? r[j] : null));
      const means = cols.map(c => { const v = c.filter(x => x != null); return v.length ? mean(v) : null; });
      return s.cals.map((r, i) => { const v = cols.map((c, j) => (c[i] != null && means[j]) ? c[i] / means[j] : null).filter(x => x != null); return v.length ? mean(v) : null; });
    }
    return paceRates(s.vals, s.unit !== 'time');
  };
  const levelOf = s => {
    if(s.machines && s.machines.length > 1 && Array.isArray(s.cals)) return s.machines.map((_, j) => { const v = s.cals.slice(1).map(r => Array.isArray(r) ? r[j] : null).filter(x => x != null); return v.length ? mean(v) : null; });
    const r = paceRates(s.vals, s.unit !== 'time').slice(1).filter(x => x != null);
    return [r.length ? mean(r) : null];
  };
  const deltaOf = (a, refs) => { const d = a.map((x, i) => (x != null && refs[i]) ? x / refs[i] - 1 : null).filter(x => x != null); return d.length ? mean(d) : null; };
  const sameIg = (a, b) => (a.kind === 'igug') === (b.kind === 'igug');

  const paceCard = document.createElement('div');
  paceCard.className = 'card';
  paceCard.style.margin = '0 0 12px';
  paceCard.innerHTML = progHead('PACE', '페이스');
  if(!sessions.length) paceCard.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:14px; margin:0;">세트 반복 메트콘을 Finish로, 칼로리 인터벌을 세트별로 기록하면 여기 쌓여요.</p>');
  const groups = {};
  sessions.forEach(s => (groups[s.group] = groups[s.group] || []).push(s));
  Object.entries(groups).forEach(([g, list])=>{
    list.sort((a, b) => a.date.localeCompare(b.date));
    list.forEach((s, i)=>{
      s.pat = s.kind === 'parts' ? null : pacePattern(s.vals, s.unit !== 'time', rateOf(s));
      s.level = s.kind === 'parts' ? null : levelOf(s);
      const prev = list.slice(0, i).filter(x => sameIg(x, s) && !paceChanged(s.items[0], x.items[0]));
      s.changedFromLast = i > 0 && paceChanged(s.items[0], list[i - 1].items[0]);
      s.speed = null; s.delta = null; s.ref = null;
      if(s.compare && s.level && prev.length >= 3){
        const last3 = prev.slice(-3);
        s.ref = s.level.map((_, j) => median(last3.map(x => x.level[j]).filter(v => v != null)));
        s.delta = deltaOf(s.level, s.ref);
        if(s.delta != null) s.speed = s.delta >= 0.02 ? 'fast' : s.delta <= -0.02 ? 'slow' : 'similar';
        const ds = prev.map(x => deltaOf(x.level, s.ref)).filter(x => x != null);
        const noise = prev.length >= 4 ? Math.sqrt(mean(ds.map(d => d * d))) : 0.06;
        const recent3 = list.slice(Math.max(0, i - 2), i + 1).map(x => x.delta);
        s.improved = (s.delta != null && s.delta >= 2 * noise) || (recent3.length === 3 && recent3.every(d => d != null && d > 0));
      }
      const t = s.md && s.md.target;
      if(t && s.kind === 'sets'){ const v = s.vals.filter(x => x != null); s.hits = { t, hit: v.filter(x => Math.abs(x - t) <= paceTol(t, 'time')).length, n: v.length }; }
    });
    list.reverse();
    const box = document.createElement('div');
    box.style.cssText = 'padding:14px 0 8px; border-top:0.5px solid var(--border);';
    box.innerHTML = '<div style="display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin:0 0 6px;"><span style="font-size:14px; font-weight:600;">' + escapeHtml(g.split(' · ').slice(0, 2).join(' · ')) + '</span><span class="muted" style="font-size:12px;">' + (/I GO U GO/.test(g) ? 'I GO U GO · ' : '') + list.length + '번</span></div>';
    const hbG = list[0].unit !== 'time';
    const verdict = s => {
      if(s.kind === 'parts') return s.main.value && s.main.value !== 'CAP' ? '캡 안에 끝냄 · ' + escapeHtml(s.main.value) : '타임캡 걸림';
      if(!s.pat) return '3세트부터 판정해요';
      const st = s.vals.filter(x => x != null);
      let num;
      if(s.speed){
        const pct = Math.abs(Math.round(s.delta * 100));
        num = s.speed === 'similar' ? '기준과 비슷해요' : '기준보다 ' + pct + '% ' + (s.speed === 'fast' ? (hbG ? '많아요' : '빨라요') : (hbG ? '적어요' : '느려요'));
      } else num = '평균 ' + fmtV(s, mean(st));
      return s.pat.label + ' · ' + num;
    };
    const tone = s => !s.pat ? 'var(--text-secondary)' : (s.pat.key === 'even' && s.speed !== 'slow') || s.pat.key === 'negative' ? 'var(--text-success)' : s.pat.key === 'allout' || s.pat.key === 'positive' ? 'var(--text-warning)' : 'var(--text-secondary)';
    list.forEach(s=>{
      const row = document.createElement('div');
      row.style.cssText = 'cursor:pointer; padding:8px 0; -webkit-tap-highlight-color:transparent;';
      row.innerHTML = '<div style="display:grid; grid-template-columns:40px auto minmax(0,1fr) 12px; align-items:center; gap:12px;"><span class="muted" style="font-size:13px;">' + shortD(s.date) + '</span>' + bars(s.vals, hbG) + '<span style="font-size:13px; text-align:right; color:' + tone(s) + ';">' + verdict(s) + '</span><span class="pace-chev muted" style="font-size:14px; display:inline-block; transition:transform 300ms cubic-bezier(0.32,0.72,0,1);">›</span></div>'
        + '<div class="pace-detail" style="display:none;"></div>';
      const det = row.querySelector('.pace-detail');
      row.onclick = e => {
        if(e.target.closest('.pres-toggle')) return;
        if(!det.dataset.built){ det.innerHTML = paceDetailHtml(s, list, fmtV); det.dataset.built = '1';
          const pt = det.querySelector('.pres-toggle');
          if(pt) pt.onclick = ev => { ev.stopPropagation(); const b = det.querySelector('.pres-body'); slideToggle(b); pt.textContent = b.dataset.open === '1' ? '운동 내용 접기' : '운동 내용 보기'; };
        }
        slideToggle(det);
        row.querySelector('.pace-chev').style.transform = det.dataset.open === '1' ? 'rotate(90deg)' : 'none';
      };
      box.appendChild(row);
    });
    const last = list[0];
    const cnt = list.filter(x => sameIg(x, last)).length;
    let foot = '';
    if(last.improved) foot = '같은 형식에서 기준보다 꾸준히 좋아지고 있어요.';
    else if(last.compare && last.kind !== 'parts' && cnt < 4) foot = '같은 형식 기록이 ' + (4 - cnt) + '번 더 쌓이면 내 기준 페이스와 비교해 드릴게요.';
    else if(last.changedFromLast && last.compare) foot = '구성이 바뀐 날이라 지난 기록과 직접 비교하지 않았어요.';
    if(foot) box.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:12px; margin:4px 0 0;">' + foot + '</p>');
    paceCard.appendChild(box);
  });
  el.appendChild(paceCard);

  // ---- limiter ----
  const lim = {};
  const addLim = (n, src)=>{ if(!n) return; (lim[n] = lim[n] || { n, c: 0, src: new Set() }).c++; lim[n].src.add(src); };
  sessions.forEach(s=>{
    if(s.md.lim) addLim(s.md.lim, '직접 선택');
    if(s.kind === 'igug' && s.items[0]){
      const mv = igugMoves(s.items[0]);
      s.stops.forEach(st => { if(st !== '' && st != null && st !== 'all' && mv[+st]) addLim(limName(mv[+st].label), 'I GO U GO'); });
    }
    if(s.kind === 'parts') s.partRecs.forEach(r => { if(pd(r).unfin) addLim(r.item_name, '못 끝낸 파트'); });
  });
  const limCard = document.createElement('div');
  limCard.className = 'card';
  limCard.style.margin = '0 0 12px';
  limCard.innerHTML = progHead('WEAKNESS', '약점', '기록할 때 고른 아쉬운 동작, I GO U GO에서 멈춘 동작, 못 끝낸 파트를 모아요.');
  const limList = Object.values(lim).filter(x => x.c >= 2).sort((a, b) => b.c - a.c);
  if(!limList.length) limCard.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:14px; margin:0;">같은 동작이 2번 이상 쌓이면 보여드려요. 메트콘을 기록할 때 아쉬운 동작을 하나 골라주세요.</p>');
  else {
    const cats = {};
    limList.forEach(x => { const c = mvCat(x.n); (cats[c] = cats[c] || { c: 0, items: [] }).c += x.c; cats[c].items.push(x); });
    const mx = Math.max(...Object.values(cats).map(x => x.c));
    limCard.insertAdjacentHTML('beforeend', '<p style="font-size:15px; margin:0 0 10px;">최근 자주 무너진 동작 <strong style="font-weight:600;">' + escapeHtml(limList[0].n) + '</strong> <span class="muted">(' + limList[0].c + '번)</span></p>'
      + Object.entries(cats).sort((a, b) => b[1].c - a[1].c).map(([c, x]) => '<div style="display:grid; grid-template-columns:76px minmax(0,1fr) 24px; align-items:center; gap:8px; margin:0 0 4px;"><span style="font-size:13px;">' + c + '</span><span style="height:8px; border-radius:4px; background:var(--border-accent); width:' + Math.max(6, Math.round(x.c / mx * 100)) + '%;"></span><span class="muted" style="font-size:13px; text-align:right;">' + x.c + '</span></div><div class="muted" style="font-size:12px; margin:0 0 8px 84px;">' + x.items.map(i => escapeHtml(i.n) + ' ' + i.c).join(' · ') + '</div>').join(''));
  }
  el.appendChild(limCard);

  // ---- lift trends ----
  const lifts = {};
  recs.forEach(r=>{
    if(r.skipped || r.type !== 'weight' || / - /.test(r.item_name)) return;
    (lifts[r.item_name] = lifts[r.item_name] || []).push(r);
  });
  const liftCard = document.createElement('div');
  liftCard.className = 'card';
  liftCard.style.margin = '0 0 12px';
  liftCard.innerHTML = progHead('STRENGTH', '리프팅 추세', 'RM 기록은 추정 1RM으로 맞춰서 비교해요. 작업 무게·RPE 기록은 처방과 같이 보여줘요.');
  const liftEntries = Object.entries(lifts).filter(([, l]) => l.length >= 1).sort((a, b) => b[1].length - a[1].length);
  if(!liftEntries.length) liftCard.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:14px; margin:0;">무게 기록이 아직 없어요.</p>');
  liftEntries.forEach(([n, list])=>{
    const withRm = list.filter(r => { const k = pd(r).rm; return typeof k === 'number' && k >= 1 && k <= 5; });
    const useRm = withRm.length > 0;
    const pts = (useRm ? withRm : list).map(r => { const w = parseFloat(r.value) || 0, k = pd(r).rm; return { r, v: useRm ? (k === 1 ? w : w * (1 + k / 30)) : w }; });
    const vals = pts.map(x => x.v);
    const last = vals[vals.length - 1], prev = vals[vals.length - 2], bestV = Math.max(...vals);
    let status = '기록 1번', color = 'var(--text-muted)';
    if(vals.length >= 2){
      const lastBestDate = pts[vals.lastIndexOf(bestV)].r.date;
      const days = (new Date(pts[pts.length - 1].r.date) - new Date(lastBestDate)) / 864e5;
      if(last >= bestV && last > prev){ status = '상승'; color = 'var(--text-success)'; }
      else if(last < bestV * 0.95){ status = '하락'; color = 'var(--text-danger)'; }
      else if(days >= 21){ status = '정체'; color = 'var(--text-warning)'; }
      else status = '유지';
    }
    const row = document.createElement('div');
    row.style.cssText = 'padding:10px 0; border-top:0.5px solid var(--border); cursor:pointer;';
    row.innerHTML = '<div style="display:grid; grid-template-columns:minmax(0,1fr) 72px auto; align-items:center; gap:10px;">'
      + '<div style="min-width:0;"><div style="font-size:15px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(n) + '</div><div class="muted" style="font-size:12px;">' + (useRm ? '추정 1RM ' : '최근 ') + (isAddedWeight(n) ? '+' : '') + formatWeight(last, unit) + '</div></div>'
      + (spark(vals, 72, 24, true) || '<span></span>')
      + '<span style="font-size:12px; font-weight:600; color:' + color + '; text-align:right;">' + status + '</span></div>'
      + '<div class="lift-detail" style="display:none;"></div>';
    const det = row.querySelector('.lift-detail');
    row.onclick = ()=>{
      if(!det.dataset.built){
        det.dataset.built = '1';
        det.innerHTML = '<div style="padding-top:8px; font-size:13px; line-height:1.6;">' + list.slice().reverse().map(r => {
          const k = pd(r).rm;
          const it = itemOf(r.date, r.item_name);
          const pres = it ? splitPrescribedLines(it.prescribed).filter(Boolean)[0] || '' : '';
          return '<div style="display:flex; justify-content:space-between; gap:8px;"><span class="muted">' + shortD(r.date) + ' ' + wdOf(r.date) + '</span><span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" class="muted">' + escapeHtml(k != null ? rmLabel(String(k)) : pres) + '</span><strong style="font-weight:600;">' + fmtWeightRec(r, unit) + '</strong></div>';
        }).join('') + '</div>';
      }
      slideToggle(det);
    };
    liftCard.appendChild(row);
  });
  // 리프팅 추세는 숨김 (PR 갱신과 프로필 RM 기록으로 대신)

  // ---- same prescription ----
  const same = [];
  const byItem = {};
  recs.forEach(r => { if(!r.skipped && !isRound(r) && ['distance', 'reps', 'calories', 'weight'].includes(r.type)) (byItem[r.item_name] = byItem[r.item_name] || []).push(r); });
  Object.entries(byItem).forEach(([n, list])=>{
    if(list.length < 2) return;
    const a = list[list.length - 2], b = list[list.length - 1];
    const ia = itemOf(a.date, n), ib = itemOf(b.date, n);
    if(!ia || !ib || String(ia.prescribed).trim() !== String(ib.prescribed).trim()) return;
    if(pd(a).igug || pd(b).igug) return;
    const num = r => r.type === 'distance' ? (() => { const m = String(r.value).match(/^([\d.]+)\s*(cm|m|ft)$/); return m ? +m[1] * (m[2] === 'm' ? 100 : m[2] === 'ft' ? 30.48 : 1) : NaN; })() : parseFloat(r.value);
    const da = num(a), db = num(b);
    if(isNaN(da) || isNaN(db)) return;
    const show = r => r.type === 'weight' ? fmtWeightRec(r, unit) : escapeHtml(r.value);
    const diff = db - da;
    same.push('<div style="display:flex; justify-content:space-between; gap:8px; padding:8px 0; border-top:0.5px solid var(--border); font-size:14px;"><span style="min-width:0;">' + escapeHtml(n) + '</span><span style="flex-shrink:0;"><span class="muted">' + show(a) + ' →</span> <strong style="font-weight:600;">' + show(b) + '</strong> <span style="font-size:12px; color:' + (diff > 0 ? 'var(--text-success)' : diff < 0 ? 'var(--text-danger)' : 'var(--text-muted)') + ';">' + (diff > 0 ? '▲' : diff < 0 ? '▼' : '—') + '</span></span></div>');
  });
  if(same.length){
    const sc = document.createElement('div');
    sc.className = 'card';
    sc.style.margin = '0 0 12px';
    sc.innerHTML = progHead('SAME WORKOUT', '같은 처방 비교', '처방이 완전히 같았던 지난번과 이번을 비교해요.') + same.join('');
    el.appendChild(sc);
  }
}
