
let ADMIN_SEC = 'program';
function showAdminSection(sec){
  ADMIN_SEC = sec;
  ['program','video','pin'].forEach(k=>{
    document.getElementById('adm-sec-' + k).classList.toggle('hidden', k !== sec);
  });
  document.querySelectorAll('.adm-tab').forEach(b=>{
    const on = b.dataset.sec === sec;
    b.classList.toggle('active', on);
    b.style.background = on ? 'var(--surface-1)' : 'transparent';
    b.style.color = on ? 'var(--text-primary)' : 'var(--text-secondary)';
    b.style.fontWeight = on ? '600' : '400';
  });
  if(sec === 'program') renderAdminProgramList();
  if(sec === 'video'){ renderMovementPicker(); renderMovementVideoList(); }
  if(sec === 'pin') renderAdminPinList();
}
async function renderAdminPinList(){
  const el = document.getElementById('adm-pin-list');
  el.innerHTML = '<p class="muted" style="font-size:14px;">불러오고 있어요...</p>';
  const { data, error } = await sb.from('profile_settings').select('name, is_private').eq('is_private', true).order('name');
  if(error){ el.innerHTML = '<p class="status err">' + escapeHtml(error.message) + '</p>'; return; }
  if(!data || !data.length){ el.innerHTML = '<p class="muted" style="font-size:14px;">비공개 프로필이 없어요.</p>'; return; }
  el.innerHTML = '';
  data.forEach(r=>{
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:8px; padding:10px 0; border-bottom:0.5px solid var(--border);';
    row.innerHTML = '<span style="flex:1; min-width:0; font-size:15px; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(r.name) + '</span><span class="status" style="font-size:13px;"></span><button type="button" class="danger" style="height:32px; font-size:14px; padding:0 12px; flex-shrink:0;">PIN 초기화</button>';
    const st = row.querySelector('.status');
    row.querySelector('button').onclick = async ()=>{
      if(!confirm(r.name + '님의 PIN을 초기화할까요? 공개 프로필로 바뀌고, 기록은 그대로 남아요.')) return;
      const { data: res, error: err } = await sb.rpc('admin_reset_profile', { p_name: r.name });
      if(err || !res || !res.ok){ st.className = 'status err'; st.textContent = err ? err.message : pinErrorMessage(res); return; }
      setProfileToken(r.name, null);
      renderAdminPinList();
    };
    el.appendChild(row);
  });
}

async function unlockAdmin(){
  const btn = document.getElementById('admin-unlock-btn');
  const pwEl = document.getElementById('admin-pw');
  btn.disabled = true;
  const { data, error } = await sb.rpc('admin_login', { p_password: pwEl.value });
  btn.disabled = false;
  pwEl.value = '';
  if(error){ alert('확인에 실패했어요: ' + error.message); return; }
  if(!data || !data.ok){
    alert(data && data.error === 'LOCKED' ? '비밀번호를 여러 번 틀려서 잠시 잠겼어요. 나중에 다시 시도해주세요.' : '비밀번호가 올바르지 않아요');
    return;
  }
  sessionStorage.setItem('bruteAdminToken', data.token);
  fadeSwap(document.getElementById('admin-panel'), document.getElementById('admin-gate'));
  document.getElementById('admin-date').value = todayStr();
  showAdminSection('program');
  decorateMovementVideos(document);
}

function setInputMode(mode){
  const aiEl = document.getElementById('mode-ai');
  const jsonEl = document.getElementById('mode-json');
  fadeSwap(mode === 'ai' ? aiEl : jsonEl, mode === 'ai' ? jsonEl : aiEl);
  document.getElementById('mode-ai-btn').className = mode === 'ai' ? 'primary' : '';
  document.getElementById('mode-json-btn').className = mode === 'json' ? 'primary' : '';
}


