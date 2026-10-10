

let logProgramDates = [];
async function loadDatesForLog(){
  const calendarContainer = document.getElementById('log-date-calendar');
  const hint = document.getElementById('log-date-hint');
  const { data, error } = await sb.from('programs').select('date').order('date', { ascending: false });
  logProgramDates = (error || !data) ? [] : data.map(row=>row.date);
  hint.textContent = '';
  const today = todayStr();
  const initialDate = (logProgramDates.includes(today) || !logProgramDates.length) ? today : logProgramDates[0];

  calendarContainer.innerHTML = '';
  const picker = buildWeekStrip({
    highlightedDates: logProgramDates,
    selectedDate: initialDate,
    onSelect: (dateStr)=> handleLogDateChange(dateStr)
  });
  calendarContainer.appendChild(picker.el);

  handleLogDateChange(initialDate);
}

function handleLogDateChange(date){
  const hint = document.getElementById('log-date-hint');
  hint.textContent = '';
  renderLogForm(date);
}

// ---------- 여러 파트 For Time (Each For Time + Rest): 시계 시간만 적으면 파트별 시간·총 시간 계산 ----------
function parseRestSec(text){
  const t = String(text || '');
  let m = t.match(/rest\s*(\d+):(\d{2})/i);
  if(m) return (+m[1]) * 60 + (+m[2]);
  m = t.match(/rest\s*(\d+)\s*min/i);
  return m ? (+m[1]) * 60 : 0;
}
function parseCapSec(text){
  const t = String(text || '');
  let m = t.match(/(\d+):(\d{2})\s*(?:min(?:ute)?s?\s*)?(?:time\s*)?cap\b/i);
  if(m) return (+m[1]) * 60 + (+m[2]);
  m = t.match(/time\s*cap[^0-9\n]{0,40}(\d+)(?::(\d{2}))?/i) || t.match(/\bcap[^0-9\n]{0,10}(\d+)(?::(\d{2}))?\s*min/i);
  return m ? (+m[1]) * 60 + (+(m[2] || 0)) : 0;
}
const fmtClock = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function buildMultiPartCard(parts, subName, sectionName){
  const card = document.createElement('div');
  card.className = 'card multi-part-card';
  card.style.marginLeft = '0';
  const capSec = parts.reduce((m, it) => m || parseCapSec(it.prescribed), 0);
  const timeInput = cls => '<div style="display:flex; gap:4px; align-items:center;"><input type="number" inputmode="numeric" placeholder="분" class="' + cls + '-min" style="width:60px;" /><span>:</span><input type="number" inputmode="numeric" placeholder="초" class="' + cls + '-sec" style="width:60px;" /></div>';
  let html = '<p class="muted" style="font-size:13px; margin:0 0 12px;">파트가 끝날 때 체육관 시계에 보이는 시간을 Finish에 적어주세요. 파트별 시간은 자동으로 계산돼요.</p>';
  parts.forEach((it, i)=>{
    const rest = i < parts.length - 1 ? parseRestSec(it.prescribed) : 0;
    html += '<div class="mp-part" data-i="' + i + '" style="padding:12px 0; border-top:0.5px solid var(--border);">'
      + '<div style="margin-bottom:6px;"><span class="muted" style="font-size:12px; margin-right:6px;">PART ' + (i + 1) + '</span><span class="item-name">' + escapeHtml(it.name) + '</span></div>'
      + '<div class="muted" style="margin:0 0 10px; line-height:1.55;">' + formatPrescribed(it.prescribed) + '</div>'
      + '<div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">'
      + '<div style="display:flex; align-items:center; gap:8px;"><span class="muted" style="font-size:14px;">Finish</span>' + timeInput('mp') + '</div>'
      + '<span class="mp-split" style="font-size:15px; font-weight:600;"></span></div>'
      + '<div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:8px;">'
      + '<label style="display:flex; align-items:center; gap:4px; font-size:14px; margin:0;"><input type="checkbox" class="mp-unfin" style="width:auto; height:auto;" />못 끝냄</label>'
      + '<input type="number" inputmode="numeric" class="mp-unfin-reps" placeholder="완료한 개수" style="width:110px; display:none;" />'
      + '<label style="display:flex; align-items:center; gap:4px; font-size:14px; margin:0;"><input type="checkbox" class="mp-pskip" style="width:auto; height:auto;" />이 파트 생략</label>'
      + '</div>'
      + (rest ? '<div class="mp-rest muted" style="font-size:13px; margin-top:8px;"></div>' : '')
      + '</div>';
  });
  html += '<div style="padding:12px 0 0; border-top:0.5px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">'
    + '<div style="display:flex; align-items:center; gap:6px;"><span class="muted" style="font-size:14px;">타임캡</span><input type="number" inputmode="numeric" class="mp-cap" placeholder="분" value="' + (capSec ? Math.round(capSec / 60) : '') + '" style="width:64px;" /><span class="muted" style="font-size:14px;">분</span></div>'
    + '<span class="mp-total" style="font-size:16px; font-weight:600;"></span></div>'
    + '<div class="mp-capnote muted" style="font-size:13px; margin-top:4px; text-align:right;"></div>'
    + '<div class="row" style="margin:12px 0 8px;"><label style="display:flex; align-items:center; gap:4px; font-size:15px; margin:0;"><input type="checkbox" class="mp-skip" style="width:auto; height:auto;" />오늘 생략</label></div>'
    + '<div style="display:flex; align-items:center; gap:8px; margin:0 0 8px;"><span class="muted" style="font-size:14px; flex-shrink:0;">아쉬운 동작</span><select class="mp-lim" style="flex:1; min-width:0; padding:0 8px;"><option value="">없음</option>' + [...new Set(parts.flatMap(x => splitPrescribedLines(x.prescribed).map(l => extractMovementName(l)).filter(Boolean).map(limName)))].map(n => '<option value="' + escapeAttr(n) + '">' + escapeHtml(n) + '</option>').join('') + '</select></div>'
    + '<input type="text" class="mp-notes" placeholder="메모" style="width:100%; font-size:15px;" />';
  card.innerHTML = html;

  const rows = [...card.querySelectorAll('.mp-part')];
  const readClock = row => {
    const m = row.querySelector('.mp-min').value, s = row.querySelector('.mp-sec').value;
    return (m === '' && s === '') ? null : (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
  };
  const compute = ()=>{
    let start = 0, last = null;
    const out = [];
    rows.forEach((row, i)=>{
      const pskip = row.querySelector('.mp-pskip').checked;
      const unfin = !pskip && row.querySelector('.mp-unfin').checked;
      row.querySelector('.mp-unfin-reps').style.display = unfin ? '' : 'none';
      row.querySelectorAll('.mp-min, .mp-sec').forEach(x => x.disabled = pskip || skip.checked);
      const clock = pskip ? null : readClock(row);
      const split = clock == null ? null : clock - start;
      const sp = row.querySelector('.mp-split');
      if(split == null) sp.textContent = '';
      else if(split <= 0){ sp.textContent = '시계 시간을 확인해주세요'; sp.style.color = 'var(--text-danger)'; }
      else { sp.textContent = (unfin ? '멈춤 ' : '파트 ') + fmtClock(split); sp.style.color = ''; }
      if(pskip){ sp.textContent = '생략'; sp.style.color = 'var(--text-muted)'; }
      const rest = i < rows.length - 1 ? parseRestSec(parts[i].prescribed) : 0;
      const restEl = row.querySelector('.mp-rest');
      if(restEl) restEl.textContent = 'Rest ' + fmtClock(rest) + (clock != null ? ' → 다음 파트 ' + fmtClock(clock + rest) + '에 시작' : '');
      out.push({ clock, split: split > 0 ? split : null, pskip, unfin, reps: parseInt(row.querySelector('.mp-unfin-reps').value) || 0 });
      if(clock != null){ start = clock + rest; last = clock; }
    });
    const capMin = parseInt(card.querySelector('.mp-cap').value);
    const totalEl = card.querySelector('.mp-total');
    const capNote = card.querySelector('.mp-capnote');
    totalEl.textContent = last != null ? '총 ' + fmtClock(last) : '';
    const anyUnfin = out.some(o => o.unfin && o.split != null);
    capNote.textContent = anyUnfin ? '타임캡 걸림' : (last != null && capMin) ? (last <= capMin * 60 ? fmtClock(capMin * 60 - last) + ' 남기고 끝냈어요' : '타임캡보다 ' + fmtClock(last - capMin * 60) + ' 넘었어요') : '';
    return { out, last, capMin, anyUnfin };
  };
  const skip = card.querySelector('.mp-skip');
  card.querySelectorAll('input').forEach(inp => { inp.addEventListener('input', compute); inp.addEventListener('change', compute); });
  compute();
  skip.onchange = ()=>{ rows.forEach(r => r.querySelectorAll('input').forEach(x => x.disabled = skip.checked)); card.querySelector('.mp-notes').placeholder = skip.checked ? '생략 이유' : '메모'; };

  card._collect = (date, name)=>{
    const notes = card.querySelector('.mp-notes').value.trim();
    const sec = normSec(parts[0].section);
    if(skip.checked){
      return parts.map(it => ({ date, name, item_name: it.name, section: sec, type: it.type, value: '생략', scaled: true, scale_detail: notes ? '생략: ' + notes : '생략함', skipped: true }));
    }
    const { out, last, capMin, anyUnfin } = compute();
    const recs = [];
    out.forEach((o, i)=>{
      if(o.pskip){ recs.push({ date, name, item_name: parts[i].name, section: sec, type: 'for_time', value: '생략', scaled: true, scale_detail: '생략함', skipped: true }); return; }
      if(o.split == null) return;
      const d = { spec: (o.unfin ? 'Finish ' + fmtClock(o.clock) + ' · 못 끝냄 ' + o.reps + '개' : 'Finish ' + fmtClock(o.clock)), clock: o.clock };
      if(o.unfin){ d.unfin = true; d.reps = o.reps; }
      recs.push({ date, name, item_name: parts[i].name, section: sec, type: 'for_time', value: o.unfin ? 'CAP +' + o.reps : fmtClock(o.split), scaled: false, scale_detail: '§' + JSON.stringify(d), skipped: false });
    });
    if(last != null){
      let spec = '';
      if(anyUnfin) spec = '타임캡 걸림' + (capMin ? ' (' + capMin + ':00)' : '');
      else if(capMin) spec = '타임캡 ' + capMin + ':00 · ' + (last <= capMin * 60 ? fmtClock(capMin * 60 - last) + ' 남김' : fmtClock(last - capMin * 60) + ' 초과');
      const d = {}; if(spec) d.spec = spec; if(notes) d.notes = notes; if(capMin) d.cap = capMin;
      if(card.querySelector('.mp-lim').value) d.lim = card.querySelector('.mp-lim').value;
      recs.push({ date, name, item_name: (stripLabelPrefix(subName) || stripLabelPrefix(sectionName)) + ' · Total', section: sec, type: 'for_time', value: anyUnfin ? 'CAP' : fmtClock(last), scaled: !!notes, scale_detail: '§' + JSON.stringify(d), skipped: false });
    }
    return recs;
  };
  const totalName = (stripLabelPrefix(subName) || stripLabelPrefix(sectionName)) + ' · Total';
  const partNames = parts.map(x => x.name);
  card._restore = recs => {
    const setClock = (row, sec)=>{ row.querySelector('.mp-min').value = Math.floor(sec / 60); row.querySelector('.mp-sec').value = sec % 60; };
    recs.forEach(r=>{
      const pd = parsePersonalDetail(r) || {};
      const i = partNames.indexOf(r.item_name);
      if(r.skipped){
        if(recs.every(x => x.skipped) && recs.length >= parts.length){ skip.checked = true; skip.onchange(); const rs = String(r.scale_detail || '').replace(/^생략:\s*/, ''); if(rs && rs !== '생략함') card.querySelector('.mp-notes').value = rs; }
        else if(i >= 0) rows[i].querySelector('.mp-pskip').checked = true;
        return;
      }
      if(i >= 0 && pd.unfin){ rows[i].querySelector('.mp-unfin').checked = true; rows[i].querySelector('.mp-unfin-reps').value = pd.reps || 0; }
      if(i >= 0 && pd.clock != null) setClock(rows[i], pd.clock);
      if(r.item_name === totalName){ if(pd.lim) card.querySelector('.mp-lim').value = pd.lim; if(pd.notes) card.querySelector('.mp-notes').value = pd.notes; if(pd.cap) card.querySelector('.mp-cap').value = pd.cap; }
    });
    compute();
  };
  attachAutosave(card, { collect: card._collect, owns: r => normSec(r.section) === normSec(parts[0].section) && (partNames.includes(r.item_name) || r.item_name === totalName) });
  return card;
}

// ---------- 같은 세트 반복 For Time ("6 Sets ... Rest 2:30"): 세트별 Finish → Split, 페이스 ----------
function repeatSetsMatch(it){
  return String(it.prescribed || '').match(/^\s*(\d+)\s*(sets?|rounds?)\b([^\n]*)/im);
}
function repeatSetsCount(it){
  const m = repeatSetsMatch(it);
  const n = m ? parseInt(m[1]) : 0;
  if(n < 2 || n > 20) return 0;
  return (parseRestSec(it.prescribed) > 0 || /for\s*time/i.test(m[3])) ? n : 0;
}
function igugMoves(it){
  const lines = splitPrescribedLines(it.prescribed);
  const out = [];
  let started = false;
  for(const l of lines){
    if(!started){ if(/^\s*\d+\s*(sets?|rounds?)\b/i.test(l)){ started = true; } continue; }
    if(/^-?\s*rest\b/i.test(l) || l === '') { if(out.length) break; else continue; }
    const m = l.match(/^\s*(\d+)(?:\/\d+)?\s+(.+)/);
    if(m) out.push({ label: l.replace(/\s*@.*$/, '').trim(), reps: parseInt(m[1]) });
  }
  return out;
}
function buildRepeatSetCard(it){
  const n = repeatSetsCount(it);
  const rest = parseRestSec(it.prescribed);
  const unitWord = /^r/i.test(repeatSetsMatch(it)[2]) ? '라운드' : '세트';
  const capSec = parseCapSec(it.prescribed);
  const card = document.createElement('div');
  card.className = 'card multi-part-card';
  card.style.marginLeft = '0';
  const igMoves = igugMoves(it);
  let igRows = '';
  for(let i = 1; i <= n; i++){
    igRows += '<div class="ig-row" style="display:grid; grid-template-columns:52px minmax(0,1fr) 64px 64px; gap:8px; align-items:center; padding:8px 0; border-top:0.5px solid var(--border);">'
      + '<span class="muted" style="font-size:14px;">' + i + unitWord + '</span>'
      + '<select class="ig-stop" style="min-width:0; padding:0 6px;"><option value="">멈춘 동작</option>' + igMoves.map((m, j) => '<option value="' + j + '">' + escapeHtml(m.label) + '</option>').join('') + '<option value="all">전부 완료</option></select>'
      + '<input type="number" inputmode="numeric" class="ig-extra" placeholder="+개수" style="min-width:0;" />'
      + '<span class="ig-total" style="text-align:right; font-size:14px; font-weight:600;"></span></div>';
  }
  const igHtml = '<div class="rs-igug" style="display:none;">'
    + '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:0 0 6px;"><span class="muted" style="font-size:14px;">Work</span><input type="number" inputmode="numeric" class="ig-work" value="3" style="width:56px;" /><span class="muted" style="font-size:14px;">분 · Rest</span><input type="number" inputmode="numeric" class="ig-rest" value="3" style="width:56px;" /><span class="muted" style="font-size:14px;">분</span></div>'
    + '<p class="muted" style="font-size:13px; margin:0 0 6px;">Work 시간이 끝났을 때 하고 있던 동작과 그 동작에서 한 개수를 넣어주세요. 세트별 총 개수는 자동으로 계산돼요.</p>'
    + '<div style="display:grid; grid-template-columns:52px minmax(0,1fr) 64px 64px; gap:8px; font-size:12px; color:var(--text-muted); padding:4px 0;"><span></span><span>멈춘 동작</span><span>개수</span><span style="text-align:right;">합계</span></div>'
    + igRows
    + '<div class="ig-sum muted" style="font-size:13px; margin-top:8px; text-align:right;"></div>'
    + '</div>';
  let rowsHtml = '';
  for(let i = 1; i <= n; i++){
    rowsHtml += '<div class="rs-row" style="display:grid; grid-template-columns:52px auto minmax(0,1fr); align-items:center; gap:10px; padding:8px 0; border-top:0.5px solid var(--border);">'
      + '<span class="muted" style="font-size:14px;">' + i + unitWord + '</span>'
      + '<div style="display:flex; gap:4px; align-items:center;"><input type="number" inputmode="numeric" placeholder="분" class="rs-min" style="width:56px;" /><span>:</span><input type="number" inputmode="numeric" placeholder="초" class="rs-sec" style="width:56px;" /></div>'
      + '<div style="text-align:right; line-height:1.3;"><div class="rs-split" style="font-size:15px; font-weight:600;"></div><div class="rs-next muted" style="font-size:12px;"></div></div>'
      + '</div>';
  }
  card.innerHTML = '<div style="margin-bottom:8px;"><span class="item-name">' + escapeHtml(it.name) + '</span></div>'
    + '<div class="muted" style="margin:0 0 10px; line-height:1.55;">' + formatPrescribed(it.prescribed) + '</div>'
    + '<div class="rs-modes" style="display:flex; gap:6px; margin:0 0 10px;"><button type="button" class="rs-mode" data-m="std" style="height:30px; font-size:13px; padding:0 12px; border-radius:999px;">기본</button><button type="button" class="rs-mode" data-m="igug" style="height:30px; font-size:13px; padding:0 12px; border-radius:999px;">I GO U GO</button></div>'
    + '<div class="rs-normal">'
    + '<div class="rs-target" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:0 0 8px; padding:10px 12px; border-radius:var(--radius); background:var(--surface-1);"><span style="font-size:13px; font-weight:600; margin-right:4px;">목표 세트</span><input type="number" inputmode="numeric" class="rs-tmin" placeholder="분" style="width:52px; height:34px;" /><span>:</span><input type="number" inputmode="numeric" class="rs-tsec" placeholder="초" style="width:52px; height:34px;" /><span class="rs-treason muted" style="font-size:12px; flex-basis:100%; line-height:1.4;"></span></div>'
    + '<div style="display:grid; grid-template-columns:52px auto minmax(0,1fr); gap:10px; font-size:12px; color:var(--text-muted); padding:4px 0;"><span></span><span>Finish</span><span style="text-align:right;">Split</span></div>'
    + rowsHtml
    + '<div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:8px 0;"><label style="display:flex; align-items:center; gap:4px; font-size:14px; margin:0;"><input type="checkbox" class="rs-unfin" style="width:auto; height:auto;" />마지막 ' + unitWord + ' 못 끝냄</label><input type="number" inputmode="numeric" class="rs-unfin-reps" placeholder="완료한 개수" style="width:110px; display:none;" /></div>'
    + '<div style="padding:12px 0 0; border-top:0.5px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">'
    + '<div style="display:flex; align-items:center; gap:6px;"><span class="muted" style="font-size:14px;">타임캡</span><input type="number" inputmode="numeric" class="rs-cap" placeholder="분" value="' + (capSec ? Math.round(capSec / 60) : '') + '" style="width:64px;" /><span class="muted" style="font-size:14px;">분</span></div>'
    + '<span class="rs-total" style="font-size:16px; font-weight:600;"></span></div>'
    + '<div class="rs-pace muted" style="font-size:13px; margin-top:4px; text-align:right;"></div>'
    + '</div>' + igHtml
    + '<div class="row" style="margin:12px 0 8px;"><label style="display:flex; align-items:center; gap:4px; font-size:15px; margin:0;"><input type="checkbox" class="rs-skip" style="width:auto; height:auto;" />오늘 생략</label></div>'
    + '<div style="display:flex; align-items:center; gap:8px; margin:0 0 8px;"><span class="muted" style="font-size:14px; flex-shrink:0;">아쉬운 동작</span><select class="rs-lim" style="flex:1; min-width:0; padding:0 8px;"><option value="">없음</option>' + [...new Set(igMoves.map(m => limName(m.label)))].map(n => '<option value="' + escapeAttr(n) + '">' + escapeHtml(n) + '</option>').join('') + '</select></div>'
    + '<input type="text" class="rs-notes" placeholder="메모" style="width:100%; font-size:15px;" />';

  const rows = [...card.querySelectorAll('.rs-row')];
  const readTarget = ()=>{ const m = card.querySelector('.rs-tmin').value, sc = card.querySelector('.rs-tsec').value; if(m === '' && sc === '') return null; const t = (parseInt(m) || 0) * 60 + (parseInt(sc) || 0); return t > 0 ? t : null; };
  card.querySelectorAll('.rs-tmin, .rs-tsec').forEach(x => x.addEventListener('input', ()=>{ card._targetManual = true; }));
  const compute = ()=>{
    let start = 0, last = null;
    const out = [];
    rows.forEach((row, i)=>{
      const m = row.querySelector('.rs-min').value, s = row.querySelector('.rs-sec').value;
      const clock = (m === '' && s === '') ? null : (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
      const split = clock == null ? null : clock - start;
      const sp = row.querySelector('.rs-split'), nx = row.querySelector('.rs-next');
      if(split == null){ sp.textContent = ''; nx.textContent = ''; }
      else if(split <= 0){ sp.textContent = '시간 확인'; sp.style.color = 'var(--text-danger)'; nx.textContent = ''; }
      else {
        sp.textContent = fmtClock(split); sp.style.color = '';
        const t = readTarget(), dl = t ? split - t : null;
        nx.innerHTML = [dl != null ? '<span style="color:' + (Math.abs(dl) <= paceTol(t, 'time') ? 'var(--text-success)' : dl < 0 ? 'var(--text-warning)' : 'var(--text-danger)') + ';">목표 ' + (dl > 0 ? '+' : dl < 0 ? '−' : '±') + Math.abs(dl) + '초</span>' : '', (rest && i < rows.length - 1) ? fmtClock(clock + rest) + ' 시작' : ''].filter(Boolean).join(' · ');
      }
      out.push({ clock, split: split > 0 ? split : null });
      if(clock != null){ start = clock + rest; last = clock; }
    });
    const valid = out.map((o, i) => ({ ...o, i })).filter(o => o.split != null);
    let pace = '';
    if(valid.length >= 2){
      const fast = valid.reduce((a, b) => b.split < a.split ? b : a);
      const slow = valid.reduce((a, b) => b.split > a.split ? b : a);
      pace = '가장 빠름 ' + (fast.i + 1) + unitWord + ' ' + fmtClock(fast.split) + ' · 가장 느림 ' + (slow.i + 1) + unitWord + ' ' + fmtClock(slow.split);
      const diff = slow.split - fast.split;
      if(diff > 0) pace += ' (차이 ' + fmtClock(diff) + ')';
    }
    const unfin = card.querySelector('.rs-unfin').checked;
    card.querySelector('.rs-unfin-reps').style.display = unfin ? '' : 'none';
    const capMin = parseInt(card.querySelector('.rs-cap').value);
    let capText = '';
    if(last != null && capMin) capText = last <= capMin * 60 ? fmtClock(capMin * 60 - last) + ' 남김' : fmtClock(last - capMin * 60) + ' 초과';
    card.querySelector('.rs-total').textContent = last != null ? '총 ' + fmtClock(last) : '';
    card.querySelector('.rs-pace').textContent = [pace, capText].filter(Boolean).join(' · ');
    if(unfin) capText = '타임캡 걸림';
    return { out, last, capMin, pace, capText, unfin, reps: parseInt(card.querySelector('.rs-unfin-reps').value) || 0 };
  };
  card.querySelectorAll('input').forEach(inp => { inp.addEventListener('input', compute); inp.addEventListener('change', compute); });
  compute();
  card._mode = 'std';
  const setMode = m => {
    card._mode = m;
    card.querySelector('.rs-normal').style.display = m === 'igug' ? 'none' : '';
    card.querySelector('.rs-igug').style.display = m === 'igug' ? '' : 'none';
    card.querySelectorAll('.rs-mode').forEach(b=>{
      const on = b.dataset.m === m;
      b.style.background = on ? 'var(--text-primary)' : '';
      b.style.color = on ? 'var(--surface-0)' : '';
      b.style.fontWeight = on ? '600' : '400';
    });
  };
  card.querySelectorAll('.rs-mode').forEach(b => b.addEventListener('click', ()=> setMode(b.dataset.m)));
  setMode('std');
  const igRowEls = [...card.querySelectorAll('.ig-row')];
  const computeIg = ()=>{
    const out = igRowEls.map(row=>{
      const stop = row.querySelector('.ig-stop').value;
      const extra = parseInt(row.querySelector('.ig-extra').value) || 0;
      let total = null, label = '';
      if(stop === 'all'){ total = igMoves.reduce((a, m) => a + m.reps, 0); label = '전부 완료'; }
      else if(stop !== ''){ const j = +stop; total = igMoves.slice(0, j).reduce((a, m) => a + m.reps, 0) + extra; label = igMoves[j].label + ' 중 ' + extra + '개'; }
      row.querySelector('.ig-total').textContent = total == null ? '' : total;
      row.querySelector('.ig-extra').style.visibility = stop === 'all' ? 'hidden' : 'visible';
      return { stop, extra, total, label };
    });
    const valid = out.map((o, i) => ({ ...o, i })).filter(o => o.total != null);
    let sum = '';
    if(valid.length){
      const tot = valid.reduce((a, o) => a + o.total, 0);
      const best = valid.reduce((a, b) => b.total > a.total ? b : a), worst = valid.reduce((a, b) => b.total < a.total ? b : a);
      sum = '합계 ' + tot + '개 · 평균 ' + Math.round(tot / valid.length * 10) / 10 + (valid.length > 1 ? ' · 최고 ' + (best.i + 1) + unitWord + ' ' + best.total + ' · 최저 ' + (worst.i + 1) + unitWord + ' ' + worst.total : '');
    }
    card.querySelector('.ig-sum').textContent = sum;
    return { out, valid, sum };
  };
  card.querySelectorAll('.ig-row select, .ig-row input').forEach(x => { x.addEventListener('input', computeIg); x.addEventListener('change', computeIg); });
  const skip = card.querySelector('.rs-skip');
  skip.onchange = ()=> rows.forEach(r => r.querySelectorAll('input').forEach(x => x.disabled = skip.checked));

  card._collect = (date, name)=>{
    const notes = card.querySelector('.rs-notes').value.trim();
    if(skip.checked) return [{ date, name, item_name: it.name, section: normSec(it.section), type: 'for_time', value: '생략', scaled: true, scale_detail: notes ? '생략: ' + notes : '생략함', skipped: true }];
    if(card._mode === 'igug'){
      const { out: io, valid, sum } = computeIg();
      if(!valid.length) return [];
      const work = parseInt(card.querySelector('.ig-work').value) || 3, rst = parseInt(card.querySelector('.ig-rest').value) || 3;
      const recs = [];
      io.forEach((o, i)=>{
        if(o.total == null) return;
        recs.push({ date, name, item_name: it.name + ' - ' + (i + 1) + 'R', section: normSec(it.section), type: 'reps', value: String(o.total), scaled: false, scale_detail: '§' + JSON.stringify({ spec: o.label, ig: { stop: o.stop, extra: o.extra } }), skipped: false });
      });
      const total = valid.reduce((a, o) => a + o.total, 0);
      const d = { spec: 'I GO U GO · Work ' + work + ':00 / Rest ' + rst + ':00 · ' + sum, igug: { work, rest: rst } };
      if(notes) d.notes = notes;
      if(card.querySelector('.rs-lim').value) d.lim = card.querySelector('.rs-lim').value;
      recs.push({ date, name, item_name: it.name, section: normSec(it.section), type: 'reps', value: String(total), scaled: !!notes, scale_detail: '§' + JSON.stringify(d), skipped: false });
      return recs;
    }
    const { out, last, capMin, pace, capText, unfin, reps } = compute();
    const recs = [];
    const lastI = out.reduce((m, o, i) => o.split != null ? i : m, -1);
    out.forEach((o, i)=>{
      if(o.split == null) return;
      if(unfin && i === lastI){ recs.push({ date, name, item_name: it.name + ' - ' + (i + 1) + 'R', section: normSec(it.section), type: 'for_time', value: 'CAP +' + reps, scaled: false, scale_detail: '§' + JSON.stringify({ spec: 'Finish ' + fmtClock(o.clock) + ' · 못 끝냄 ' + reps + '개', clock: o.clock, unfin: true, reps }), skipped: false }); return; }
      recs.push({ date, name, item_name: it.name + ' - ' + (i + 1) + 'R', section: normSec(it.section), type: 'for_time', value: fmtClock(o.split), scaled: false, scale_detail: '§' + JSON.stringify({ spec: 'Finish ' + fmtClock(o.clock), clock: o.clock }), skipped: false });
    });
    if(last != null){
      const d = {};
      const spec = [pace, unfin ? capText : (capMin ? '타임캡 ' + capMin + ':00 · ' + capText : '')].filter(Boolean).join(' · ');
      if(spec) d.spec = spec;
      if(notes) d.notes = notes;
      if(capMin) d.cap = capMin;
      if(card.querySelector('.rs-lim').value) d.lim = card.querySelector('.rs-lim').value;
      const tg = readTarget();
      if(tg){ d.target = tg; d.hits = out.filter(o => o.split != null && Math.abs(o.split - tg) <= paceTol(tg, 'time')).length; }
      recs.push({ date, name, item_name: it.name, section: normSec(it.section), type: 'for_time', value: fmtClock(last), scaled: !!notes, scale_detail: '§' + JSON.stringify(d), skipped: false });
    }
    return recs;
  };
  const roundRe = new RegExp('^' + escRe(it.name) + ' - (\\d+)R$');
  card._restore = recs => {
    const tot = recs.find(r => r.item_name === it.name && !r.skipped);
    const tpd = tot && parsePersonalDetail(tot);
    if(tpd && tpd.igug){
      setMode('igug');
      card.querySelector('.ig-work').value = tpd.igug.work || 3;
      card.querySelector('.ig-rest').value = tpd.igug.rest || 3;
      if(tpd.notes) card.querySelector('.rs-notes').value = tpd.notes;
      if(tpd.lim) card.querySelector('.rs-lim').value = tpd.lim;
      recs.forEach(r=>{
        const m = r.item_name.match(roundRe);
        const pd = parsePersonalDetail(r) || {};
        if(m && pd.ig && igRowEls[m[1] - 1]){ igRowEls[m[1] - 1].querySelector('.ig-stop').value = pd.ig.stop; igRowEls[m[1] - 1].querySelector('.ig-extra').value = pd.ig.extra || ''; }
      });
      computeIg();
      return;
    }
    recs.forEach(r=>{
      const pd = parsePersonalDetail(r) || {};
      if(r.skipped){ skip.checked = true; skip.onchange(); const rs = String(r.scale_detail || '').replace(/^생략:\s*/, ''); if(rs && rs !== '생략함') card.querySelector('.rs-notes').value = rs; return; }
      const m = r.item_name.match(roundRe);
      if(m && pd.unfin){ card.querySelector('.rs-unfin').checked = true; card.querySelector('.rs-unfin-reps').value = pd.reps || 0; }
      if(m && pd.clock != null && rows[m[1] - 1]){ rows[m[1] - 1].querySelector('.rs-min').value = Math.floor(pd.clock / 60); rows[m[1] - 1].querySelector('.rs-sec').value = pd.clock % 60; }
      if(r.item_name === it.name){ if(pd.target){ card.querySelector('.rs-tmin').value = Math.floor(pd.target / 60); card.querySelector('.rs-tsec').value = pd.target % 60; card._targetManual = true; card.querySelector('.rs-treason').textContent = '저장된 목표예요.'; } if(pd.lim) card.querySelector('.rs-lim').value = pd.lim; if(pd.notes) card.querySelector('.rs-notes').value = pd.notes; if(pd.cap) card.querySelector('.rs-cap').value = pd.cap; }
    });
    compute();
  };
  attachAutosave(card, { collect: card._collect, owns: r => normSec(r.section) === normSec(it.section) && (r.item_name === it.name || roundRe.test(r.item_name)) });
  suggestTargetPace(card, it, n, rest, readTarget, compute);
  return card;
}

// ---------- Personal Training: 프로그램 외 개인 운동 (영문 UI, 순위 제외) ----------
const PERSONAL_SECTION = 'Personal';
const PERSONAL_TYPES = [
  { key: 'accessory', label: 'Accessory', hint: '세트별 무게 × 횟수 (무게 선택)' },
  { key: 'skill', label: 'Skill', hint: '오늘 연습한 내용 메모' },
  { key: 'lifting', label: 'Lifting', hint: '세트별 무게 × 횟수' },
  { key: 'emom', label: 'EMOM', hint: 'N분마다 반복, 동작별 횟수' },
  { key: 'fortime', label: 'For Time', hint: '동작 + 완료 시간' },
  { key: 'amrap', label: 'AMRAP', hint: '동작 + 라운드·개수' }
];

function ensurePersonalDatalist(programItems){
  let dl = document.getElementById('personal-movements');
  if(!dl){ dl = document.createElement('datalist'); dl.id = 'personal-movements'; document.body.appendChild(dl); }
  const names = new Set();
  (programItems || []).forEach(it=>{
    if(it.name && it.name !== 'Warm Up') names.add(it.name);
    (it.movements || []).forEach(m => names.add(m));
  });
  const fill = ()=>{ dl.innerHTML = [...names].sort().map(n => '<option value="' + escapeAttr(n) + '"></option>').join(''); };
  fill();
  sb.from('records').select('item_name').then(({ data })=>{
    (data || []).forEach(r=>{ if(r.item_name && !/\s-\s/.test(r.item_name)) names.add(r.item_name); });
    fill();
  });
}

function parsePersonalDetail(r){
  const d = r && r.scale_detail;
  if(!d || d[0] !== '§') return null;
  try { return JSON.parse(d.slice(1)); } catch(e){ return null; }
}
function personalDetailHtml(r, unit){
  const p = parsePersonalDetail(r);
  if(!p) return null;
  const w = kg => formatWeight(kg, unit);
  const rows = [];
  if(p.spec) rows.push('<div style="color:var(--text-muted);">' + escapeHtml(String(p.spec).replace(/^시계 (\d+:\d{2})에 끝남/, 'Finish $1').replace(/^시계 (\d+:\d{2})에 멈춤 · (\d+)개 완료/, 'Finish $1 · 못 끝냄 $2개')) + '</div>');
  if(p.sets && p.sets.length){
    rows.push('<div style="display:grid; grid-template-columns:auto minmax(0,1fr); gap:2px 14px;">'
      + p.sets.map((s, i) => '<span style="color:var(--text-muted);">' + (i + 1) + '세트</span><span>'
        + (s.kg != null ? w(s.kg) + (s.r ? ' × ' + escapeHtml(s.r) : '') : escapeHtml(s.r) + '회') + '</span>').join('')
      + '</div>');
  }
  if(p.moves && p.moves.length){
    rows.push('<div style="display:flex; flex-direction:column; gap:2px;">' + p.moves.map(m => '<span>' + escapeHtml([m.r, m.n].filter(Boolean).join(' '))
      + (m.kg != null ? ' <span style="color:var(--text-muted);">@ ' + w(m.kg) + '</span>' : '') + '</span>').join('') + '</div>');
  }
  let html = rows.length ? '<div style="display:flex; flex-direction:column; gap:6px; margin-top:6px; font-size:14px; line-height:1.5; color:var(--text-secondary);">' + rows.join('') + '</div>' : '';
  if(p.notes) html += '<div style="margin-top:6px;"><span class="tag scaled" style="white-space:normal;">※ ' + escapeHtml(p.notes) + '</span></div>';
  return html;
}

function buildPersonalSection(programItems){
  ensurePersonalDatalist(programItems);
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--surface-2); border:1px dashed var(--border-strong); border-radius:var(--radius-lg); padding:16px; margin-bottom:16px;';
  box.innerHTML = '<h3 style="font-size:18px; font-weight:500; margin:0 0 4px;">Personal Training</h3>'
    + '<p class="muted" style="margin:0 0 12px; font-size:14px;">내 프로필에만 저장돼요.</p>'
    + '<div class="p-entries" style="display:flex; flex-direction:column; gap:12px;"></div>'
    + '<div class="p-picker" style="display:none; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px; margin-top:12px;"></div>'
    + '<button type="button" class="p-add" style="margin-top:12px; height:40px; width:100%;">+ 운동 추가</button>';
  const entries = box.querySelector('.p-entries');
  const picker = box.querySelector('.p-picker');
  const addBtn = box.querySelector('.p-add');

  PERSONAL_TYPES.forEach(t=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.style.cssText = 'height:auto; padding:10px 12px; text-align:left; display:flex; flex-direction:column; align-items:flex-start; gap:2px;';
    b.innerHTML = '<span style="font-weight:600; font-size:15px;">' + t.label + '</span><span class="muted" style="font-size:12px; font-weight:400;">' + t.hint + '</span>';
    b.onclick = ()=>{ addEntry(t.key); picker.style.display = 'none'; addBtn.textContent = '+ 운동 추가'; };
    picker.appendChild(b);
  });
  addBtn.onclick = ()=>{
    const open = picker.style.display === 'none';
    picker.style.display = open ? 'grid' : 'none';
    addBtn.textContent = open ? '취소' : '+ 운동 추가';
  };

  const field = (label, html)=> '<div style="display:flex; flex-direction:column; gap:4px; min-width:0;"><span class="muted" style="font-size:12px;">' + label + '</span>' + html + '</div>';
  const notesHtml = '<input type="text" class="p-notes" placeholder="메모" style="width:100%; margin-top:10px; font-size:15px;" />';

  function addSetRow(card, copy){
    const wrap = card.querySelector('.p-sets');
    const isLift = card.dataset.ptype === 'lifting';
    const row = document.createElement('div');
    row.className = 'p-set';
    row.style.cssText = 'display:grid; grid-template-columns:44px minmax(0,1fr) 14px minmax(0,1fr) 32px; gap:6px; align-items:center; margin-bottom:6px;';
    row.innerHTML = '<span class="muted p-set-label" style="font-size:13px;"></span>'
      + '<input type="number" step="0.1" inputmode="decimal" class="p-w" placeholder="' + (isLift ? '무게' : '무게 (선택)') + '" style="min-width:0;" />'
      + '<span class="muted" style="text-align:center;">×</span>'
      + '<input type="number" inputmode="numeric" class="p-r" placeholder="횟수" style="min-width:0;" />'
      + '<button type="button" class="p-del" title="세트 삭제" style="width:32px; height:32px; ' + ICON_BTN_STYLE + '">✕</button>';
    if(copy){ row.querySelector('.p-w').value = copy.querySelector('.p-w').value; row.querySelector('.p-r').value = copy.querySelector('.p-r').value; }
    row.querySelector('.p-del').onclick = ()=>{ if(wrap.children.length > 1){ row.remove(); renumber(); } };
    wrap.appendChild(row);
    const renumber = ()=> [...wrap.children].forEach((r, i)=> r.querySelector('.p-set-label').textContent = (i + 1) + '세트');
    renumber();
  }

  function addMoveRow(card){
    const wrap = card.querySelector('.p-moves');
    const row = document.createElement('div');
    row.className = 'p-move';
    row.style.cssText = 'display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) 32px; gap:6px; align-items:center; margin-bottom:6px;';
    row.innerHTML = '<input type="text" class="p-mn" list="personal-movements" placeholder="동작" style="min-width:0;" />'
      + '<input type="text" class="p-mr" placeholder="횟수/칼로리" style="min-width:0;" />'
      + '<input type="number" step="0.1" inputmode="decimal" class="p-mw" placeholder="무게" style="min-width:0;" />'
      + '<button type="button" class="p-del" title="동작 삭제" style="width:32px; height:32px; ' + ICON_BTN_STYLE + '">✕</button>';
    row.querySelector('.p-del').onclick = ()=>{ if(wrap.children.length > 1) row.remove(); };
    wrap.appendChild(row);
  }

  function addEntry(type, f){
    const t = PERSONAL_TYPES.find(x => x.key === type);
    const card = document.createElement('div');
    card.className = 'card p-entry';
    card.style.margin = '0';
    card.dataset.ptype = type;
    const unit = getPreferredUnit();
    const unitSel = type === 'skill' ? '' : '<select class="p-unit" style="width:68px; padding:0 6px;"><option value="lb"' + (unit === 'lb' ? ' selected' : '') + '>lb</option><option value="kg"' + (unit === 'kg' ? ' selected' : '') + '>kg</option></select>';
    let body = '';
    const movesBlock = '<div class="p-moves" style="margin-top:10px;"></div><button type="button" class="p-add-move" style="height:32px; font-size:14px;">+ 동작 추가</button>';
    if(type === 'accessory' || type === 'lifting'){
      body = '<input type="text" class="p-name" list="personal-movements" placeholder="동작 이름" style="width:100%; margin-bottom:10px;" />'
        + '<div class="p-sets"></div><button type="button" class="p-add-set" style="height:32px; font-size:14px;">+ 세트 추가</button>' + notesHtml;
    } else if(type === 'skill'){
      body = '<input type="text" class="p-name" list="personal-movements" placeholder="스킬 (예: Handstand Walk)" style="width:100%; margin-bottom:8px;" />'
        + '<textarea class="p-notes" rows="3" placeholder="오늘 뭘 연습했고 어디까지 됐는지 적어주세요" style="width:100%; font-size:15px; resize:vertical;"></textarea>';
    } else if(type === 'emom'){
      body = '<input type="text" class="p-name" placeholder="이름 (선택)" style="width:100%; margin-bottom:10px;" />'
        + '<div style="display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px;">'
        + field('간격 (분)', '<input type="number" inputmode="numeric" class="p-every" value="1" min="1" />')
        + field('라운드', '<input type="number" inputmode="numeric" class="p-rounds" placeholder="10" />')
        + '</div>' + movesBlock
        + '<div style="display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr); gap:8px; margin-top:10px;">'
        + field('결과', '<select class="p-result"><option value="">선택</option><option value="done">전체 완료</option><option value="fail">중간 실패</option></select>')
        + '<div class="p-fail-wrap" style="visibility:hidden;">' + field('실패 라운드', '<input type="number" inputmode="numeric" class="p-fail-round" />') + '</div>'
        + '</div>' + notesHtml;
    } else if(type === 'fortime'){
      body = '<input type="text" class="p-name" placeholder="이름 (선택, 예: Fran)" style="width:100%; margin-bottom:10px;" />'
        + field('라운드', '<input type="number" inputmode="numeric" class="p-rounds" placeholder="1" style="width:100px;" />')
        + movesBlock
        + '<div class="p-time-wrap" style="margin-top:10px;">' + field('시간', '<div style="display:flex; gap:4px; align-items:center;"><input type="number" inputmode="numeric" class="p-min" placeholder="분" style="width:70px;" /><span>:</span><input type="number" inputmode="numeric" class="p-sec" placeholder="초" style="width:70px;" /></div>') + '</div>'
        + '<label style="display:flex; align-items:center; gap:6px; font-size:15px; margin:10px 0 0;"><input type="checkbox" class="p-capped" style="width:auto; height:auto;" />타임캡 걸림</label>'
        + '<div class="p-cap-wrap" style="display:none; margin-top:8px;">' + field('완료한 개수', '<input type="number" inputmode="numeric" class="p-cap-reps" style="width:120px;" />') + '</div>'
        + notesHtml;
    } else if(type === 'amrap'){
      body = '<input type="text" class="p-name" placeholder="이름 (선택, 예: Cindy)" style="width:100%; margin-bottom:10px;" />'
        + field('시간 (분)', '<input type="number" inputmode="numeric" class="p-duration" placeholder="12" style="width:100px;" />')
        + movesBlock
        + '<div style="display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px; margin-top:10px;">'
        + field('라운드', '<input type="number" inputmode="numeric" class="p-res-rounds" />')
        + field('+ 개수', '<input type="number" inputmode="numeric" class="p-res-reps" />')
        + '</div>' + notesHtml;
    }
    card.innerHTML = '<div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">'
      + '<span style="font-size:13px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:var(--border-accent);">' + t.label + '</span>'
      + '<span style="flex:1;"></span>' + unitSel
      + '<button type="button" class="p-remove" title="삭제" style="width:32px; height:32px; ' + ICON_BTN_DANGER_STYLE + '">' + TRASH_ICON_SVG + '</button></div>'
      + body;
    card.querySelector('.p-remove').onclick = async ()=>{
      if(card._as && card._as.ids.length){
        if(!confirm('이 운동 기록을 지울까요?')) return;
        card._as.removing = true;
        await saveCard(card);
        if(card._as.ids.length){ card._as.removing = false; return; }
      }
      LOG_CTX.cards.delete(card);
      card.remove();
    };
    if(card.querySelector('.p-sets')){
      addSetRow(card);
      card.querySelector('.p-add-set').onclick = ()=>{ const rows = card.querySelectorAll('.p-set'); addSetRow(card, rows[rows.length - 1]); };
    }
    if(card.querySelector('.p-moves')){
      addMoveRow(card);
      card.querySelector('.p-add-move').onclick = ()=> addMoveRow(card);
    }
    const res = card.querySelector('.p-result');
    if(res) res.onchange = ()=>{ card.querySelector('.p-fail-wrap').style.visibility = res.value === 'fail' ? 'visible' : 'hidden'; };
    const cap = card.querySelector('.p-capped');
    if(cap) cap.onchange = ()=>{
      card.querySelector('.p-cap-wrap').style.display = cap.checked ? 'block' : 'none';
      card.querySelector('.p-time-wrap').style.display = cap.checked ? 'none' : 'block';
    };
    entries.appendChild(card);
    if(f) restoreEntry(card, f);
    attachAutosave(card, { collect: (date, name)=> collectEntry(card, date, name), byId: true });
    const first = card.querySelector('.p-name');
    if(first && !f) first.focus();
    return card;
  }

  function snapEntry(card){
    const q = s => card.querySelector(s);
    const v = s => q(s) ? q(s).value : undefined;
    return {
      t: card.dataset.ptype, u: v('.p-unit'), n: v('.p-name'), notes: v('.p-notes'), every: v('.p-every'), rounds: v('.p-rounds'),
      res: v('.p-result'), fr: v('.p-fail-round'), dur: v('.p-duration'), rr: v('.p-res-rounds'), rp: v('.p-res-reps'),
      mi: v('.p-min'), se: v('.p-sec'), cap: q('.p-capped') ? q('.p-capped').checked : undefined, cr: v('.p-cap-reps'),
      sets: [...card.querySelectorAll('.p-set')].map(r => [r.querySelector('.p-w').value, r.querySelector('.p-r').value]),
      moves: [...card.querySelectorAll('.p-move')].map(r => [r.querySelector('.p-mn').value, r.querySelector('.p-mr').value, r.querySelector('.p-mw').value])
    };
  }
  function restoreEntry(card, f){
    const set = (s, val)=>{ const e = card.querySelector(s); if(e && val != null) e.value = val; };
    set('.p-unit', f.u); set('.p-name', f.n); set('.p-notes', f.notes); set('.p-every', f.every); set('.p-rounds', f.rounds);
    set('.p-result', f.res); set('.p-fail-round', f.fr); set('.p-duration', f.dur); set('.p-res-rounds', f.rr); set('.p-res-reps', f.rp);
    set('.p-min', f.mi); set('.p-sec', f.se); set('.p-cap-reps', f.cr);
    const cap = card.querySelector('.p-capped');
    if(cap && f.cap){ cap.checked = true; cap.onchange(); }
    const res = card.querySelector('.p-result');
    if(res && res.onchange) res.onchange();
    if(card.querySelector('.p-sets') && f.sets && f.sets.length){
      card.querySelector('.p-sets').innerHTML = '';
      f.sets.forEach(s=>{ addSetRow(card); const rows = card.querySelectorAll('.p-set'); const r = rows[rows.length - 1]; r.querySelector('.p-w').value = s[0] || ''; r.querySelector('.p-r').value = s[1] || ''; });
    }
    if(card.querySelector('.p-moves') && f.moves && f.moves.length){
      card.querySelector('.p-moves').innerHTML = '';
      f.moves.forEach(m=>{ addMoveRow(card); const rows = card.querySelectorAll('.p-move'); const r = rows[rows.length - 1]; r.querySelector('.p-mn').value = m[0] || ''; r.querySelector('.p-mr').value = m[1] || ''; r.querySelector('.p-mw').value = m[2] || ''; });
    }
  }

  function collectEntry(card, date, name){
    const out = [];
    (()=>{
      const type = card.dataset.ptype;
      const q = s => card.querySelector(s);
      const val = s => { const e = q(s); return e ? String(e.value).trim() : ''; };
      const unit = q('.p-unit') ? q('.p-unit').value : getPreferredUnit();
      const kgOf = v => { const n = parseFloat(v); return isNaN(n) ? null : Math.round(toKg(n, unit) * 100) / 100; };
      const notes = val('.p-notes');
      const nm = val('.p-name');
      const push = (item_name, recType, value, detail)=>{
        Object.keys(detail).forEach(k => { const v = detail[k]; if(v == null || v === '' || (Array.isArray(v) && !v.length)) delete detail[k]; });
        detail.f = snapEntry(card);
        out.push({ date, name, item_name, section: PERSONAL_SECTION, type: recType, value: String(value), scaled: !!detail.notes, scale_detail: '§' + JSON.stringify(detail), skipped: false });
      };
      const moves = [...card.querySelectorAll('.p-move')].map(r => ({
        n: r.querySelector('.p-mn').value.trim(), r: r.querySelector('.p-mr').value.trim(), kg: kgOf(r.querySelector('.p-mw').value)
      })).filter(m => m.n);
      const autoTitle = moves.map(m => m.n).join(' + ');
      if(moves.some(m => m.kg != null)) setPreferredUnit(unit);

      if(type === 'accessory' || type === 'lifting'){
        if(!nm) return;
        const sets = [...card.querySelectorAll('.p-set')].map(r => ({ kg: kgOf(r.querySelector('.p-w').value), r: r.querySelector('.p-r').value.trim() }))
          .filter(s => s.kg != null || s.r);
        if(!sets.length) return;
        const weighted = sets.filter(s => s.kg != null);
        if(weighted.length){
          setPreferredUnit(unit);
          push(nm, 'weight', Math.max(...weighted.map(s => s.kg)), { sets, notes });
        } else {
          const total = sets.reduce((a, s) => a + (parseInt(s.r) || 0), 0);
          push(nm, 'reps', total, { sets, notes });
        }
      } else if(type === 'skill'){
        if(!nm && !notes) return;
        push(nm || 'Skill Practice', 'note', 'Practice', { notes });
      } else if(type === 'emom'){
        const r = val('.p-result');
        if(!r) return;
        const every = parseInt(val('.p-every')) || 1;
        const rounds = parseInt(val('.p-rounds'));
        const label = every === 1 ? 'EMOM' : 'E' + every + 'MOM';
        const spec = label + (rounds ? ' · ' + rounds + ' rounds (' + every * rounds + ' min)' : '');
        const value = r === 'done' ? 'Completed' : 'Failed R' + (val('.p-fail-round') || '?');
        push(nm || (label + ' ' + autoTitle).trim(), 'emom_complete', value, { spec, moves, notes });
      } else if(type === 'fortime'){
        const rounds = parseInt(val('.p-rounds'));
        const detail = { spec: rounds > 1 ? rounds + ' rounds for time' : '', moves, notes };
        const title = nm || autoTitle || 'For Time';
        if(q('.p-capped').checked){
          push(title, 'amrap', 'CAP +' + (val('.p-cap-reps') || 0) + ' reps', detail);
        } else {
          const m = val('.p-min'), s = val('.p-sec');
          if(!m && !s) return;
          push(title, 'for_time', (parseInt(m) || 0) + ':' + String(parseInt(s) || 0).padStart(2, '0'), detail);
        }
      } else if(type === 'amrap'){
        const r = val('.p-res-rounds'), rp = val('.p-res-reps');
        if(!r && !rp) return;
        const dur = val('.p-duration');
        push(nm || autoTitle || 'AMRAP', 'amrap', (parseInt(r) || 0) + ' rounds + ' + (parseInt(rp) || 0) + ' reps', { spec: dur ? dur + ' min AMRAP' : '', moves, notes });
      }
    })();
    return out;
  }

  function restore(r){
    const pd = parsePersonalDetail(r);
    if(!pd || !pd.f || !PERSONAL_TYPES.some(t => t.key === pd.f.t)) return null;
    return addEntry(pd.f.t, pd.f);
  }

  return { box, restore };
}

