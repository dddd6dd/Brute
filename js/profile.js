

async function renderProfileList(){
  fadeSwap(document.getElementById('profile-list'), document.getElementById('profile-detail'), document.getElementById('profile-item-detail'));
  const el = document.getElementById('profile-list');
  el.innerHTML = '<p class="muted">불러오고 있어요...</p>';
  const { data, error } = await sb.from('records').select('name');
  if(error){ el.innerHTML = `<p class="status err">${escapeHtml(error.message)}</p>`; return; }
  const privateNames = await getPrivateProfileNames();
  const names = [...new Set([...(data||[]).map(r=>r.name), ...privateNames])].sort();
  if(names.length === 0){ el.innerHTML = '<p class="muted">아직 기록이 없어요.</p>'; return; }
  el.innerHTML = '<p class="muted" style="margin-bottom:12px;">이름을 눌러 개인 기록을 확인해보세요.</p>';
  const wrap = document.createElement('div');
  names.forEach(n=>{
    const chip = document.createElement('span');
    chip.className = 'name-chip';
    chip.textContent = n;
    if(privateNames.has(n)){
      chip.style.cssText = 'display:inline-flex; align-items:center; gap:6px; color:var(--text-secondary);';
      const ic = document.createElement('span');
      ic.style.cssText = 'display:inline-flex; color:var(--text-muted);';
      ic.innerHTML = LOCK_ICON_SVG;
      chip.appendChild(ic);
    }
    chip.onclick = ()=> showProfileDetail(n);
    wrap.appendChild(chip);
  });
  el.appendChild(wrap);
}

let profileChartInstances = [];
let profileCurrentData = null;
let profileCurrentName = null;
let profileCurrentKeyLifts = [];
let profileCurrentSetting = null;

// ---------- 프로필 공개/비공개 ----------
// PIN 확인과 권한 판단은 전부 Supabase(DB 함수 + RLS)에서 해요. 브라우저는 PIN을 읽을 수 없고,
// 확인에 성공하면 받은 세션 토큰만 저장해서 요청 헤더(x-brute-tokens)에 실어 보내요.
function getProfileTokens(){
  try { return JSON.parse(localStorage.getItem('bruteProfileTokens') || '{}'); } catch(e){ return {}; }
}
function setProfileToken(name, token){
  const m = getProfileTokens();
  if(token) m[name] = token; else delete m[name];
  localStorage.setItem('bruteProfileTokens', JSON.stringify(m));
}
function isAdminUnlocked(){
  const p = document.getElementById('admin-panel');
  return !!sessionStorage.getItem('bruteAdminToken') && !!p && !p.classList.contains('hidden');
}
async function getProfileSetting(name){
  const { data, error } = await sb.from('profile_settings').select('name, is_private').eq('name', name).maybeSingle();
  if(error) return null;
  return data;
}
async function getPrivateProfileNames(){
  const { data, error } = await sb.from('profile_settings').select('name').eq('is_private', true);
  if(error) return new Set();
  return new Set((data||[]).map(r=>r.name));
}
async function canViewProfile(name, setting){
  if(!setting || !setting.is_private) return true;
  const { data, error } = await sb.rpc('can_access', { p_name: name });
  return !error && data === true;
}
function isWeakPin(p){ return /^(\d)\1*$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p); }
function pinErrorMessage(res){
  if(!res) return '확인에 실패했어요. 잠시 뒤에 다시 시도해주세요.';
  if(res.error === 'LOCKED') return 'PIN을 여러 번 틀려서 잠시 잠겼어요. 나중에 다시 시도해주세요.';
  if(res.error === 'WRONG_PIN') return `PIN이 맞지 않아요. (남은 기회 ${res.left}번)`;
  if(res.error === 'BAD_PIN') return 'PIN은 숫자 4~6자리로 입력해주세요.';
  if(res.error === 'WEAK_PIN') return '0000, 1234처럼 쉬운 번호는 쓸 수 없어요.';
  if(res.error === 'BAD_NAME') return '이 이름은 비공개로 설정할 수 없어요.';
  if(res.error === 'NO_ACCESS') return '권한이 없어요. PIN으로 먼저 열어주세요.';
  return '확인에 실패했어요.';
}

function renderLockedProfile(el, name){
  el.innerHTML = '';
  const back = document.createElement('span');
  back.className = 'back-link';
  back.textContent = '← 전체 명단으로';
  back.onclick = ()=> renderProfileList();
  el.appendChild(back);

  const box = document.createElement('div');
  box.className = 'card';
  box.style.cssText = 'display:flex; flex-direction:column; align-items:center; text-align:center; gap:6px; padding:32px 20px; margin-top:8px;';
  box.innerHTML = `
    <span style="${ICON_BTN_STYLE} width:44px; height:44px; margin-bottom:6px;">${LOCK_ICON_SVG}</span>
    <h2 style="font-size:20px; font-weight:500; margin:0;"></h2>
    <p class="muted" style="margin:0 0 14px;">비공개 프로필이에요.</p>
    <div class="row" style="justify-content:center; margin-bottom:0;">
      <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="PIN 4~6자리" style="width:120px; text-align:center; letter-spacing:0.3em;" />
      <button class="primary">열기</button>
    </div>
    <p class="status err" style="margin:8px 0 0; min-height:1.6em;"></p>`;
  box.querySelector('h2').textContent = name;
  const input = box.querySelector('input');
  const btn = box.querySelector('button');
  const status = box.querySelector('.status');
  const tryUnlock = async ()=>{
    btn.disabled = true;
    const { data, error } = await sb.rpc('profile_unlock', { p_name: name, p_pin: input.value.trim() });
    btn.disabled = false;
    if(!error && data && data.ok){
      setProfileToken(name, data.token);
      showProfileDetail(name);
      return;
    }
    if(data && data.error === 'NO_PIN'){ showProfileDetail(name); return; }
    status.textContent = error ? '확인에 실패했어요: ' + error.message : pinErrorMessage(data);
    input.value = '';
    input.focus();
  };
  btn.onclick = tryUnlock;
  input.onkeydown = (e)=>{ if(e.key === 'Enter') tryUnlock(); };
  el.appendChild(box);
}

