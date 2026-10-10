


// ---------- 프로그램 문구 표시 ----------
// "1.Warm Up", "A) Warm Up" 같은 앞 번호를 떼고 보여줘요. 섹션과 소분류가 같은 이름이면 소분류는 숨겨요.
function stripLabelPrefix(s){
  return String(s || '').replace(/^\s*(?:\d+|[A-Za-z])\s*[.)]\s*/, '').trim();
}
function isSameLabel(a, b){
  const norm = (s)=> stripLabelPrefix(s).toLowerCase().replace(/\s+/g, '');
  return norm(a) === norm(b);
}
// 기준 설명을 동작마다 한 줄씩 보여줘요. 줄바꿈이 있으면 그대로 쓰고,
// 없으면 괄호 밖의 ", " / ". " / " + " / " → " 와 앞머리 "2 Sets:" 같은 라벨에서 줄을 나눠요.
function splitPrescribedLines(text){
  const src = String(text || '').replace(/\r\n?/g, '\n').replace(/\\n/g, '\n').trim();
  if(!src) return [];
  if(src.includes('\n')) return src.split(/\n/).map(s=>s.trim());
  const lines = [];
  let rest = src;
  const head = rest.match(/^((?:\d+\s*)?(?:sets?|rounds?|each for time|for time)\s*:)\s*/i);
  if(head){ lines.push(head[1]); rest = rest.slice(head[0].length); }
  let buf = '', depth = 0;
  for(let i = 0; i < rest.length; i++){
    const c = rest[i];
    if(c === '(') depth++;
    if(c === ')') depth = Math.max(0, depth - 1);
    if(depth === 0){
      if((c === ',' || c === '.') && rest[i+1] === ' '){ if(c === '.') buf += ''; lines.push(buf); buf = ''; i++; continue; }
      if(c === '+' && rest[i-1] === ' ' && rest[i+1] === ' '){ lines.push(buf); buf = ''; i++; continue; }
      if(c === '→'){ lines.push(buf); buf = '→ '; if(rest[i+1] === ' ') i++; continue; }
    }
    buf += c;
  }
  lines.push(buf);
  return lines.map(s=>s.trim().replace(/\.$/, '')).filter(Boolean);
}
// 줄 종류별 색: 구조(세트·라운드·렙 스킴)=진하게, 동작=보통, 휴식/메모=흐리게, 기록 안내=포인트색
function prescribedLineStyle(l){
  if(/^기록/.test(l)) return 'color:var(--text-muted); font-size:13px; margin-top:4px;';
  if(/^-?\s*rest\b/i.test(l)) return 'color:var(--text-muted); font-size:14px;';
  if(/^\*/.test(l)) return 'color:var(--text-muted); font-size:14px;';
  if(/^(\d+\s*(sets?|rounds?)\b|\d+x\d+|\d+(-\d+)+$|emom|e\d+mom|amrap|for time|each for time|build to|every|then$|rpe\b)/i.test(l))
    return 'color:var(--text-primary); font-weight:500;';
  return 'color:var(--text-secondary);';
}
function formatPrescribed(text){
  return splitPrescribedLines(text)
    .map(l => { if(!l) return '<div style="height:0.6em;"></div>'; const mv = extractMovementName(l); return `<div style="${prescribedLineStyle(l)}"${mv ? ` data-mv="${escapeAttr(mv)}"` : ''}>${escapeHtml(l)}</div>`; })
    .join('');
}