// ---------- 자동 저장: 카드마다 따로 저장, 같은 카드는 덮어쓰기 ----------
const LOG_CTX = { date: null, name: '', cards: new Set(), token: 0 };
function isAddedWeight(name){ return /^weighted\b/i.test(String(name || '')); }
function fmtWeightRec(r, unit){ return (isAddedWeight(r.item_name) ? '+' : '') + formatWeight(parseFloat(r.value) || 0, unit); }
function rmLabel(k){ return k === 'S' ? '탑 싱글' : k + 'RM'; }
function normSec(s){ return stripLabelPrefix(String(s || '')).trim(); }
function parseRm(text){
  const t = String(text || '');
  let m = t.match(/build\s+to\s+an?\s*(\d+)\s*-?\s*rm/i) || t.match(/기록은\s*그날\s*(\d+)\s*rm/i) || t.match(/(\d+)\s*-?\s*rm\s+for\s+the\s+day/i);
  if(m) return parseInt(m[1]);
  if(/heavy\s+single/i.test(t)) return /rpe/i.test(t) ? 'S' : 1;
  return 0;
}
function calMachines(it){
  const out = [];
  String(it.prescribed || '').split('\n').forEach(l=>{
    const m = l.match(/max\s+cal(?:orie)?s?\s+(.+?)\s*(?:@.*)?$/i);
    if(m && !out.includes(m[1].trim())) out.push(m[1].trim());
  });
  return out.length >= 2 ? out : [];
}
function parseSetRange(it){
  const t = String(it.prescribed || '');
  const m = t.match(/x\s*(\d+)\s*(?:-\s*\d+)?\s*sets?/i) || t.match(/^\s*(\d+)\s*sets?/im);
  return Math.min(20, Math.max(1, parseInt(it.rounds) || (m ? parseInt(m[1]) : 6)));
}
function initStdInputs(card, item){
  if(item.type === 'for_time'){
    const cap = card.querySelector('.cap-check');
    const sync = ()=>{
      card.querySelector('.time-wrap').style.display = cap.checked ? 'none' : 'flex';
      card.querySelector('.cap-reps').style.display = cap.checked ? '' : 'none';
      card.querySelector('.done-wrap').style.display = cap.checked ? 'none' : 'flex';
    };
    cap.onchange = sync;
    card._syncCap = sync;
  }
  if(item.type === 'calories'){
    const rows = card.querySelector('.cal-rows');
    const machines = calMachines(item);
    card._machines = machines;
    const cols = Math.max(1, machines.length);
    const sum = ()=>{
      const per = Array(cols).fill(0); let total = 0, sets = 0;
      [...rows.children].forEach(r=>{
        const v = [...r.querySelectorAll('.cal-in')].map(x => parseFloat(x.value));
        if(v.some(n => !isNaN(n))) sets++;
        v.forEach((n, i)=>{ if(!isNaN(n)){ per[i] += n; total += n; } });
      });
      const perText = machines.length > 1 ? machines.map((m, i) => m + ' ' + per[i]).join(' · ') + ' · ' : '';
      card.querySelector('.cal-sum').textContent = sets ? perText + '합계 ' + total + ' cal' : '';
    };
    const add = ()=>{
      const r = document.createElement('div');
      r.style.cssText = 'display:grid; grid-template-columns:52px repeat(' + cols + ', minmax(0,1fr)); gap:8px; align-items:center;';
      r.innerHTML = '<span class="muted" style="font-size:14px;">' + (rows.children.length + 1) + '세트</span>'
        + Array.from({ length: cols }, (_, i) => '<input type="number" inputmode="numeric" class="cal-in" placeholder="' + escapeAttr(machines[i] || 'cal') + '" style="min-width:0;" />').join('');
      r.querySelectorAll('input').forEach(x => x.addEventListener('input', sum));
      rows.appendChild(r);
    };
    for(let i = 0; i < parseSetRange(item); i++) add();
    card.querySelector('.cal-add').onclick = add;
    card._calAdd = add;
    card._calSum = sum;
  }
  if(item.type === 'note' || item.type === 'check'){
    const sc = card.querySelector('.scale-check');
    if(sc) sc.closest('label').style.display = 'none';
  }
}
function escRe(s){ return String(s).replace(/[.*+?^$\{}()|[\]\\]/g, '\\$&'); }
function setSaveStatus(card, kind, text){
  const st = card._as && card._as.st;
  if(!st) return;
  st.textContent = text || '';
  st.style.color = kind === 'err' ? 'var(--text-danger)' : (kind === 'ok' ? 'var(--text-success)' : 'var(--text-muted)');
  st.style.cursor = kind === 'err' ? 'pointer' : 'default';
}
function attachAutosave(card, opts){
  const st = document.createElement('div');
  st.className = 'save-status';
  st.style.cssText = 'text-align:right; font-size:12px; min-height:16px; margin-top:8px;';
  st.onclick = ()=>{ if(card._as.lastErr){ card._as.last = null; saveCard(card); } };
  card.appendChild(st);
  card._as = { date: LOG_CTX.date, name: LOG_CTX.name, collect: opts.collect, owns: opts.owns, byId: !!opts.byId, ids: [], last: null, timer: null, pending: false, chain: Promise.resolve(), st };
  const schedule = ms => { clearTimeout(card._as.timer); card._as.pending = true; card._as.timer = setTimeout(()=> saveCard(card), ms); };
  card.addEventListener('input', ()=> schedule(2500));
  card.addEventListener('change', ()=> schedule(400));
  card.addEventListener('click', e => { const b = e.target.closest('button'); if(b && !b.classList.contains('p-remove')) schedule(600); });
  LOG_CTX.cards.add(card);
}
function saveCard(card){
  const as = card._as;
  clearTimeout(as.timer);
  as.chain = as.chain.then(async ()=>{
    as.pending = false;
    const date = as.date, name = as.name;
    if(!name){ setSaveStatus(card, 'err', '위에서 프로필 이름을 먼저 정해주세요'); return; }
    if(!as.removing && (!card.isConnected || date !== LOG_CTX.date || name !== LOG_CTX.name)) return;
    const recs = as.removing ? [] : as.collect(date, name);
    const json = JSON.stringify(recs);
    if(!as.removing && json === as.last) return;
    setSaveStatus(card, '', '저장 중…');
    let newIds = [];
    if(recs.length){
      const { data, error } = await sb.from('records').insert(recs).select('id');
      if(error){ as.lastErr = true; setSaveStatus(card, 'err', '저장 실패 · 눌러서 다시 시도'); return; }
      newIds = (data || []).map(r => r.id);
    }
    let oldIds = as.ids;
    if(!as.byId){
      const { data: cur, error } = await sb.from('records').select('id, item_name, section').eq('date', date).eq('name', name);
      if(!error) oldIds = (cur || []).filter(r => as.owns(r)).map(r => r.id);
    }
    const del = oldIds.filter(id => !newIds.includes(id));
    if(del.length){
      const { error } = await sb.from('records').delete().in('id', del);
      if(error){ as.ids = newIds.concat(del); as.lastErr = true; setSaveStatus(card, 'err', '이전 기록 정리 실패 · 눌러서 다시 시도'); return; }
    }
    as.ids = newIds;
    as.last = json;
    as.lastErr = false;
    if(recs.length) localStorage.setItem('bruteAutosaveSeen', '1');
    const t = new Date();
    setSaveStatus(card, 'ok', recs.length ? '저장됨 ' + t.getHours() + ':' + String(t.getMinutes()).padStart(2, '0') : (del.length ? '기록을 지웠어요' : ''));
  }).catch(()=>{ as.lastErr = true; setSaveStatus(card, 'err', '저장 실패 · 눌러서 다시 시도'); });
  return as.chain;
}
function flushLogSaves(){
  return Promise.all([...LOG_CTX.cards].filter(c => c._as && c._as.pending).map(c => saveCard(c)));
}