function buildPrivacyPanel(name, setting){
  const panel = document.createElement('div');
  panel.className = 'card hidden';
  panel.style.marginBottom = '16px';
  const isPrivate = !!(setting && setting.is_private);
  if(isPrivate){
    panel.innerHTML = `
      <p style="margin:0 0 4px; font-weight:500;">지금 비공개 상태예요</p>
      <p class="muted" style="margin:0 0 12px;">PIN이 있어야 기록을 볼 수 있어요.</p>
      <div class="row" style="margin-bottom:0;">
        <button class="primary" data-act="public">공개로 바꾸기</button>
        <button data-act="relock">이 기기에서 잠그기</button>
        <button data-act="change-open">PIN 바꾸기</button>
        ${isAdminUnlocked() ? '<button class="danger" data-act="reset">PIN 초기화</button>' : ''}
      </div>
      <div class="pin-change-wrap hidden" style="margin-top:12px;">
        <div class="row" style="margin-bottom:0;">
          <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" class="pin-old" placeholder="지금 PIN" style="width:110px; text-align:center; letter-spacing:0.2em;" />
          <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" class="pin-new" placeholder="새 PIN" style="width:110px; text-align:center; letter-spacing:0.2em;" />
          <button class="primary" data-act="change">변경</button>
        </div>
      </div>
      <p class="status" style="margin:8px 0 0;"></p>`;
  } else {
    panel.innerHTML = `
      <p style="margin:0 0 4px; font-weight:500;">기록 비공개로 바꾸기</p>
      <p class="muted" style="margin:0 0 12px;">PIN 4~6자리를 정하면 PIN이 있어야 기록을 볼 수 있어요.</p>
      <div class="row" style="margin-bottom:0;">
        <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="PIN 4~6자리" style="width:120px; text-align:center; letter-spacing:0.3em;" />
        <button class="primary" data-act="private">비공개로 바꾸기</button>
      </div>
      <p class="status" style="margin:8px 0 0;"></p>`;
  }
  const status = panel.querySelector('.status');
  const fail = (msg)=>{ status.className = 'status err'; status.textContent = msg; };
  panel.querySelectorAll('button[data-act]').forEach(b=>{
    b.onclick = async ()=>{
      const act = b.dataset.act;
      if(act === 'private'){
        const pin = panel.querySelector('input').value.trim();
        if(!/^\d{4,6}$/.test(pin)){ fail('PIN은 숫자 4~6자리로 입력해주세요.'); return; }
        b.disabled = true;
        const { data, error } = await sb.rpc('profile_set_private', { p_name: name, p_pin: pin });
        b.disabled = false;
        if(error){ fail('저장에 실패했어요: ' + error.message); return; }
        if(!data || !data.ok){ fail(pinErrorMessage(data)); return; }
        setProfileToken(name, data.token);
        showProfileDetail(name);
      } else if(act === 'public'){
        if(!confirm('공개로 바꿀까요? 누구나 이 프로필을 볼 수 있게 돼요.')) return;
        b.disabled = true;
        const { data, error } = await sb.rpc('profile_set_public', { p_name: name });
        b.disabled = false;
        if(error){ fail('저장에 실패했어요: ' + error.message); return; }
        if(!data || !data.ok){ fail(pinErrorMessage(data)); return; }
        showProfileDetail(name);
      } else if(act === 'change-open'){
        const w = panel.querySelector('.pin-change-wrap');
        w.classList.toggle('hidden');
        if(!w.classList.contains('hidden')) w.querySelector('.pin-old').focus();
      } else if(act === 'change'){
        const oldPin = panel.querySelector('.pin-old').value.trim();
        const newPin = panel.querySelector('.pin-new').value.trim();
        if(!/^\d{4,6}$/.test(oldPin) || !/^\d{4,6}$/.test(newPin)){ fail('PIN은 숫자 4~6자리로 입력해주세요.'); return; }
        if(isWeakPin(newPin)){ fail(pinErrorMessage({ error: 'WEAK_PIN' })); return; }
        if(oldPin === newPin){ fail('새 PIN이 지금 PIN과 같아요.'); return; }
        b.disabled = true;
        const { data, error } = await sb.rpc('profile_change_pin', { p_name: name, p_old: oldPin, p_new: newPin });
        b.disabled = false;
        if(error){ fail('변경에 실패했어요: ' + error.message); return; }
        if(!data || !data.ok){ fail(pinErrorMessage(data)); return; }
        setProfileToken(name, data.token);
        status.className = 'status ok';
        status.textContent = 'PIN을 바꿨어요. 다른 기기는 새 PIN으로 다시 열어야 해요.';
        panel.querySelector('.pin-old').value = '';
        panel.querySelector('.pin-new').value = '';
        panel.querySelector('.pin-change-wrap').classList.add('hidden');
      } else if(act === 'relock'){
        const token = getProfileTokens()[name];
        if(token) await sb.rpc('brute_logout', { p_token: token });
        setProfileToken(name, null);
        showProfileDetail(name);
      } else if(act === 'reset'){
        if(!confirm(`${name}님의 PIN을 초기화하고 공개로 바꿀까요?`)) return;
        const { data, error } = await sb.rpc('admin_reset_profile', { p_name: name });
        if(error){ fail('초기화에 실패했어요: ' + error.message); return; }
        if(!data || !data.ok){ fail(pinErrorMessage(data)); return; }
        showProfileDetail(name);
      }
    };
  });
  return panel;
}

async function showProfileDetail(name){
  const el = document.getElementById('profile-detail');
  fadeSwap(el, document.getElementById('profile-list'), document.getElementById('profile-item-detail'));
  el.innerHTML = '<p class="muted">불러오고 있어요...</p>';

  const setting = await getProfileSetting(name);
  profileCurrentSetting = setting;
  if(!(await canViewProfile(name, setting))){ renderLockedProfile(el, name); return; }

  const { data, error } = await sb.from('records').select('*').eq('name', name).order('date', { ascending: true });
  if(error){ el.innerHTML = `<p class="status err">${escapeHtml(error.message)}</p>`; return; }
  if(!data || data.length === 0){ el.innerHTML = '<p class="muted">기록이 없어요.</p>'; return; }

  const { data: keyLiftsData } = await sb.from('key_lifts').select('*').eq('name', name).order('lift_name', { ascending: true });

  profileCurrentData = data;
  profileCurrentName = name;
  profileCurrentKeyLifts = keyLiftsData || [];
  renderProfileBody(getPreferredUnit());
}