function validateProgramItems(items){
  if(!Array.isArray(items) || items.length === 0) throw new Error('항목이 비어 있어요');
  const validTypes = ['weight','for_time','amrap','emom_complete','reps','barbell_conditioning','amrap_by_round','weight_by_round','emom_by_round','distance','calories','note','check'];
  items.forEach((it, i)=>{
    if(!it.section || !it.name || !it.type || !it.prescribed){
      throw new Error(`${i+1}번째 항목에 필수 필드(section/name/type/prescribed)가 없어요`);
    }
    if(!validTypes.includes(it.type)){
      throw new Error(`${i+1}번째 항목의 type "${it.type}"이 유효하지 않아요 (${validTypes.join('/')} 중 하나여야 해요)`);
    }
    if((it.type === 'amrap_by_round' || it.type === 'weight_by_round' || it.type === 'emom_by_round') && !it.rounds){
      throw new Error(`${i+1}번째 항목(${it.name})은 type이 "${it.type}"이라 "rounds"(라운드 수, 숫자) 필드가 필요해요`);
    }
    if(it.type === 'barbell_conditioning' && (!Array.isArray(it.movements) || it.movements.length === 0)){
      throw new Error(`${i+1}번째 항목(${it.name})은 type이 "barbell_conditioning"이라 "movements"(동작 이름 목록)가 최소 1개 필요해요`);
    }
  });
}

function extractJsonArray(raw){
  let s = raw.trim();
  s = s.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if(start === -1 || end === -1 || end < start){
    throw new Error('JSON 배열을 찾을 수 없어요. 원문: ' + s.slice(0, 300));
  }
  return JSON.parse(s.slice(start, end + 1));
}