function setupProgramCard(card, item, kind){
  const sec = normSec(item.section);
  const roundRe = new RegExp('^' + escRe(item.name) + ' - (\\d+)R$');
  const owns = kind === 'std' ? (r => normSec(r.section) === sec && r.item_name === item.name)
    : kind === 'round' ? (r => normSec(r.section) === sec && (r.item_name === item.name || roundRe.test(r.item_name)))
    : (r => normSec(r.section) === sec && (r.item_name === item.name || r.item_name.startsWith(item.name + ' - ')));
  card._restore = recs => restoreProgramCard(card, item, kind, recs, roundRe);
  attachAutosave(card, { collect: (date, name)=> collectProgramCard(card, item, date, name), owns });
}

function collectProgramCard(c, item, date, name){
  const records = [];
  if(c.querySelector('.skip-check').checked){
    const skipReason = c.querySelector('.skip-reason').value.trim();
    return [{ date, name, item_name: item.name, section: normSec(item.section), type: item.type, value: '생략', scaled: true, scale_detail: skipReason ? '생략: ' + skipReason : '생략함', skipped: true }];
  }
  const scaled = c.querySelector('.scale-check').checked;
  const scaleDetail = scaled ? c.querySelector('.scale-detail').value.trim() : '';
  if(item.type === 'barbell_conditioning'){
    c.querySelectorAll('.movement-row').forEach(row=>{
      const mName = row.querySelector('.movement-name').value.trim();
      const mWeight = row.querySelector('.movement-weight').value;
      const mUnit = row.querySelector('.movement-unit').value;
      const mStatus = row.querySelector('.movement-status').value;
      if(!mName || !mWeight) return;
      setPreferredUnit(mUnit);
      const kgValue = Math.round(toKg(parseFloat(mWeight), mUnit) * 100) / 100;
      records.push({ date, name, item_name: item.name + ' - ' + mName, section: normSec(item.section), type: 'weight', value: kgValue.toString(), scaled: !!scaleDetail || !!mStatus, scale_detail: [scaleDetail, mStatus].filter(Boolean).join(' / '), skipped: false });
    });
    return records;
  }
  if(item.type === 'amrap_by_round' || item.type === 'weight_by_round' || item.type === 'emom_by_round'){
    c.querySelectorAll('.round-row').forEach(row=>{
      const r = row.dataset.round;
      const inp = row.querySelector('.round-input');
      let val = inp ? String(inp.value).trim() : '';
      if(!val) return;
      let recType = 'reps';
      if(item.type === 'weight_by_round'){
        const unitSel = row.querySelector('.round-unit');
        const unit = unitSel ? unitSel.value : 'kg';
        setPreferredUnit(unit);
        val = (Math.round(toKg(parseFloat(val), unit) * 100) / 100).toString();
        recType = 'weight';
      } else if(item.type === 'emom_by_round'){
        recType = 'status';
      }
      records.push({ date, name, item_name: item.name + ' - ' + r + 'R', section: normSec(item.section), type: recType, value: val, scaled: !!scaleDetail, scale_detail: scaleDetail, skipped: false });
    });
    return records;
  }
  let value = '';
  let detail = scaleDetail;
  if(item.type === 'for_time'){
    const min = c.querySelector('.rec-min').value;
    const sec = c.querySelector('.rec-sec').value;
    const done = c.querySelector('.done-check');
    if(c.querySelector('.cap-check') && c.querySelector('.cap-check').checked) value = 'CAP +' + (parseInt(c.querySelector('.cap-reps').value) || 0);
    else value = (min || sec) ? (parseInt(min) || 0) + ':' + String(parseInt(sec) || 0).padStart(2, '0') : ((done && done.checked) ? '완료' : '');
  } else if(item.type === 'weight'){
    const inp = c.querySelector('.rec-input');
    const unitSel = c.querySelector('.unit-select');
    if(inp && inp.value){
      const unit = unitSel ? unitSel.value : 'kg';
      setPreferredUnit(unit);
      value = (Math.round(toKg(parseFloat(inp.value), unit) * 100) / 100).toString();
      const rm = parseRm(item.prescribed);
      if(rm){ const d = { spec: rm === 'S' ? '탑 싱글' : rm + 'RM', rm }; if(scaleDetail) d.notes = scaleDetail; detail = '§' + JSON.stringify(d); }
    }
  } else if(item.type === 'distance'){
    const n = parseFloat(c.querySelector('.rec-input').value);
    if(!isNaN(n)) value = n + c.querySelector('.dist-unit').value;
  } else if(item.type === 'calories'){
    const machines = c._machines || [];
    const rowsV = [...c.querySelectorAll('.cal-rows > div')].map(r => [...r.querySelectorAll('.cal-in')].map(x => { const n = parseFloat(x.value); return isNaN(n) ? null : n; }));
    const flat = rowsV.flat().filter(n => n != null);
    if(flat.length){
      const total = flat.reduce((a, b) => a + b, 0);
      value = total + ' cal';
      const setsDone = rowsV.filter(r => r.some(n => n != null));
      let spec;
      if(machines.length > 1){
        const per = machines.map((m, i) => m + ' ' + rowsV.reduce((a, r) => a + (r[i] || 0), 0));
        spec = per.join(' · ') + ' · ' + setsDone.length + '세트';
      } else {
        spec = '세트별 ' + rowsV.map(r => r[0] == null ? '-' : r[0]).join(' · ') + ' · 평균 ' + Math.round(total / setsDone.length * 10) / 10;
      }
      const d = { spec, cals: rowsV, machines };
      if(scaleDetail) d.notes = scaleDetail;
      detail = '§' + JSON.stringify(d);
    }
  } else if(item.type === 'note'){
    const t = String(c.querySelector('.rec-input').value).trim();
    if(t){ value = '완료'; detail = t; }
  } else if(item.type === 'check'){
    if(c.querySelector('.rec-check').checked) value = '완료';
  } else {
    const inp = c.querySelector('.rec-input');
    value = inp ? String(inp.value).trim() : '';
  }
  if(value) records.push({ date, name, item_name: item.name, section: normSec(item.section), type: item.type, value, scaled: !!(parsePersonalDetail({ scale_detail: detail }) ? parsePersonalDetail({ scale_detail: detail }).notes : detail), scale_detail: detail, skipped: false });
  return records;
}