function renderProfileBody(unit){
  const el = document.getElementById('profile-detail');
  const data = profileCurrentData;
  const name = profileCurrentName;

  profileChartInstances.forEach(c=>c.destroy());
  profileChartInstances = [];

  el.innerHTML = '';
  const back = document.createElement('span');
  back.className = 'back-link';
  back.textContent = '← 전체 명단으로';
  back.onclick = ()=> renderProfileList();
  el.appendChild(back);

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin:8px 0 16px;';
  const title = document.createElement('h2');
  title.style.cssText = 'font-size:20px; font-weight:500; margin:0;';
  title.textContent = name;
  const unitWrap = document.createElement('div');
  unitWrap.innerHTML = `<select id="profile-unit-select" style="width:80px;">
      <option value="lb" ${unit==='lb'?'selected':''}>lb</option>
      <option value="kg" ${unit==='kg'?'selected':''}>kg</option>
    </select>`;
  const isPrivate = !!(profileCurrentSetting && profileCurrentSetting.is_private);
  const privacyBtn = document.createElement('button');
  privacyBtn.title = isPrivate ? '비공개 프로필' : '공개 프로필';
  privacyBtn.setAttribute('aria-label', privacyBtn.title);
  privacyBtn.style.cssText = `${ICON_BTN_STYLE} width:36px; height:36px;`;
  privacyBtn.innerHTML = isPrivate ? LOCK_ICON_SVG : UNLOCK_ICON_SVG;
  unitWrap.style.cssText = 'display:flex; align-items:center; gap:8px;';
  unitWrap.insertBefore(privacyBtn, unitWrap.firstChild);
  if(isPrivate){
    const lockMark = document.createElement('span');
    lockMark.className = 'tag';
    lockMark.style.cssText = 'background:var(--surface-1); color:var(--text-secondary); border:1px solid var(--border); margin-left:8px; vertical-align:middle;';
    lockMark.textContent = '비공개';
    title.appendChild(lockMark);
  }
  titleRow.appendChild(title);
  titleRow.appendChild(unitWrap);
  el.appendChild(titleRow);

  const privacyPanel = buildPrivacyPanel(name, profileCurrentSetting);
  el.appendChild(privacyPanel);
  privacyBtn.onclick = ()=> revealToggle(privacyPanel, privacyPanel.classList.contains('hidden'));

  document.getElementById('profile-unit-select').onchange = (e)=>{
    setPreferredUnit(e.target.value);
    renderProfileBody(e.target.value);
  };

  // ---------- 주요 리프트 기록 ----------
  const keyLiftsBox = document.createElement('div');
  keyLiftsBox.style.cssText = 'background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px; margin-bottom:20px; box-shadow:var(--card-shadow);';
  const kEyebrow = document.createElement('p');
  kEyebrow.className = 'eyebrow';
  kEyebrow.textContent = 'PERFORMANCE';
  const kTitle = document.createElement('h3');
  kTitle.style.cssText = 'font-size:18px; font-weight:500; margin:0 0 12px;';
  kTitle.textContent = '주요 리프트 기록';
  keyLiftsBox.appendChild(kTitle);

  const defaultLiftNames = ['백스쿼트','프론트스쿼트','데드리프트','숄더프레스','클린','스내치'];
  const existingNames = profileCurrentKeyLifts.map(k=>k.lift_name);
  const allLiftNames = [...new Set([...defaultLiftNames, ...existingNames])];

  const kGrid = document.createElement('div');
  kGrid.style.cssText = 'display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;';

  // 타일을 누르면 아래 상세 패널에서 기록추가/그래프/삭제를 할 수 있어요
  const liftDetailPanel = document.createElement('div');
  liftDetailPanel.className = 'hidden';
  liftDetailPanel.style.cssText = 'margin-top:12px; background:var(--surface-1); border:1px solid var(--border); border-radius:var(--radius-lg); padding:14px 16px;';

  function renderLiftDetail(liftName){
    const found = profileCurrentKeyLifts.find(k=>k.lift_name === liftName);
    if(keyLiftChartInstances['panel']){ keyLiftChartInstances['panel'].destroy(); delete keyLiftChartInstances['panel']; }
    liftDetailPanel.classList.remove('hidden');
    reveal(liftDetailPanel);
    liftDetailPanel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:8px;">
        <span style="font-weight:500; font-size:17px;">${liftName}</span>
        <span class="mono" style="font-size:19px; font-weight:500;">${found ? formatWeight(found.value_kg, unit) : '기록 없음'}</span>
      </div>
      <div class="row" style="gap:8px; margin-bottom:0;">
        <button type="button" id="lift-detail-add" title="기록 추가" aria-label="기록 추가" style="height:36px; flex:1; ${ICON_BTN_STYLE} border-radius:var(--radius);">${PLUS_ICON_SVG}</button>
        ${found ? `<button type="button" id="lift-detail-graph" title="그래프 보기" aria-label="그래프 보기" style="height:36px; flex:1; ${ICON_BTN_STYLE} border-radius:var(--radius);">${CHART_ICON_SVG}</button>` : ''}
        ${found ? `<button type="button" id="lift-detail-del" title="삭제" aria-label="삭제" style="height:36px; flex:1; ${ICON_BTN_DANGER_STYLE} border-radius:var(--radius);">${TRASH_ICON_SVG}</button>` : ''}
      </div>
      <div class="key-lift-chart-wrap hidden" style="position:relative; width:100%; height:180px; margin-top:12px;">
        <canvas id="key-lift-chart-panel" role="img" aria-label="${liftName} 기록 추이 그래프"></canvas>
      </div>
    `;
    liftDetailPanel.querySelector('#lift-detail-add').onclick = ()=> editKeyLift(name, liftName, found, unit);
    const graphBtn = liftDetailPanel.querySelector('#lift-detail-graph');
    if(graphBtn) graphBtn.onclick = ()=> toggleKeyLiftGraph(name, liftName, 'panel', unit, liftDetailPanel);
    const delBtn = liftDetailPanel.querySelector('#lift-detail-del');
    if(delBtn) delBtn.onclick = ()=> clearKeyLift(name, liftName, found);

    kGrid.querySelectorAll('[data-lift]').forEach(t=>{
      t.style.boxShadow = t.dataset.lift === liftName ? 'inset 0 0 0 2px var(--text-primary)' : 'none';
    });
  }

  allLiftNames.forEach((liftName)=>{
    const found = profileCurrentKeyLifts.find(k=>k.lift_name === liftName);
    const tile = document.createElement('div');
    tile.dataset.lift = liftName;
    tile.style.cssText = 'background:var(--surface-1); border:1px solid var(--border); border-radius:var(--radius); padding:8px 10px; cursor:pointer; min-width:0;';
    tile.innerHTML = `
      <p class="muted" style="margin:0 0 2px; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${liftName}</p>
      <p class="mono" style="font-weight:500; font-size:16px; margin:0; white-space:nowrap;">${found ? formatWeight(found.value_kg, unit) : '—'}</p>
    `;
    tile.onclick = ()=> renderLiftDetail(liftName);
    kGrid.appendChild(tile);
  });
  keyLiftsBox.appendChild(kGrid);
  keyLiftsBox.appendChild(liftDetailPanel);

  const addLiftToggleBtn = document.createElement('button');
  addLiftToggleBtn.textContent = '종목 추가';
  addLiftToggleBtn.style.cssText = 'margin-top:12px; width:100%; height:38px; font-size:15px;';
  keyLiftsBox.appendChild(addLiftToggleBtn);

  const addLiftForm = document.createElement('div');
  addLiftForm.className = 'hidden';
  addLiftForm.style.cssText = 'margin-top:10px; background:var(--surface-1); border:1px solid var(--border); border-radius:var(--radius); padding:12px;';
  addLiftForm.innerHTML = `
    <input type="text" id="new-lift-name" placeholder="종목 이름 (예: 벤치프레스)" style="width:100%; margin-bottom:8px;" />
    <div class="row" style="margin-bottom:8px;">
      <input type="number" step="0.1" id="new-lift-value" placeholder="무게" style="width:100px;" />
      <select id="new-lift-unit" style="width:80px;">
        <option value="lb" ${unit==='lb'?'selected':''}>lb</option>
        <option value="kg" ${unit==='kg'?'selected':''}>kg</option>
      </select>
      <input type="date" id="new-lift-date" style="width:150px;" />
    </div>
    <div class="row" style="margin-bottom:0;">
      <button type="button" id="new-lift-save-btn" class="primary" style="height:34px; font-size:15px; flex:1;">저장</button>
      <button type="button" id="new-lift-cancel-btn" style="height:34px; font-size:15px; flex:1;">취소</button>
    </div>
  `;
  keyLiftsBox.appendChild(addLiftForm);
  el.appendChild(keyLiftsBox);

  addLiftToggleBtn.onclick = ()=>{
    const willShow = addLiftForm.classList.contains('hidden');
    revealToggle(addLiftForm, willShow);
    if(willShow){
      addLiftForm.querySelector('#new-lift-date').value = todayStr();
      addLiftForm.querySelector('#new-lift-name').focus();
    }
  };
  addLiftForm.querySelector('#new-lift-cancel-btn').onclick = ()=> addLiftForm.classList.add('hidden');
  addLiftForm.querySelector('#new-lift-save-btn').onclick = async ()=>{
    const newName = addLiftForm.querySelector('#new-lift-name').value.trim();
    const rawValue = addLiftForm.querySelector('#new-lift-value').value;
    const valUnit = addLiftForm.querySelector('#new-lift-unit').value;
    const recordedDate = addLiftForm.querySelector('#new-lift-date').value || todayStr();
    if(!newName){ alert('종목 이름을 입력해주세요'); return; }
    const num = parseFloat(rawValue);
    if(isNaN(num)){ alert('무게를 입력해주세요'); return; }
    const kgValue = Math.round(toKg(num, valUnit) * 100) / 100;
    setPreferredUnit(valUnit);
    const ok = await saveKeyLiftValue(name, newName, kgValue, recordedDate);
    if(ok) showProfileDetail(name);
  };

  // ---------- 날짜별 기록 보기 ----------
  el.appendChild(buildDateLookupBox(data, unit));

  // ---------- 기록 검색 ----------
  const searchBox = document.createElement('div');
  searchBox.style.marginBottom = '16px';
  searchBox.innerHTML = `<input type="text" id="profile-search" placeholder="동작 검색" aria-label="동작 검색" style="width:100%;" />`;
  el.appendChild(searchBox);
  document.getElementById('profile-search').oninput = (e)=>{
    filterProfileItemSections(e.target.value.trim().toLowerCase());
  };

  const itemsContainer = document.createElement('div');
  itemsContainer.id = 'profile-items-container';
  el.appendChild(itemsContainer);

  const byItem = {};
  data.forEach(r=>{
    const k = String(r.item_name).replace(/ - \d+R$/, '');
    if(!byItem[k]) byItem[k] = [];
    byItem[k].push(r);
  });

  // 항목을 section별로 묶어서 보여준다 (섹션은 그 항목의 가장 최근 기록 기준).
  const bySection = {};
  const sectionOrder = [];
  Object.entries(byItem).forEach(([itemName, records])=>{
    const sec = normSec(records[records.length - 1].section) || '기타';
    if(!bySection[sec]){ bySection[sec] = []; sectionOrder.push(sec); }
    bySection[sec].push([itemName, records]);
  });

  sectionOrder.forEach((sectionName, sIdx)=>{
    const sectionGroup = document.createElement('div');
    sectionGroup.className = 'profile-section-group';
    sectionGroup.style.marginBottom = '20px';

    const sEyebrow = document.createElement('p');
    sEyebrow.className = 'eyebrow';
    sEyebrow.textContent = `SECTION ${String(sIdx + 1).padStart(2, '0')}`;
    const sTitle = document.createElement('h3');
    sTitle.style.cssText = 'font-size:17px; font-weight:500; margin:0 0 10px;';
    sTitle.textContent = sectionName;
    sectionGroup.appendChild(sTitle);

    bySection[sectionName].forEach(([itemName, records])=>{
      const itemCard = document.createElement('div');
      itemCard.className = 'card';
      itemCard.style.cssText = 'margin-bottom:10px; cursor:pointer;';
      itemCard.dataset.itemName = itemName.toLowerCase();

      const header = document.createElement('div');
      header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px;';
      header.innerHTML = `<span class="item-name">${escapeHtml(itemName)}</span>
        <span style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
          <span class="muted">${new Set(records.map(r => r.date)).size}회 기록</span>
          <span class="muted" style="display:flex;">${CHEVRON_ICON_SVG}</span>
        </span>`;
      itemCard.appendChild(header);

      const mains = records.filter(r => r.item_name === itemName);
      const shown = mains.length ? mains : records;
      const isWeightType = shown.some(r => r.type === 'weight');
      const numericRecords = shown.filter(r => !r.skipped && (r.type === 'weight' || r.type === 'reps'));
      const isNumeric = numericRecords.length > 0;
      const rmOf = r => { const pd = parsePersonalDetail(r); return pd && pd.rm != null ? String(pd.rm) : ''; };
      const rmBest = {};
      let latestRm = '';
      shown.forEach(r=>{
        if(r.skipped || r.type !== 'weight') return;
        const k = rmOf(r);
        if(!k) return;
        latestRm = k;
        const v = parseFloat(r.value);
        if(!isNaN(v) && (rmBest[k] == null || v > rmBest[k])) rmBest[k] = v;
      });
      const rmKeys = Object.keys(rmBest).sort((a, b) => (a === 'S' ? 99 : +a) - (b === 'S' ? 99 : +b));
      const openDetail = k => {
        const list = k ? shown.filter(r => rmOf(r) === k) : shown;
        showProfileItemDetail(profileCurrentName, itemName, list, isWeightType, isNumeric);
      };
      itemCard.onclick = ()=> openDetail(rmKeys.length > 1 ? latestRm : '');
      if(rmKeys.length){
        const rmLine = document.createElement('div');
        rmLine.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; margin:0 0 8px;';
        const chip = (label, val, k)=>{
          const b = document.createElement('button');
          b.type = 'button';
          b.style.cssText = 'height:auto; font-size:13px; font-weight:400; padding:2px 8px; border-radius:999px; background:var(--surface-1); border:0.5px solid var(--border); box-shadow:none;';
          b.innerHTML = '<span class="muted">' + label + '</span>' + (val ? ' <strong style="font-weight:600;">' + val + '</strong>' : '');
          b.onclick = e => { e.stopPropagation(); openDetail(k); };
          rmLine.appendChild(b);
        };
        rmKeys.forEach(k => chip(rmLabel(k), formatWeight(rmBest[k], unit), k));
        if(rmKeys.length > 1) chip('전체 보기', '', '');
        itemCard.appendChild(rmLine);
      }

      const fmtR = r => r.type === 'weight' ? fmtWeightRec(r, unit) : escapeHtml(r.value);
      const roundNo = r => { const m = String(r.item_name).match(/ - (\d+)R$/); return m ? +m[1] : 0; };
      const recentList = document.createElement('div');
      recentList.style.marginBottom = '10px';
      const dates = [...new Set(records.map(r => r.date))].sort().reverse().slice(0, 3);
      dates.forEach(d=>{
        const dayMain = mains.filter(r => r.date === d);
        const r = dayMain[dayMain.length - 1];
        const rounds = records.filter(x => x.date === d && x.item_name !== itemName).sort((a, b) => roundNo(a) - roundNo(b));
        const roundText = rounds.filter(x => !x.skipped).map(x => '<span class="muted">' + roundNo(x) + 'R</span> ' + fmtR(x)).join(' · ');
        const line = document.createElement('div');
        line.style.cssText = 'font-size:15px; margin-bottom:6px;';
        if(r && r.skipped){
          line.style.color = 'var(--text-muted)';
          const rs = String(r.scale_detail || '').replace(/^생략:\s*/, '');
          line.innerHTML = '<span class="muted">' + d + '</span> — 생략' + (rs && rs !== '생략함' ? ' · ' + escapeHtml(rs) : '');
        } else if(r){
          const detailTag = personalDetailHtml(r, unit) ?? (r.scaled && r.scale_detail ? '<div style="margin-top:4px;"><span class="tag scaled" style="white-space:normal;">※ ' + escapeHtml(r.scale_detail) + '</span></div>' : '');
          line.innerHTML = '<span class="muted">' + d + '</span> — <strong style="font-weight:500;">' + fmtR(r) + '</strong>'
            + (roundText ? '<div style="font-size:13px; margin-top:2px;">' + roundText + '</div>' : '') + detailTag;
        } else {
          line.innerHTML = '<span class="muted">' + d + '</span> — <span style="font-size:14px;">' + roundText + '</span>';
        }
        recentList.appendChild(line);
      });
      itemCard.appendChild(recentList);

      sectionGroup.appendChild(itemCard);
    });

    itemsContainer.appendChild(sectionGroup);
  });
}

function showProfileItemDetail(name, itemName, records, isWeightType, isNumeric){
  const el = document.getElementById('profile-item-detail');
  fadeSwap(el, document.getElementById('profile-list'), document.getElementById('profile-detail'));
  el.innerHTML = '';

  const unit = getPreferredUnit();

  const back = document.createElement('span');
  back.className = 'back-link';
  back.textContent = `← ${name} 프로필로`;
  back.onclick = ()=>{ el.classList.add('hidden'); showProfileDetail(name); };
  el.appendChild(back);

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin:8px 0 16px;';
  titleRow.innerHTML = `<h2 style="font-size:20px; font-weight:500; margin:0;">${escapeHtml(itemName)}</h2><span class="muted">${records.length}회 기록</span>`;
  el.appendChild(titleRow);

  if(isNumeric){
    const graphToggleBtn = document.createElement('button');
    graphToggleBtn.textContent = '그래프 보기';
    graphToggleBtn.style.cssText = 'height:32px; font-size:15px; margin-bottom:12px;';
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'hidden';
    canvasWrap.style.cssText = 'position:relative; width:100%; height:220px; margin-bottom:16px;';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label', `${itemName} 기록 추이 그래프`);
    canvasWrap.appendChild(canvas);

    let chartInstance = null;
    graphToggleBtn.onclick = ()=>{
      const isHidden = canvasWrap.classList.contains('hidden');
      if(!isHidden){
        canvasWrap.classList.add('hidden');
        graphToggleBtn.textContent = '그래프 보기';
        if(chartInstance){ chartInstance.destroy(); chartInstance = null; }
        return;
      }
      canvasWrap.classList.remove('hidden');
      reveal(canvasWrap);
      graphToggleBtn.textContent = '그래프 숨기기';

      const numericRecords = records.filter(r => !r.skipped && (r.type === 'weight' || r.type === 'reps'));
      const chartData = numericRecords.map(r=>{
        const raw = parseFloat(r.value) || 0;
        const v = isWeightType ? fromKg(raw, unit) : raw;
        return Math.round(v * 10) / 10;
      });

      chartInstance = buildGlassLineChart(canvas, {
        labels: numericRecords.map(r=>r.date),
        data: chartData,
        label: itemName,
        suffix: isWeightType ? unit : ''
      });
    };
    el.appendChild(graphToggleBtn);
    el.appendChild(canvasWrap);
  }

  const list = document.createElement('div');
  records.slice().reverse().forEach(r=>{
    const line = document.createElement('div');
    line.style.cssText = 'font-size:15px; margin-bottom:4px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px;';

    const textSpan = document.createElement('span');
    if(r.skipped){
      textSpan.style.color = 'var(--text-muted)';
      textSpan.innerHTML = `<span class="muted">${r.date}</span> — 생략${r.scale_detail ? ' ('+escapeHtml(r.scale_detail.replace('생략: ',''))+')' : ''}`;
    } else {
      const detailTag = personalDetailHtml(r, unit) ?? (r.scaled ? `<div style="margin-top:4px;"><span class="tag scaled">※${r.scale_detail ? ' '+escapeHtml(r.scale_detail) : ''}</span></div>` : '');
      const displayValue = r.type === 'weight' ? formatWeight(parseFloat(r.value) || 0, unit) : r.value;
      textSpan.innerHTML = `<span class="muted">${r.date}</span> — <strong style="font-weight:500;">${escapeHtml(displayValue)}</strong>${detailTag}`;
    }

    const editBtn = document.createElement('button');
    editBtn.title = '수정'; editBtn.setAttribute('aria-label', '수정');
    editBtn.style.cssText = `width:28px; height:28px; ${ICON_BTN_STYLE} border-radius:var(--radius); flex-shrink:0;`;
    editBtn.innerHTML = PENCIL_ICON_SVG;
    editBtn.onclick = ()=> startEditRecord(r, line, textSpan, unit, ()=> showProfileItemDetail(name, itemName, records, isWeightType, isNumeric), ()=>{
      const updated = records.filter(rec => rec.id !== r.id);
      if(updated.length === 0){ showProfileDetail(name); } else { showProfileItemDetail(name, itemName, updated, isWeightType, isNumeric); }
    });

    line.appendChild(textSpan);
    line.appendChild(editBtn);
    list.appendChild(line);
  });
  el.appendChild(list);
}

function buildDateLookupBox(records, unit){
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px; margin-bottom:20px; box-shadow:var(--card-shadow);';

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:8px;';
  const titleCol = document.createElement('div');
  const dateEyebrow = document.createElement('p');
  dateEyebrow.className = 'eyebrow';
  dateEyebrow.textContent = 'CALENDAR';
  const title = document.createElement('h3');
  title.style.cssText = 'font-size:18px; font-weight:500; margin:0;';
  title.textContent = '날짜별 기록 보기';
  titleCol.appendChild(title);
  titleRow.appendChild(titleCol);

  let dateEditMode = false;
  const editToggleBtn = document.createElement('button');
  editToggleBtn.type = 'button';
  editToggleBtn.title = '기록 수정하기';
  editToggleBtn.setAttribute('aria-label', '기록 수정하기');
  editToggleBtn.style.cssText = `width:32px; height:32px; flex-shrink:0; margin-top:2px; ${ICON_BTN_STYLE} border-radius:var(--radius);`;
  editToggleBtn.innerHTML = PENCIL_ICON_SVG;
  titleRow.appendChild(editToggleBtn);
  box.appendChild(titleRow);

  const resultEl = document.createElement('div');

  const uniqueDates = [...new Set(records.map(r=>r.date))].sort().reverse();
  let selectedDate = uniqueDates[0] || null;

  editToggleBtn.onclick = ()=>{
    dateEditMode = !dateEditMode;
    editToggleBtn.style.background = dateEditMode ? 'var(--text-primary)' : 'var(--surface-1)';
    editToggleBtn.style.color = dateEditMode ? 'var(--surface-0)' : 'var(--text-muted)';
    if(selectedDate) renderForDate(selectedDate);
  };

  // ---------- 훈련 캘린더 ----------
  const calendarPicker = buildCalendarPicker({
    highlightedDates: uniqueDates,
    initialDate: uniqueDates[0] || null,
    selectedDate,
    onSelect: (dateStr)=>{ selectedDate = dateStr; renderForDate(dateStr); },
    summaryLabel: (count)=> count > 0 ? `이 달에 ${count}일 훈련했어요` : '이 달에는 기록이 없어요'
  });
  calendarPicker.el.style.marginBottom = '16px';
  box.appendChild(calendarPicker.el);
  box.appendChild(resultEl);

  async function renderForDate(date){
    resultEl.innerHTML = '<p class="muted" style="font-size:15px;">불러오고 있어요...</p>';
    const dayRecords = records.filter(r=>r.date === date);
    if(dayRecords.length === 0){
      resultEl.innerHTML = '<p class="muted" style="font-size:15px;">이 날짜에는 기록이 없어요.</p>';
      return;
    }

    const { data: program } = await sb.from('programs').select('*').eq('date', date).single();

    // 프로그램에 등록된 순서(섹션/항목) 기준으로 정렬 기준을 만든다
    const itemOrder = [];
    if(program && program.items){
      program.items.forEach(it=>{
        if(it.type === 'barbell_conditioning' && it.movements){
          it.movements.forEach(m=> itemOrder.push({ key: `${it.name} - ${m}`, section: it.section, roundGroup: it.name, item: it }));
        } else if((it.type === 'amrap_by_round' || it.type === 'weight_by_round' || it.type === 'emom_by_round') && it.rounds){
          const totalRounds = parseInt(it.rounds);
          for(let r = 1; r <= totalRounds; r++){
            itemOrder.push({ key: `${it.name} - ${r}R`, section: it.section, roundGroup: it.name, isLastRound: r === totalRounds, item: it });
          }
        } else if(it.type === 'for_time' && repeatSetsCount(it)){
          const n = repeatSetsCount(it);
          for(let r = 1; r <= n; r++) itemOrder.push({ key: `${it.name} - ${r}R`, section: it.section, roundGroup: it.name, item: it });
          itemOrder.push({ key: it.name, section: it.section, roundGroup: it.name, item: it });
        } else {
          itemOrder.push({ key: it.name, section: it.section, item: it });
        }
      });
    }
    // 프로그램에는 없지만 기록에만 있는 항목(자유 추가된 동작명 등)은 발견 순서대로 뒤에 붙인다
    const seenKeys = new Set(itemOrder.map(io=>io.key));
    dayRecords.forEach(r=>{
      if(!seenKeys.has(r.item_name)){
        itemOrder.push({ key: r.item_name, section: r.section });
        seenKeys.add(r.item_name);
      }
    });

    const byItemName = {};
    dayRecords.forEach(r=>{
      if(!byItemName[r.item_name]) byItemName[r.item_name] = [];
      byItemName[r.item_name].push(r);
    });

    // 섹션 등장 순서(첫 등장 기준)를 뽑는다
    const sectionOrder = [];
    itemOrder.forEach(io=>{
      const sec = normSec(io.section) || '기타';
      if(!sectionOrder.includes(sec)) sectionOrder.push(sec);
    });

    resultEl.innerHTML = '';
    const fmtVal = r => r.type === 'weight' ? fmtWeightRec(r, unit)
      : ((r.type === 'for_time' && /^0+:0+$/.test(String(r.value))) ? '완료' : escapeHtml(r.value));
    const skipReason = r => { const d = String(r.scale_detail || '').replace(/^생략:\s*/, ''); return d && d !== '생략함' ? d : ''; };
    const noteHtml = r => {
      if(r.skipped) return '';
      const pd = personalDetailHtml(r, unit);
      if(pd != null) return pd;
      return (r.scaled && r.scale_detail) ? '<div style="margin-top:6px;"><span class="tag scaled" style="white-space:normal;">※ ' + escapeHtml(r.scale_detail) + '</span></div>' : '';
    };

    const editButtons = (r, line, textSpan)=>{
      const editBtn = document.createElement('button');
      editBtn.textContent = '수정';
      editBtn.style.cssText = 'height:28px; font-size:14px; padding:0 10px; flex-shrink:0;';
      editBtn.onclick = ()=> startEditRecord(r, line, textSpan, unit, ()=> renderForDate(date), ()=>{
        const idx = records.indexOf(r);
        if(idx !== -1) records.splice(idx, 1);
        renderForDate(date);
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '삭제';
      deleteBtn.className = 'danger';
      deleteBtn.style.cssText = 'height:28px; font-size:14px; padding:0 10px; flex-shrink:0;';
      deleteBtn.onclick = async ()=>{
        if(!confirm(r.item_name + ' 기록을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
        const { error } = await sb.from('records').delete().eq('id', r.id);
        if(error){ alert('삭제에 실패했어요: ' + error.message); return; }
        const idx = records.indexOf(r);
        if(idx !== -1) records.splice(idx, 1);
        renderForDate(date);
      };
      const g = document.createElement('div');
      g.style.cssText = 'display:flex; gap:6px; flex-shrink:0;';
      g.appendChild(editBtn);
      g.appendChild(deleteBtn);
      return g;
    };

    sectionOrder.forEach(sectionName=>{
      const isWarm = io => io.item && /warm\s*-?\s*up/i.test(normSec(io.section));
      const itemsInSection = itemOrder.filter(io => (normSec(io.section) || '기타') === sectionName && ((byItemName[io.key] && byItemName[io.key].length > 0) || isWarm(io)));
      if(itemsInSection.length === 0) return;

      const sectionBox = document.createElement('div');
      sectionBox.style.cssText = 'margin-top:18px;';
      const sTitle = document.createElement('p');
      sTitle.className = 'eyebrow';
      sTitle.style.cssText = 'margin:0 0 4px;';
      sTitle.textContent = stripLabelPrefix(sectionName).toUpperCase();
      sectionBox.appendChild(sTitle);

      // 같은 항목(라운드별·바벨 동작)은 한 블록으로 묶는다
      const groups = [];
      itemsInSection.forEach(io=>{
        const gName = io.roundGroup || io.key;
        let g = groups.find(x => x.name === gName);
        if(!g){ g = { name: gName, item: io.item, rows: [] }; groups.push(g); }
        (byItemName[io.key] || []).forEach(r => g.rows.push({ r, label: io.roundGroup ? (io.key === io.roundGroup ? '총' : io.key.slice(io.roundGroup.length + 3)) : '' }));
      });

      groups.forEach(g=>{
        const block = document.createElement('div');
        block.style.cssText = 'padding:12px 0; border-top:0.5px solid var(--border);';
        const allSkipped = g.rows.length > 0 && g.rows.every(x => x.r.skipped);
        const single = g.rows.length === 1 && !g.rows[0].label;

        const head = document.createElement('div');
        head.style.cssText = 'display:flex; align-items:baseline; gap:10px;';
        const nameEl = document.createElement('span');
        nameEl.style.cssText = 'flex:1; min-width:0; font-size:15px; font-weight:500;' + (allSkipped ? ' color:var(--text-muted);' : '');
        nameEl.textContent = g.name;
        head.appendChild(nameEl);
        block.appendChild(head);

        const addRow = (x, container, inline)=>{
          const r = x.r;
          const line = document.createElement('div');
          line.style.cssText = inline ? 'display:flex; align-items:baseline; gap:8px; flex-shrink:0;' : 'display:flex; align-items:baseline; gap:10px; font-size:14px; margin-top:4px;';
          const textSpan = document.createElement('span');
          textSpan.style.cssText = inline ? 'text-align:right;' : 'flex:1; min-width:0; display:flex; gap:12px;';
          const val = r.skipped
            ? '<span style="color:var(--text-muted); font-weight:400;">생략' + (skipReason(r) ? ' · ' + escapeHtml(skipReason(r)) : '') + '</span>'
            : '<strong style="font-weight:600;">' + fmtVal(r) + '</strong>';
          textSpan.innerHTML = inline ? val : '<span style="color:var(--text-muted); min-width:44px;">' + escapeHtml(x.label) + '</span>' + val;
          line.appendChild(textSpan);
          if(dateEditMode) line.appendChild(editButtons(r, line, textSpan));
          container.appendChild(line);
        };

        if(single){
          addRow(g.rows[0], head, true);
        } else {
          g.rows.forEach(x => addRow(x, block, false));
        }
        if(g.item && g.item.prescribed){
          const pres = document.createElement('div');
          pres.style.cssText = 'margin-top:6px; font-size:14px; line-height:1.55;' + (allSkipped ? ' opacity:0.6;' : '');
          pres.innerHTML = formatPrescribed(g.item.prescribed);
          block.appendChild(pres);
        }
        const notes = g.rows.map(x => noteHtml(x.r)).filter(Boolean).join('');
        if(notes){ const n = document.createElement('div'); n.innerHTML = notes; block.appendChild(n); }
        sectionBox.appendChild(block);
      });
      resultEl.appendChild(sectionBox);
    });

  }

  if(selectedDate){
    renderForDate(selectedDate);
  } else {
    resultEl.innerHTML = '<p class="muted" style="font-size:15px;">아직 기록이 없어요.</p>';
  }

  return box;
}

function filterProfileItemSections(query){
  const container = document.getElementById('profile-items-container');
  if(!container) return;
  const items = container.querySelectorAll('[data-item-name]');
  items.forEach(item=>{
    const match = !query || item.dataset.itemName.includes(query);
    item.style.display = match ? '' : 'none';
  });
  container.querySelectorAll('.profile-section-group').forEach(group=>{
    const hasVisibleItem = !!group.querySelector('[data-item-name]:not([style*="display: none"])');
    group.style.display = hasVisibleItem ? '' : 'none';
  });
}

let keyLiftChartInstances = {};
async function toggleKeyLiftGraph(name, liftName, kIdx, unit, cardEl){
  const wrap = cardEl.querySelector('.key-lift-chart-wrap');
  const isHidden = wrap.classList.contains('hidden');
  if(!isHidden){
    wrap.classList.add('hidden');
    if(keyLiftChartInstances[kIdx]){ keyLiftChartInstances[kIdx].destroy(); delete keyLiftChartInstances[kIdx]; }
    return;
  }
  wrap.classList.remove('hidden');
  reveal(wrap);

  const { data, error } = await sb.from('key_lift_history')
    .select('*').eq('name', name).eq('lift_name', liftName)
    .order('recorded_date', { ascending: true });
  if(error || !data || data.length === 0){
    wrap.innerHTML = '<p class="muted" style="font-size:14px;">아직 이력이 없어요.</p>';
    return;
  }

  const canvas = document.getElementById(`key-lift-chart-${kIdx}`);
  if(!canvas) return;
  if(keyLiftChartInstances[kIdx]) keyLiftChartInstances[kIdx].destroy();

  const chartData = data.map(r=> Math.round(fromKg(r.value_kg, unit) * 10) / 10);
  const isPR = data.map((r,i)=> i === 0 || r.value_kg >= Math.max(...data.slice(0,i).map(d=>d.value_kg)));

  keyLiftChartInstances[kIdx] = buildGlassLineChart(canvas, {
    labels: data.map(r=>r.recorded_date),
    data: chartData,
    label: liftName,
    suffix: unit,
    highlights: isPR,
    tooltipLabel: (ctx)=> `${round1(ctx.parsed.y)}${unit}${isPR[ctx.dataIndex] ? '  · PR' : ''}`
  });
}

async function clearKeyLift(name, liftName, existing){
  if(!existing){ return; }
  if(!confirm(`${liftName} 기록과 이력을 모두 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return;
  await sb.from('key_lift_history').delete().eq('name', name).eq('lift_name', liftName);
  const { error } = await sb.from('key_lifts').delete().eq('name', name).eq('lift_name', liftName);
  if(error){ alert('삭제에 실패했어요: ' + error.message); return; }
  showProfileDetail(name);
}

async function saveKeyLiftValue(name, liftName, kgValue, recordedDate){
  const { error: histError } = await sb.from('key_lift_history').insert({
    name, lift_name: liftName, value_kg: kgValue, recorded_date: recordedDate
  });
  if(histError){ alert('이력 저장에 실패했어요: ' + histError.message); return false; }

  const { data: latestRow } = await sb.from('key_lift_history')
    .select('*').eq('name', name).eq('lift_name', liftName)
    .order('recorded_date', { ascending: false }).order('created_at', { ascending: false })
    .limit(1).maybeSingle();

  const latestValue = latestRow ? latestRow.value_kg : kgValue;
  const { error } = await sb.from('key_lifts').upsert({
    name, lift_name: liftName, value_kg: latestValue, updated_at: new Date().toISOString()
  }, { onConflict: 'name,lift_name' });
  if(error){ alert('저장에 실패했어요: ' + error.message); return false; }
  return true;
}

async function editKeyLift(name, liftName, existing, unit){
  const currentDisplay = existing ? fromKg(existing.value_kg, unit) : '';
  const input = prompt(`${liftName} 기록을 입력해주세요 (단위: ${unit})`, currentDisplay ? (Math.round(currentDisplay*10)/10).toString() : '');
  if(input === null) return;
  const num = parseFloat(input);
  if(isNaN(num)){ alert('숫자를 입력해주세요'); return; }
  const kgValue = Math.round(toKg(num, unit) * 100) / 100;

  const dateInput = prompt('이 기록의 날짜를 입력해주세요 (YYYY-MM-DD)', todayStr());
  if(dateInput === null) return;
  const recordedDate = dateInput.trim() || todayStr();

  const ok = await saveKeyLiftValue(name, liftName, kgValue, recordedDate);
  if(ok) showProfileDetail(name);
}