// ---------- 동작 영상: 동작 이름 → 유튜브 링크 (movement_videos 테이블) ----------
const MV_HEADER_RE = /^(\d+\s*(sets?|rounds?)\b|\d+x\d+|\d+(-\d+)+(\s+reps?)?$|emom|e\d+mom|amrap|for time|for quality|each for time|build to|every|then$|rpe\b|rest\b|min \d|scale|goal|target|time cap|x\d|\d+x(amrap|\d)|\d+(\/\d+)?#|reps?\b|complex$|cap$)/i;
// 처방 한 줄에서 동작 이름만 뽑아요. 앞의 횟수·세트(8-10, 4x8, AMRAP, "- ", -into-)와
// 뒤의 무게·높이(135/95#, 24")·퍼센트·@ 이후는 떼요. 영상 등록·표시가 같은 이름을 쓰게 돼요.
function extractMovementName(line){
  let s = String(line || '').trim();
  if(!/[a-z]/i.test(s) || /[가-힣]/.test(s) || /:$/.test(s) || /=/.test(s)) return '';
  s = s.replace(/^-into-\s*/i, '').replace(/^-\s+/, '').replace(/^"x"\s+/i, '')
       .replace(/^min\s*\d+\s*:\s*/i, '').replace(/^amrap(\/side)?\s+(?=[a-z])/i, '').replace(/^\d+x\d+(-\d+)?\s+(?=[a-z])/i, '');
  if(/^[(+\-*@]/.test(s) || MV_HEADER_RE.test(s)) return '';
  s = s.replace(/^(:?\d+(:\d+)?(-\d+)*(\.\d+)*(\/\d+)?(x|ft|m|cal)?(\/side)?)(\s+(seconds?|secs?)(\/side)?)?\s+/i, '');
  s = s.replace(/^(in the remaining time\s+)?(max\s+)?(calories?\s+|cal\s+)?/i, '');
  s = s.replace(/\s*@.*$/, '').replace(/\s*\(.*?\)/g, '').replace(/\s*-into-.*$/i, '').replace(/\s*:.*$/, '').replace(/\s+\d.*$/, '').trim();
  if(MV_HEADER_RE.test(s) || /\breps?\b/i.test(s)) return '';
  return (s.length >= 3 && /[a-z]{3}/i.test(s)) ? s : '';
}
// 대소문자·띄어쓰기·복수형(s)을 무시하고 비교해요. Pull Up = Pull Ups.
const normMv = s => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(w => w.length > 2 ? w.replace(/s$/, '') : w).join('');
// 운동 제목(Push Jerk, Barbell Bench Press)도 동작이면 영상을 달 수 있어요. 여러 동작을 묶은 제목은 빼요.
const isMovementTitle = n => !!n && !/\+|warm ?up|brutal|interval|skill|circuit|complex|emom|amrap|primer|work\b|\d\s*$/i.test(n);
let MV_MAP = null;
async function loadMovementVideos(){
  const { data, error } = await sb.from('movement_videos').select('name, url').order('name');
  MV_MAP = new Map();
  if(!error) (data || []).forEach(r => MV_MAP.set(normMv(r.name), r));
  decorateMovementVideos(document);
  return MV_MAP;
}
function findMovementVideo(name, line){
  if(!MV_MAP) return null;
  const k = normMv(name);
  return MV_MAP.get(k) || null;
}
const MV_ICON = '<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" rx="3.5" fill="#FF0000"/><path d="M8 4v6l5.2-3z" fill="#fff"/></svg>';
// 영상 아이콘은 동작 이름 왼쪽 고정 칸에 둬요. 같은 블록 안에 영상이 하나라도 있으면
// 그 블록의 동작 줄을 모두 같은 칸만큼 들여서, 아이콘과 글자 시작점이 세로로 맞아요.
function decorateMovementVideos(root){
  if(!MV_MAP) return;
  const groups = new Map();
  (root || document).querySelectorAll('[data-mv]').forEach(div=>{
    div.querySelectorAll('.mv-btn').forEach(b => b.remove());
    const g = div.parentNode;
    if(!groups.has(g)) groups.set(g, []);
    groups.get(g).push(div);
  });
  groups.forEach(divs=>{
    const hits = divs.map(d => findMovementVideo(d.dataset.mv, d.textContent));
    const any = hits.some(Boolean);
    divs.forEach((div, i)=>{
      div.style.position = any ? 'relative' : '';
      div.style.paddingLeft = any ? '28px' : '';
      const hit = hits[i];
      if(!hit) return;
      const a = document.createElement('a');
      a.className = 'mv-btn';
      a.href = hit.url; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', div.dataset.mv + ' 영상 보기');
      a.style.cssText = 'position:absolute; left:-8px; top:-6px; width:36px; height:calc(1.5em + 12px); display:flex; align-items:center; justify-content:center; line-height:0; -webkit-tap-highlight-color:transparent;';
      a.innerHTML = MV_ICON;
      a.onclick = e => e.stopPropagation();
      div.prepend(a);
    });
  });
  // 제목 옆 아이콘: 처방 줄에 같은 동작이 이미 있으면 달지 않아요.
  (root || document).querySelectorAll('.item-name').forEach(span=>{
    const box = span.parentNode;
    if(!box) return;
    box.querySelectorAll('.mv-title-btn').forEach(b => b.remove());
    const name = span.textContent.trim();
    if(!isMovementTitle(name)) return;
    const hit = MV_MAP.get(normMv(name));
    if(!hit) return;
    const card = span.closest('.card') || box.parentNode;
    if(card && [...card.querySelectorAll('[data-mv]')].some(d => normMv(d.dataset.mv) === normMv(name))) return;
    const a = document.createElement('a');
    a.className = 'mv-title-btn';
    a.href = hit.url; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', name + ' 영상 보기');
    a.style.cssText = 'display:inline-flex; align-items:center; justify-content:center; width:36px; height:32px; margin:-8px -8px -8px -2px; vertical-align:middle; line-height:0; -webkit-tap-highlight-color:transparent;';
    a.innerHTML = MV_ICON;
    a.onclick = e => e.stopPropagation();
    span.after(a);
  });
}
function normalizeVideoUrl(u){
  u = String(u || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}
async function saveMovementVideo(name, url){
  name = String(name || '').trim();
  url = normalizeVideoUrl(url);
  if(!name || !url) return '동작 이름과 링크를 모두 넣어주세요.';
  const { error } = await sb.from('movement_videos').upsert({ name, url, updated_at: new Date().toISOString() }, { onConflict: 'name' });
  if(error) return '저장에 실패했어요: ' + error.message;
  await loadMovementVideos();
  if(document.getElementById('mv-list')){ renderMovementVideoList(); renderMovementPicker(); }
  return '';
}
async function promptMovementVideo(name, current){
  const url = window.prompt('"' + name + '" 유튜브 링크를 붙여넣어 주세요', current || '');
  if(url === null) return;
  if(!url.trim()){ return; }
  const err = await saveMovementVideo(name, url);
  if(err) alert(err);
}
async function renderMovementPicker(){
  const el = document.getElementById('mv-picker');
  const dateEl = document.getElementById('mv-date');
  if(!el || !dateEl) return;
  if(!dateEl.value) dateEl.value = todayStr();
  if(!MV_MAP) await loadMovementVideos();
  const { data } = await sb.from('programs').select('items').eq('date', dateEl.value).maybeSingle();
  const items = (data && data.items) || [];
  if(!items.length){ el.innerHTML = '<p class="muted" style="font-size:14px; margin:0;">이 날은 프로그램이 없어요.</p>'; return; }
  const bySec = new Map();
  items.forEach(it=>{
    const sec = stripLabelPrefix(it.section || '기타');
    if(!bySec.has(sec)) bySec.set(sec, []);
    const list = bySec.get(sec);
    if(isMovementTitle(it.name) && !list.some(x => normMv(x) === normMv(it.name))) list.push(it.name);
    splitPrescribedLines(it.prescribed).forEach(l=>{
      const n = extractMovementName(l);
      if(n && !list.some(x => normMv(x) === normMv(n))) list.push(n);
    });
  });
  el.innerHTML = '';
  bySec.forEach((names, sec)=>{
    if(!names.length) return;
    const g = document.createElement('div');
    g.innerHTML = '<p class="muted" style="font-size:12px; font-weight:500; letter-spacing:0.04em; margin:0 0 6px;">' + escapeHtml(sec) + '</p><div class="mv-chips" style="display:flex; flex-wrap:wrap; gap:6px;"></div>';
    const wrap = g.querySelector('.mv-chips');
    names.forEach(n=>{
      const has = !!MV_MAP.get(normMv(n));
      const c = document.createElement('button');
      c.type = 'button';
      c.style.cssText = 'height:30px; padding:0 10px; border-radius:999px; font-size:13px; font-weight:400; display:inline-flex; align-items:center; gap:5px;' + (has ? 'color:var(--text-muted);' : '');
      c.innerHTML = (has ? '<svg width="14" height="10" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" rx="3.5" fill="#FF0000"/><path d="M8 4v6l5.2-3z" fill="#fff"/></svg>' : '') + escapeHtml(n);
      c.onclick = ()=>{
        const hit = MV_MAP.get(normMv(n));
        document.getElementById('mv-name').value = hit ? hit.name : n;
        document.getElementById('mv-url').value = hit ? hit.url : '';
        document.getElementById('mv-status').textContent = hit ? '이미 등록된 영상이에요. 링크를 바꾸고 저장하면 수정돼요.' : '';
        document.getElementById('mv-status').className = 'status';
        document.getElementById('mv-url').focus();
      };
      wrap.appendChild(c);
    });
    el.appendChild(g);
  });
}
async function renderMovementVideoList(){
  const el = document.getElementById('mv-list');
  if(!el) return;
  if(!MV_MAP) await loadMovementVideos();
  const q = normMv(document.getElementById('mv-search').value);
  const rows = [...MV_MAP.values()].filter(v => !q || normMv(v.name).includes(q)).sort((a, b)=> a.name.localeCompare(b.name));
  document.getElementById('mv-count').textContent = MV_MAP.size ? MV_MAP.size + '개' : '';
  el.innerHTML = rows.length ? '' : '<p class="muted" style="font-size:14px;">' + (MV_MAP.size ? '검색 결과가 없어요.' : '아직 등록된 영상이 없어요.') + '</p>';
  rows.forEach(v=>{
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:0.5px solid var(--border);';
    row.innerHTML = '<a href="' + escapeAttr(v.url) + '" target="_blank" rel="noopener" style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary); text-decoration:none; font-size:15px;">▶ ' + escapeHtml(v.name) + '</a>'
      + '<button type="button" class="mv-edit" style="height:30px; font-size:13px; padding:0 10px;">수정</button>'
      + '<button type="button" class="mv-del danger" style="height:30px; font-size:13px; padding:0 10px;">삭제</button>';
    row.querySelector('.mv-edit').onclick = ()=> promptMovementVideo(v.name, v.url);
    row.querySelector('.mv-del').onclick = async ()=>{
      if(!confirm('"' + v.name + '" 영상을 삭제할까요?')) return;
      const { error } = await sb.from('movement_videos').delete().eq('name', v.name);
      if(error){ alert('삭제에 실패했어요: ' + error.message); return; }
      await loadMovementVideos();
      renderMovementVideoList();
      renderMovementPicker();
    };
    el.appendChild(row);
  });
}

// 항목 편집기에서 쓰는 기록 방식 목록. validateProgramItems / parse-wod.ts와 같은 9개 타입을 써야 함.
const ITEM_TYPES = [
  { value: 'weight', short: '무게', label: '무게 — 무게 하나만 기록' },
  { value: 'for_time', short: '시간', label: '완료 시간 — 분:초 기록' },
  { value: 'amrap', short: 'AMRAP', label: 'AMRAP — 총 개수/라운드 하나 기록' },
  { value: 'reps', short: '횟수', label: '횟수 — 숫자 하나 기록' },
  { value: 'emom_complete', short: 'EMOM', label: 'EMOM 완료 — 전체완료/일부실패만 기록' },
  { value: 'barbell_conditioning', short: '바벨', label: '바벨 컨디셔닝 — 동작별로 무게 기록' },
  { value: 'amrap_by_round', short: '라운드 개수', label: '라운드별 개수 — 무게 고정, 라운드마다 개수' },
  { value: 'weight_by_round', short: '라운드 무게', label: '라운드별 무게 — 라운드마다 무게' },
  { value: 'emom_by_round', short: '라운드 EMOM', label: '라운드별 언브로큰/브로큰' },
  { value: 'distance', short: '거리', label: '거리 — 점프 거리·높이 등 (cm/m/ft)' },
  { value: 'calories', short: '칼로리', label: '칼로리 — 세트별 칼로리, 합계·평균 자동' },
  { value: 'note', short: '메모', label: '메모 — 스킬 연습, For Quality' },
  { value: 'check', short: '완료', label: '완료 체크 — 숫자 기록 없이 했는지만' }
];
function itemTypeShort(type){ const t = ITEM_TYPES.find(x=>x.value===type); return t ? t.short : type; }