function restoreProgramCard(c, item, kind, recs, roundRe){
  const skipRec = recs.find(r => r.skipped);
  if(skipRec){
    const sc = c.querySelector('.skip-check');
    sc.checked = true; sc.onchange && sc.onchange();
    const rs = String(skipRec.scale_detail || '').replace(/^생략:\s*/, '');
    if(rs && rs !== '생략함') c.querySelector('.skip-reason').value = rs;
    return;
  }
  const showDetail = d => { if(!d) return; const ck = c.querySelector('.scale-check'); ck.checked = true; ck.onchange && ck.onchange(); c.querySelector('.scale-detail').value = d; };
  if(kind === 'round'){
    recs.forEach(r=>{
      const m = r.item_name.match(roundRe);
      if(!m) return;
      const row = c.querySelector('.round-row[data-round="' + m[1] + '"]');
      if(!row) return;
      const inp = row.querySelector('.round-input');
      if(item.type === 'weight_by_round'){ const u = row.querySelector('.round-unit').value; inp.value = round1(fromKg(parseFloat(r.value) || 0, u)); }
      else inp.value = r.value;
    });
    showDetail((recs.find(r => r.scale_detail) || {}).scale_detail);
    return;
  }
  if(kind === 'barbell'){
    const statuses = ['전체 언브로큰', '일부 브로큰'];
    let common = '';
    const rows = [...c.querySelectorAll('.movement-row')];
    recs.forEach(r=>{
      const mName = r.item_name.slice(item.name.length + 3);
      let row = rows.find(x => x.querySelector('.movement-name').value.trim() === mName && !x._filled);
      if(!row){ c._addRow(mName); const all = c.querySelectorAll('.movement-row'); row = all[all.length - 1]; }
      row._filled = true;
      const u = row.querySelector('.movement-unit').value;
      row.querySelector('.movement-weight').value = round1(fromKg(parseFloat(r.value) || 0, u));
      const parts = String(r.scale_detail || '').split(' / ').filter(Boolean);
      if(parts.length && statuses.includes(parts[parts.length - 1])) row.querySelector('.movement-status').value = parts.pop();
      if(parts.length) common = parts.join(' / ');
    });
    showDetail(common);
    return;
  }
  const r = recs[recs.length - 1];
  const pd = parsePersonalDetail(r);
  const notes = pd ? (pd.notes || '') : (r.scale_detail || '');
  if(item.type === 'weight'){
    const u = c.querySelector('.unit-select').value;
    c.querySelector('.rec-input').value = round1(fromKg(parseFloat(r.value) || 0, u));
  } else if(item.type === 'for_time'){
    const m = String(r.value).match(/^(\d+):(\d{1,2})$/);
    const cm = String(r.value).match(/^CAP \+(\d+)/);
    if(cm){ c.querySelector('.cap-check').checked = true; c.querySelector('.cap-reps').value = cm[1]; c._syncCap && c._syncCap(); }
    else if(m && !(+m[1] === 0 && +m[2] === 0)){ c.querySelector('.rec-min').value = +m[1]; c.querySelector('.rec-sec').value = +m[2]; }
    else { const d = c.querySelector('.done-check'); if(d) d.checked = true; }
  } else if(item.type === 'distance'){
    const m = String(r.value).match(/^([\d.]+)\s*(cm|m|ft)$/);
    if(m){ c.querySelector('.rec-input').value = m[1]; c.querySelector('.dist-unit').value = m[2]; }
  } else if(item.type === 'calories'){
    const cals = (pd && pd.cals) || [];
    while(c.querySelectorAll('.cal-rows > div').length < cals.length) c._calAdd();
    const rowEls = c.querySelectorAll('.cal-rows > div');
    cals.forEach((row, i)=>{
      const vals = Array.isArray(row) ? row : [row];
      const ins = rowEls[i].querySelectorAll('.cal-in');
      vals.forEach((n, j)=>{ if(n != null && ins[j]) ins[j].value = n; });
    });
    c._calSum && c._calSum();
  } else if(item.type === 'note'){
    c.querySelector('.rec-input').value = r.scale_detail || '';
    return;
  } else if(item.type === 'check'){
    c.querySelector('.rec-check').checked = r.value === '완료';
  } else {
    const inp = c.querySelector('.rec-input');
    if(inp) inp.value = r.value;
  }
  showDetail(notes);
}