async function callParseFunction(programText){
  const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-wod`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify({ programText })
  });
  const data = await res.json();
  if(!res.ok || data.error){
    throw new Error(data.error || `함수 호출 중 오류가 발생했어요 (${res.status})`);
  }
  return data.result;
}

// ---------- 항목 비주얼 편집기 ----------
let editorItems = [];

function loadItemsIntoEditor(items){
  editorItems = items.map(it=>({
    section: it.section || '',
    subsection: it.subsection || '',
    name: it.name || '',
    type: it.type || 'weight',
    prescribed: it.prescribed || '',
    rounds: it.rounds != null ? it.rounds : '',
    movements: Array.isArray(it.movements) ? it.movements.slice() : [],
    _open: false
  }));
  document.getElementById('editor-status').textContent = '';
  document.getElementById('editor-error').textContent = '';
  const wrap = document.getElementById('items-editor-wrap');
  wrap.classList.remove('hidden');
  reveal(wrap);
  const date = document.getElementById('admin-date').value;
  document.getElementById('editor-date-label').textContent = `${date} · 항목을 눌러서 이름·기록 방식·라운드 수 등을 수정할 수 있어요.`;
  renderItemsEditor();
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderItemsEditor(){
  const container = document.getElementById('items-editor');
  container.innerHTML = '';
  if(editorItems.length === 0){
    container.innerHTML = '<p class="muted" style="font-size:14px;">항목이 없어요. 아래 "항목 추가"로 만들어주세요.</p>';
    return;
  }
  editorItems.forEach((item, idx)=> container.appendChild(buildItemEditorCard(item, idx)));
}

function buildItemEditorCard(item, idx){
  const card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'padding:0; overflow:hidden; margin-bottom:8px;';

  const header = document.createElement('div');
  header.style.cssText = 'padding:12px 14px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:8px;';
  const subLabel = item.subsection ? ` / ${item.subsection}` : '';
  header.innerHTML = `
    <div style="min-width:0;">
      <p class="muted" style="margin:0 0 2px; font-size:12px;">[${item.section || '섹션?'}${subLabel}]</p>
      <p style="margin:0; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name || '(이름 없음)'}</p>
    </div>
    <span class="tag" style="background:var(--surface-0); color:var(--text-secondary); flex-shrink:0;">${itemTypeShort(item.type)}</span>
  `;
  card.appendChild(header);

  const body = document.createElement('div');
  body.style.cssText = 'padding:12px 14px 14px; border-top:1px solid var(--border);';
  if(!item._open) body.classList.add('hidden');
  header.onclick = ()=>{ item._open = !item._open; revealToggle(body, item._open); };

  const fieldStyle = 'width:100%; margin-bottom:8px;';
  const typeOptions = ITEM_TYPES.map(t=>`<option value="${t.value}" ${t.value===item.type?'selected':''}>${t.label}</option>`).join('');

  body.innerHTML = `
    <div class="row" style="gap:8px; margin-bottom:0;">
      <div style="flex:1; min-width:120px;"><label>섹션</label><input type="text" class="ed-section" value="${escapeAttr(item.section)}" placeholder="예: 1.BRUTE리프팅" style="${fieldStyle}" /></div>
      <div style="flex:1; min-width:120px;"><label>소분류 (선택)</label><input type="text" class="ed-subsection" value="${escapeAttr(item.subsection)}" placeholder="예: 1)Lifting" style="${fieldStyle}" /></div>
    </div>
    <label>이름</label>
    <input type="text" class="ed-name" value="${escapeAttr(item.name)}" placeholder="동작 이름" style="${fieldStyle}" />
    <label>기록 방식</label>
    <select class="ed-type" style="${fieldStyle}">${typeOptions}</select>
    <label>기준 설명</label>
    <textarea class="ed-prescribed" rows="2" placeholder="예: 5R x 3set, 155/105lb" style="${fieldStyle}">${escapeHtml(item.prescribed)}</textarea>
    <div class="ed-rounds-wrap ${['amrap_by_round','weight_by_round','emom_by_round'].includes(item.type)?'':'hidden'}">
      <label>라운드 수</label>
      <input type="number" class="ed-rounds" value="${item.rounds}" min="1" placeholder="예: 4" style="width:120px; margin-bottom:8px;" />
    </div>
    <div class="ed-movements-wrap ${item.type==='barbell_conditioning'?'':'hidden'}">
      <label>동작 목록</label>
      <div class="ed-movements-list"></div>
      <button type="button" class="ed-add-movement" style="height:30px; font-size:14px;">+ 동작 추가</button>
    </div>
    <div class="row" style="margin:12px 0 0; gap:6px;">
      <button type="button" class="ed-move-up" title="위로" style="width:34px; height:30px; padding:0; font-size:14px;">↑</button>
      <button type="button" class="ed-move-down" title="아래로" style="width:34px; height:30px; padding:0; font-size:14px;">↓</button>
      <button type="button" class="ed-delete danger" style="height:30px; font-size:14px; margin-left:auto;">항목 삭제</button>
    </div>
  `;
  card.appendChild(body);

  const sectionInput = body.querySelector('.ed-section');
  const subInput = body.querySelector('.ed-subsection');
  const nameInput = body.querySelector('.ed-name');
  const typeSelect = body.querySelector('.ed-type');
  const prescribedInput = body.querySelector('.ed-prescribed');
  const roundsInput = body.querySelector('.ed-rounds');

  sectionInput.oninput = ()=>{ item.section = sectionInput.value; };
  subInput.oninput = ()=>{ item.subsection = subInput.value; };
  nameInput.oninput = ()=>{ item.name = nameInput.value; };
  prescribedInput.oninput = ()=>{ item.prescribed = prescribedInput.value; };
  roundsInput.oninput = ()=>{ item.rounds = roundsInput.value; };
  typeSelect.onchange = ()=>{ item.type = typeSelect.value; renderItemsEditor(); };

  // 동작 목록 (barbell_conditioning)
  const movementsList = body.querySelector('.ed-movements-list');
  if(movementsList){
    function renderMovements(){
      movementsList.innerHTML = '';
      item.movements.forEach((mv, mIdx)=>{
        const row = document.createElement('div');
        row.className = 'row';
        row.style.cssText = 'gap:6px; margin-bottom:6px;';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = mv;
        inp.placeholder = '동작 이름';
        inp.style.cssText = 'flex:1;';
        inp.oninput = ()=>{ item.movements[mIdx] = inp.value; };
        const del = document.createElement('button');
        del.type = 'button';
        del.title = '삭제';
        del.style.cssText = `width:34px; height:36px; ${ICON_BTN_DANGER_STYLE} border-radius:var(--radius);`;
        del.innerHTML = TRASH_ICON_SVG;
        del.onclick = ()=>{ item.movements.splice(mIdx, 1); renderMovements(); };
        row.appendChild(inp);
        row.appendChild(del);
        movementsList.appendChild(row);
      });
    }
    renderMovements();
    body.querySelector('.ed-add-movement').onclick = ()=>{ item.movements.push(''); renderMovements(); };
  }

  body.querySelector('.ed-delete').onclick = ()=>{
    if(!confirm(`"${item.name || '이 항목'}"을(를) 삭제할까요?`)) return;
    editorItems.splice(idx, 1);
    renderItemsEditor();
  };
  body.querySelector('.ed-move-up').onclick = ()=>{
    if(idx === 0) return;
    [editorItems[idx-1], editorItems[idx]] = [editorItems[idx], editorItems[idx-1]];
    renderItemsEditor();
  };
  body.querySelector('.ed-move-down').onclick = ()=>{
    if(idx === editorItems.length - 1) return;
    [editorItems[idx+1], editorItems[idx]] = [editorItems[idx], editorItems[idx+1]];
    renderItemsEditor();
  };

  return card;
}

function editorItemsToClean(){
  return editorItems.map(it=>{
    const clean = {
      section: (it.section || '').trim(),
      name: (it.name || '').trim(),
      type: it.type,
      prescribed: (it.prescribed || '').trim()
    };
    if(it.subsection && it.subsection.trim()) clean.subsection = it.subsection.trim();
    if(['amrap_by_round','weight_by_round','emom_by_round'].includes(it.type)) clean.rounds = parseInt(it.rounds) || 0;
    if(it.type === 'barbell_conditioning') clean.movements = (it.movements || []).map(m=>m.trim()).filter(Boolean);
    return clean;
  });
}

async function renderAdminProgramList(){
  const el = document.getElementById('admin-program-list');
  el.innerHTML = '<p class="muted">불러오고 있어요...</p>';
  const { data, error } = await sb.from('programs').select('date').order('date', { ascending: false });
  if(error){ el.innerHTML = `<p class="status err">${escapeHtml(error.message)}</p>`; return; }
  el.innerHTML = '';
  if(!data || data.length === 0){ el.innerHTML = '<p class="muted">등록된 프로그램이 없어요.</p>'; return; }

  const programDates = data.map(row=>row.date);
  const detailPanel = document.createElement('div');
  detailPanel.className = 'hidden';
  detailPanel.style.cssText = 'margin-top:12px; background:var(--surface-1); border:1px solid var(--border); border-radius:var(--radius); padding:14px 16px;';

  const picker = buildCalendarPicker({
    highlightedDates: programDates,
    initialDate: programDates[0],
    onSelect: (dateStr)=> showAdminProgramDetail(dateStr, detailPanel)
  });
  el.appendChild(picker.el);
  el.appendChild(detailPanel);
}

function showAdminProgramDetail(date, panel){
  panel.classList.remove('hidden');
  reveal(panel);
  panel.innerHTML = `
    <p class="mono" style="font-weight:500; font-size:16px; margin:0 0 10px;">${date}</p>
    <div class="row" style="gap:8px; margin-bottom:0;">
      <button type="button" id="admin-edit-date-btn" style="height:34px; font-size:15px; flex:1;">이 날짜 수정하기</button>
      <button type="button" id="admin-delete-date-btn" class="danger" style="height:34px; font-size:15px; flex:1;">삭제</button>
    </div>
  `;

  document.getElementById('admin-delete-date-btn').onclick = async ()=>{
    if(!confirm(`${date} 프로그램과 관련 기록을 모두 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return;
    await sb.from('records').delete().eq('date', date);
    await sb.from('programs').delete().eq('date', date);
    renderAdminProgramList();
  };

  document.getElementById('admin-edit-date-btn').onclick = async ()=>{
    const { data: program, error } = await sb.from('programs').select('*').eq('date', date).single();
    if(error || !program){ alert('프로그램을 불러오지 못했어요: ' + (error ? error.message : '')); return; }
    document.getElementById('admin-date').value = date;
    loadItemsIntoEditor(program.items || []);
  };
}