async function restoreLogRecords(date, name, personal){
  const { data, error } = await sb.from('records').select('*').eq('date', date).eq('name', name).order('id');
  if(error || LOG_CTX.date !== date || LOG_CTX.name !== name) return;
  const progCards = [...LOG_CTX.cards].filter(c => !c._as.byId);
  const byCard = new Map();
  (data || []).forEach(r=>{
    if(r.section === PERSONAL_SECTION){
      const card = personal.restore(r);
      if(card){ card._as.ids = [r.id]; card._as.last = JSON.stringify(card._as.collect(date, name)); setSaveStatus(card, 'ok', '저장된 기록'); }
      return;
    }
    const c = progCards.find(x => x._as.owns(r));
    if(!c) return;
    if(!byCard.has(c)) byCard.set(c, []);
    byCard.get(c).push(r);
  });
  byCard.forEach((recs, c)=>{
    if(c._as.pending || c._as.last !== null) return;
    try { c._restore && c._restore(recs); } catch(e){ console.warn('restore failed', e); }
    c._as.ids = recs.map(r => r.id);
    const now = c._as.collect(date, name);
    c._as.last = JSON.stringify(now);
    setSaveStatus(c, 'ok', '저장된 기록');
    const dup = new Set(recs.map(r => r.item_name)).size !== recs.length;
    if(dup && now.length){ c._as.last = null; saveCard(c); }
  });
}

// 오늘 운동 맨 위 프로필 줄. 카드 없이 한 줄로 두고, 변경은 그 자리에서 입력칸으로 바뀌어요(페이드).
// 새 이름을 확인했을 때만 아래 기록을 다시 그려요. 취소하면 그대로예요.
const WHO_ROW = 'display:flex; align-items:center; gap:8px; min-height:44px;';
const WHO_TEXT_BTN = 'height:36px; padding:0 10px; margin-right:-10px; border:none; background:none; box-shadow:none; font-size:14px; color:var(--text-muted); flex-shrink:0;';
async function buildWhoBar(date){
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin:0 0 12px; padding:0 4px;';
  const saved = localStorage.getItem('bruteLogName') || '';
  LOG_CTX.name = '';
  const rerender = ()=> renderLogForm(LOG_CTX.date);
  const swapIn = ()=>{ wrap.classList.remove('fade-swap'); void wrap.offsetWidth; wrap.classList.add('fade-swap'); };
  const askName = (cancel)=>{
    wrap.innerHTML = '<div style="' + WHO_ROW + '"><input type="text" class="who-input" list="log-names" placeholder="이름" aria-label="이름" style="flex:1; min-width:0;" />'
      + (cancel ? '<button type="button" class="who-cancel" style="' + WHO_TEXT_BTN + ' margin-right:0;">취소</button>' : '')
      + '<button type="button" class="primary who-ok" style="flex-shrink:0;">확인</button></div>';
    let dl = document.getElementById('log-names');
    if(!dl){ dl = document.createElement('datalist'); dl.id = 'log-names'; document.body.appendChild(dl); }
    sb.from('records').select('name').then(({ data })=>{ dl.innerHTML = [...new Set((data || []).map(r => r.name).filter(Boolean))].sort().map(n => '<option value="' + escapeAttr(n) + '"></option>').join(''); });
    const inp = wrap.querySelector('.who-input');
    const ok = ()=>{
      const n = inp.value.trim();
      if(!n) return;
      if(n === saved && cancel){ cancel(); return; }
      localStorage.setItem('bruteLogName', n);
      rerender();
    };
    wrap.querySelector('.who-ok').onclick = ok;
    if(cancel) wrap.querySelector('.who-cancel').onclick = cancel;
    inp.onkeydown = e => { if(e.key === 'Enter') ok(); if(e.key === 'Escape' && cancel) cancel(); };
    swapIn();
    if(cancel) inp.focus();
  };
  const changeBtn = '<button type="button" class="who-change" style="' + WHO_TEXT_BTN + '">변경</button>';
  const nameEl = n => '<span class="muted" style="font-size:13px; letter-spacing:0.04em; flex-shrink:0;">Profile</span><strong style="font-size:17px; font-weight:600; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(n) + '</strong>';
  const askPin = (n)=>{
    wrap.innerHTML = '<div style="' + WHO_ROW + '">' + nameEl(n) + changeBtn + '</div>'
      + '<div style="display:flex; gap:8px;"><input type="password" inputmode="numeric" maxlength="6" class="who-pin" placeholder="PIN" aria-label="PIN" style="width:120px; text-align:center; letter-spacing:0.2em;" /><button type="button" class="primary who-pin-ok">확인</button></div>'
      + '<span class="status who-st"></span>';
    wrap.querySelector('.who-change').onclick = ()=> askName(()=> askPin(n));
    const pin = wrap.querySelector('.who-pin');
    const go = async ()=>{
      const { data, error } = await sb.rpc('profile_unlock', { p_name: n, p_pin: pin.value.trim() });
      if(!error && data && (data.ok || data.error === 'NO_PIN')){ if(data.token) setProfileToken(n, data.token); rerender(); return; }
      const st = wrap.querySelector('.who-st');
      st.className = 'status err';
      st.textContent = error ? '확인에 실패했어요: ' + error.message : pinErrorMessage(data);
      pin.value = '';
    };
    wrap.querySelector('.who-pin-ok').onclick = go;
    pin.onkeydown = e => { if(e.key === 'Enter') go(); };
  };
  const showName = ()=>{
    wrap.innerHTML = '<div style="' + WHO_ROW + '">' + nameEl(saved) + changeBtn + '</div>'
      + (localStorage.getItem('bruteAutosaveSeen') ? '' : '<p class="muted" style="font-size:13px; margin:0;">입력하면 자동으로 저장돼요.</p>');
    wrap.querySelector('.who-change').onclick = async ()=>{ await flushLogSaves(); askName(()=>{ showName(); swapIn(); }); };
  };
  if(!saved){ askName(); return wrap; }
  const setting = await getProfileSetting(saved);
  if(setting && setting.is_private && !(await canViewProfile(saved, setting))){ askPin(saved); return wrap; }
  LOG_CTX.name = saved;
  showName();
  return wrap;
}

async function renderLogForm(date){
  const el = document.getElementById('log-form');
  await flushLogSaves();
  LOG_CTX.cards.clear();
  LOG_CTX.date = date;
  const renderToken = ++LOG_CTX.token;
  // 날짜·이름을 바꿀 때 화면을 비우지 않고 흐리게 둔 채 받아서, 새 내용을 페이드로 바꿔요.
  if(el.children.length){ el.style.transition = 'opacity 160ms ease'; el.style.opacity = '0.35'; el.style.pointerEvents = 'none'; }
  else el.innerHTML = '<p class="muted">불러오고 있어요...</p>';
  const { data, error } = await sb.from('programs').select('*').eq('date', date).single();
  if(renderToken !== LOG_CTX.token) return;
  const program = (error || !data) ? { items: [] } : data;
  el.innerHTML = '';
  el.style.opacity = ''; el.style.pointerEvents = '';
  el.classList.remove('fade-swap'); void el.offsetWidth; el.classList.add('fade-swap');
  if(!program.items || !program.items.length){
    program.items = [];
    const none = document.createElement('p');
    none.className = 'muted';
    none.style.margin = '0 0 16px';
    none.textContent = '프로그램이 없는 날이에요. 개인 운동만 기록할 수 있어요.';
    el.appendChild(none);
  }


  const who = await buildWhoBar(date);
  if(renderToken !== LOG_CTX.token) return;
  el.prepend(who);

  // section별로 큰 박스, 그 안에서 subsection별로 소분류
  const bySection = {};
  program.items.forEach((it, idx)=>{
    const sec = it.section || '기타';
    if(!bySection[sec]) bySection[sec] = [];
    bySection[sec].push({ ...it, idx });
  });

  Object.entries(bySection).forEach(([sectionName, sectionItems], sIdx)=>{
    const sectionBox = document.createElement('div');
    sectionBox.style.cssText = 'background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px; margin-bottom:16px; box-shadow:var(--card-shadow);';

    const sectionTitle = document.createElement('h3');
    sectionTitle.style.cssText = 'font-size:18px; font-weight:500; margin:0 0 12px;';
    sectionTitle.textContent = stripLabelPrefix(sectionName);
    sectionBox.appendChild(sectionTitle);

    const bySub = {};
    sectionItems.forEach(it=>{
      const sub = it.subsection || '';
      if(!bySub[sub]) bySub[sub] = [];
      bySub[sub].push(it);
    });

    Object.entries(bySub).forEach(([subName, subItems])=>{
      if(subName && !isSameLabel(subName, sectionName)){
        const subTitle = document.createElement('p');
        subTitle.className = 'muted';
        subTitle.style.cssText = 'font-weight:500; margin:0 0 8px; font-size:15px;';
        subTitle.textContent = stripLabelPrefix(subName);
        sectionBox.appendChild(subTitle);
      }

      if(subItems.length >= 2 && subItems.every(x => x.type === 'for_time') && subItems.slice(0, -1).some(x => parseRestSec(x.prescribed) > 0)){
        sectionBox.appendChild(buildMultiPartCard(subItems, subName, sectionName));
        return;
      }
      subItems.forEach(it=>{
        const idx = it.idx;

        if(/warm\s*-?\s*up/i.test(normSec(it.section))){
          const info = document.createElement('div');
          info.className = 'card';
          info.style.marginLeft = '0';
          info.innerHTML = (it.name && !isSameLabel(it.name, it.section) ? '<div style="margin-bottom:8px;"><span class="item-name">' + escapeHtml(it.name) + '</span></div>' : '')
            + '<div class="muted" style="margin:0; line-height:1.55;">' + formatPrescribed(it.prescribed) + '</div>';
          sectionBox.appendChild(info);
          return;
        }

        if(it.type === 'for_time' && repeatSetsCount(it)){
          sectionBox.appendChild(buildRepeatSetCard(it));
          return;
        }
        if(it.type === 'barbell_conditioning'){
          sectionBox.appendChild(buildBarbellConditioningCard(it, idx, subName));
          return;
        }

        if(it.type === 'amrap_by_round' || it.type === 'weight_by_round' || it.type === 'emom_by_round'){
          sectionBox.appendChild(buildByRoundCard(it, idx, subName));
          return;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.style.marginLeft = '0';
        card.dataset.idx = idx;

        let inputHtml = '';
        const prefUnit = getPreferredUnit();
        if(it.type === 'weight'){
          inputHtml = `<input type="number" step="0.1" placeholder="${isAddedWeight(it.name) ? '추가 무게' : '무게'}" class="rec-input" style="width:110px;" />
            <select class="unit-select" style="width:80px;">
              <option value="lb" ${prefUnit==='lb'?'selected':''}>lb</option>
              <option value="kg" ${prefUnit==='kg'?'selected':''}>kg</option>
            </select>`;
        } else if(it.type === 'for_time'){
          const capS = parseCapSec(it.prescribed);
          inputHtml = `<div class="time-wrap" style="display:flex; gap:4px; align-items:center;"><input type="number" inputmode="numeric" placeholder="분" class="rec-min" style="width:60px;" /><span style="font-size:15px;">:</span><input type="number" inputmode="numeric" placeholder="초" class="rec-sec" style="width:60px;" /></div><input type="number" inputmode="numeric" class="cap-reps" placeholder="완료한 개수" style="width:120px; display:none;" /><label style="display:flex; align-items:center; gap:4px; font-size:15px; margin:0;"><input type="checkbox" class="cap-check" style="width:auto; height:auto;" />타임캡${capS ? '(' + fmtClock(capS) + ')' : ''} 걸림</label><label class="done-wrap" style="display:flex; align-items:center; gap:4px; font-size:15px; margin:0;"><input type="checkbox" class="done-check" style="width:auto; height:auto;" />시간 없이 완료</label>`;
        } else if(it.type === 'amrap'){
          inputHtml = `<input type="text" placeholder="예: 5라운드+3렙" class="rec-input" style="width:160px;" />`;
        } else if(it.type === 'emom_complete'){
          inputHtml = `<select class="rec-input" style="width:140px;"><option value="">완료 여부</option><option value="전체 완료">전체 완료</option><option value="일부 실패">일부 실패</option></select>`;
        } else if(it.type === 'distance'){
          inputHtml = `<input type="number" step="0.1" inputmode="decimal" placeholder="거리" class="rec-input" style="width:100px;" /><select class="dist-unit" style="width:70px;"><option value="cm">cm</option><option value="m">m</option><option value="ft">ft</option></select>`;
        } else if(it.type === 'calories'){
          inputHtml = `<div style="display:flex; flex-direction:column; gap:6px; width:100%;"><div class="cal-rows" style="display:flex; flex-direction:column; gap:6px;"></div><div style="display:flex; align-items:center; justify-content:space-between; gap:8px;"><button type="button" class="cal-add" style="height:32px; font-size:14px;">+ 세트</button><span class="cal-sum" style="font-size:15px; font-weight:600;"></span></div></div>`;
        } else if(it.type === 'note'){
          inputHtml = `<textarea class="rec-input" rows="3" placeholder="오늘 한 내용, 어디까지 됐는지" style="width:100%; font-size:15px; resize:vertical;"></textarea>`;
        } else if(it.type === 'check'){
          inputHtml = `<label style="display:flex; align-items:center; gap:6px; font-size:15px; margin:0;"><input type="checkbox" class="rec-check" style="width:auto; height:auto;" />완료</label>`;
        } else {
          inputHtml = `<input type="text" placeholder="기록" class="rec-input" style="width:130px;" />`;
        }

        card.innerHTML = `
          <div style="margin-bottom:8px;">
            <span class="item-name">${it.name}</span>
          </div>
          <div class="muted" style="margin:0 0 10px; line-height:1.55;">${formatPrescribed(it.prescribed)}</div>
          <div class="row" style="margin-bottom:8px;">
            <label style="display:flex; align-items:center; gap:4px; font-size:15px; margin:0;"><input type="checkbox" class="skip-check" style="width:auto; height:auto;" />오늘 생략</label>
          </div>
          <div class="skip-reason-wrap hidden" style="margin-bottom:8px;">
            <input type="text" class="skip-reason" placeholder="생략 이유" style="width:100%; font-size:15px;" />
          </div>
          <div class="record-input-wrap">
            <div class="row" style="margin-bottom:8px;">
              ${inputHtml}
              <label style="display:flex; align-items:center; gap:4px; font-size:15px; margin:0;"><input type="checkbox" class="scale-check" style="width:auto; height:auto;" />세부기록</label>
            </div>
            <input type="text" class="scale-detail hidden" placeholder="메모" style="width:100%; font-size:15px;" />
          </div>
        `;
        const checkbox = card.querySelector('.scale-check');
        const detail = card.querySelector('.scale-detail');
        checkbox.onchange = ()=> revealToggle(detail, checkbox.checked);

        const skipCheck = card.querySelector('.skip-check');
        const skipReasonWrap = card.querySelector('.skip-reason-wrap');
        const recordInputWrap = card.querySelector('.record-input-wrap');
        skipCheck.onchange = ()=>{
          revealToggle(skipReasonWrap, skipCheck.checked);
          revealToggle(recordInputWrap, !skipCheck.checked);
        };

        initStdInputs(card, program.items[idx]);
        setupProgramCard(card, program.items[idx], 'std');
        sectionBox.appendChild(card);
      });
    });

    el.appendChild(sectionBox);
  });

  function buildBarbellConditioningCard(it, idx, subName){
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginLeft = '0';
    card.dataset.idx = idx;
    card.dataset.barbell = 'true';

    const initialMovements = (it.movements && it.movements.length > 0) ? it.movements : ['동작1'];
    const prefUnit = getPreferredUnit();

    card.innerHTML = `
      <div style="margin-bottom:8px;">
        <span class="item-name">${it.name}</span>
      </div>
      <div class="muted" style="margin:0 0 10px; line-height:1.55;">${formatPrescribed(it.prescribed)}</div>
      <div class="row" style="margin-bottom:8px;">
        <label style="display:flex; align-items:center; gap:4px; font-size:15px; margin:0;"><input type="checkbox" class="skip-check" style="width:auto; height:auto;" />오늘 생략</label>
      </div>
      <div class="skip-reason-wrap hidden" style="margin-bottom:8px;">
        <input type="text" class="skip-reason" placeholder="생략 이유" style="width:100%; font-size:15px;" />
      </div>
      <div class="record-input-wrap">
        <div class="movement-rows"></div>
        <button type="button" class="add-movement-btn" style="height:32px; font-size:15px; margin-top:4px;">동작 추가</button>
        <div class="row" style="margin-top:12px;">
          <label style="display:flex; align-items:center; gap:4px; font-size:15px; margin:0;"><input type="checkbox" class="scale-check" style="width:auto; height:auto;" />세부기록</label>
        </div>
        <input type="text" class="scale-detail hidden" placeholder="메모" style="width:100%; font-size:15px;" />
      </div>
    `;

    const movementRows = card.querySelector('.movement-rows');

    function addMovementRow(movementName){
      const row = document.createElement('div');
      row.className = 'movement-row';
      row.style.cssText = 'border:1px solid var(--border); border-radius:var(--radius); padding:10px; margin-bottom:8px;';
      row.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
          <input type="text" class="movement-name" value="${movementName || ''}" placeholder="동작 이름" style="flex:1; min-width:0;" />
          <button type="button" class="remove-movement-btn" title="이 동작 삭제" style="width:32px; height:36px; ${ICON_BTN_DANGER_STYLE}">${TRASH_ICON_SVG}</button>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="number" step="0.1" class="movement-weight" placeholder="무게" style="flex:1; min-width:0;" />
          <select class="movement-unit" style="width:62px; flex-shrink:0; padding:0 6px;">
            <option value="lb" ${prefUnit==='lb'?'selected':''}>lb</option>
            <option value="kg" ${prefUnit==='kg'?'selected':''}>kg</option>
          </select>
          <select class="movement-status" style="width:108px; flex-shrink:0; padding:0 6px;">
            <option value="">완료여부</option>
            <option value="전체 언브로큰">전체 언브로큰</option>
            <option value="일부 브로큰">일부 브로큰</option>
          </select>
        </div>
      `;
      row.querySelector('.remove-movement-btn').onclick = ()=> row.remove();
      movementRows.appendChild(row);
    }

    initialMovements.forEach(m => addMovementRow(m));

    card.querySelector('.add-movement-btn').onclick = ()=> addMovementRow('');

    const checkbox = card.querySelector('.scale-check');
    const detail = card.querySelector('.scale-detail');
    checkbox.onchange = ()=> revealToggle(detail, checkbox.checked);

    const skipCheck = card.querySelector('.skip-check');
    const skipReasonWrap = card.querySelector('.skip-reason-wrap');
    const recordInputWrap = card.querySelector('.record-input-wrap');
    skipCheck.onchange = ()=>{
      revealToggle(skipReasonWrap, skipCheck.checked);
      revealToggle(recordInputWrap, !skipCheck.checked);
    };

    card._addRow = addMovementRow;
    setupProgramCard(card, program.items[idx], 'barbell');
    return card;
  }

  function buildByRoundCard(it, idx, subName){
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginLeft = '0';
    card.dataset.idx = idx;
    card.dataset.byRound = 'true';

    const rounds = parseInt(it.rounds) || 1;
    const prefUnit = getPreferredUnit();

    let roundsHtml = '';
    for(let r = 1; r <= rounds; r++){
      if(it.type === 'amrap_by_round'){
        roundsHtml += `
          <div class="row round-row" data-round="${r}" style="margin-bottom:6px;">
            <span class="muted" style="width:36px; flex-shrink:0;">${r}R</span>
            <input type="text" class="round-input" placeholder="개수/기록" style="width:140px;" />
          </div>`;
      } else if(it.type === 'weight_by_round'){
        roundsHtml += `
          <div class="row round-row" data-round="${r}" style="margin-bottom:6px;">
            <span class="muted" style="width:36px; flex-shrink:0;">${r}R</span>
            <input type="number" step="0.1" class="round-input" placeholder="무게" style="width:100px;" />
            <select class="round-unit" style="width:80px;">
              <option value="lb" ${prefUnit==='lb'?'selected':''}>lb</option>
              <option value="kg" ${prefUnit==='kg'?'selected':''}>kg</option>
            </select>
          </div>`;
      } else {
        // emom_by_round
        roundsHtml += `
          <div class="row round-row" data-round="${r}" style="margin-bottom:6px;">
            <span class="muted" style="width:36px; flex-shrink:0;">${r}R</span>
            <select class="round-input" style="width:140px;">
              <option value="">완료 여부</option>
              <option value="언브로큰">언브로큰</option>
              <option value="브로큰">브로큰</option>
            </select>
          </div>`;
      }
    }

    card.innerHTML = `
      <div style="margin-bottom:8px;">
        <span class="item-name">${it.name}</span>
      </div>
      <div class="muted" style="margin:0 0 10px; line-height:1.55;">${formatPrescribed(it.prescribed)}</div>
      <div class="row" style="margin-bottom:8px;">
        <label style="display:flex; align-items:center; gap:4px; font-size:15px; margin:0;"><input type="checkbox" class="skip-check" style="width:auto; height:auto;" />오늘 생략</label>
      </div>
      <div class="skip-reason-wrap hidden" style="margin-bottom:8px;">
        <input type="text" class="skip-reason" placeholder="생략 이유" style="width:100%; font-size:15px;" />
      </div>
      <div class="record-input-wrap">
        <div class="round-rows">${roundsHtml}</div>
        <div class="row" style="margin-top:8px;">
          <label style="display:flex; align-items:center; gap:4px; font-size:15px; margin:0;"><input type="checkbox" class="scale-check" style="width:auto; height:auto;" />세부기록</label>
        </div>
        <input type="text" class="scale-detail hidden" placeholder="메모" style="width:100%; font-size:15px;" />
      </div>
    `;

    const checkbox = card.querySelector('.scale-check');
    const detail = card.querySelector('.scale-detail');
    checkbox.onchange = ()=> revealToggle(detail, checkbox.checked);

    const skipCheck = card.querySelector('.skip-check');
    const skipReasonWrap = card.querySelector('.skip-reason-wrap');
    const recordInputWrap = card.querySelector('.record-input-wrap');
    skipCheck.onchange = ()=>{
      revealToggle(skipReasonWrap, skipCheck.checked);
      revealToggle(recordInputWrap, !skipCheck.checked);
    };

    setupProgramCard(card, program.items[idx], 'round');
    return card;
  }

  const personal = buildPersonalSection(program.items);
  el.appendChild(personal.box);

  if(renderToken !== LOG_CTX.token) return;
  if(LOG_CTX.name) await restoreLogRecords(date, LOG_CTX.name, personal);
}

async function startEditRecord(record, lineEl, textSpan, unit, onSaved, onDeleted){
  const afterSave = onSaved || (()=> showProfileDetail(record.name));
  const afterDelete = onDeleted || afterSave;
  lineEl.innerHTML = '';
  const editForm = document.createElement('div');
  editForm.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap; width:100%;';

  let valueInput, unitSelect;
  if(record.type === 'weight'){
    const currentDisplay = fromKg(parseFloat(record.value) || 0, unit);
    valueInput = document.createElement('input');
    valueInput.type = 'number'; valueInput.step = '0.1';
    valueInput.value = Math.round(currentDisplay * 10) / 10;
    valueInput.style.width = '100px';
    unitSelect = document.createElement('select');
    unitSelect.style.width = '70px';
    unitSelect.innerHTML = `<option value="lb" ${unit==='lb'?'selected':''}>lb</option><option value="kg" ${unit==='kg'?'selected':''}>kg</option>`;
    editForm.appendChild(valueInput);
    editForm.appendChild(unitSelect);
  } else {
    valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.value = record.value;
    valueInput.style.width = '160px';
    editForm.appendChild(valueInput);
  }

  const detailInput = document.createElement('input');
  detailInput.type = 'text';
  detailInput.placeholder = '세부기록 (선택)';
  const personalDetail = parsePersonalDetail(record);
  detailInput.value = personalDetail ? (personalDetail.notes || '') : (record.scale_detail || '');
  if(personalDetail) detailInput.placeholder = '메모 (선택)';
  detailInput.style.cssText = 'width:100%; margin-top:6px;';
  editForm.appendChild(detailInput);

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '저장';
  saveBtn.className = 'primary';
  saveBtn.style.cssText = 'height:32px; font-size:14px;';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '취소';
  cancelBtn.style.cssText = 'height:32px; font-size:14px;';
  const deleteBtn = document.createElement('button');
  deleteBtn.title = '삭제'; deleteBtn.setAttribute('aria-label', '삭제');
  deleteBtn.style.cssText = `width:32px; height:32px; ${ICON_BTN_DANGER_STYLE} border-radius:var(--radius); margin-left:auto;`;
  deleteBtn.innerHTML = TRASH_ICON_SVG;

  cancelBtn.onclick = ()=> afterSave();

  saveBtn.onclick = async ()=>{
    let newValue = valueInput.value.trim();
    if(!newValue){ alert('값을 입력해주세요'); return; }
    if(record.type === 'weight'){
      const u = unitSelect.value;
      newValue = (Math.round(toKg(parseFloat(newValue), u) * 100) / 100).toString();
    }
    const newNotes = detailInput.value.trim();
    let newDetail = newNotes;
    if(personalDetail){ const pd = { ...personalDetail }; if(newNotes) pd.notes = newNotes; else delete pd.notes; newDetail = '§' + JSON.stringify(pd); }
    const { error } = await sb.from('records').update({ value: newValue, scale_detail: newDetail, scaled: !!newNotes }).eq('id', record.id);
    if(error){ alert('수정에 실패했어요: ' + error.message); return; }
    record.value = newValue;
    record.scale_detail = newDetail;
    record.scaled = !!newDetail;
    afterSave();
  };

  deleteBtn.onclick = async ()=>{
    if(!confirm(`${record.item_name} 기록을 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return;
    const { error } = await sb.from('records').delete().eq('id', record.id);
    if(error){ alert('삭제에 실패했어요: ' + error.message); return; }
    afterDelete();
  };

  editForm.appendChild(saveBtn);
  editForm.appendChild(cancelBtn);
  editForm.appendChild(deleteBtn);
  lineEl.appendChild(editForm);
}
