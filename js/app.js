
new MutationObserver(muts=>{
  if(!MV_MAP) return;
  for(const m of muts) for(const n of m.addedNodes){
    if(n.nodeType !== 1 || n.classList.contains('mv-btn') || n.classList.contains('mv-title-btn')) continue;
    if(n.matches('[data-mv], .item-name') || n.querySelector('[data-mv], .item-name')) decorateMovementVideos(n.matches('[data-mv], .item-name') ? n.parentNode : n);
  }
}).observe(document.body, { childList: true, subtree: true });
loadMovementVideos();

function switchTab(tab){
  const views = { log: 'view-log', board: 'view-board', profile: 'view-profile', admin: 'view-admin' };
  Object.entries(views).forEach(([t, id])=>{
    if(t === tab) fadeSwap(document.getElementById(id));
    else document.getElementById(id).classList.add('hidden');
  });
  ['log','board','profile','admin'].forEach(t=>{
    document.getElementById('tab-'+t).classList.toggle('active', t === tab);
  });
  if(tab === 'log') loadDatesForLog();
  if(tab === 'board') renderProgress();
  if(tab === 'profile') renderProfileList();
  document.getElementById('main-tabs').style.display = tab === 'admin' ? 'none' : '';
  if(tab === 'admin' && !document.getElementById('admin-panel').classList.contains('hidden')) showAdminSection(ADMIN_SEC);
}
document.querySelectorAll('.adm-tab').forEach(b => b.onclick = ()=> showAdminSection(b.dataset.sec));
document.getElementById('adm-exit').onclick = ()=> switchTab('log');
document.getElementById('tab-log').onclick = ()=> switchTab('log');
document.getElementById('tab-board').onclick = ()=> switchTab('board');
document.getElementById('tab-profile').onclick = ()=> switchTab('profile');
document.getElementById('tab-admin').onclick = ()=> switchTab('admin');
(()=>{
  let taps = 0, timer = null;
  document.getElementById('admin-secret').addEventListener('click', ()=>{
    taps++;
    clearTimeout(timer);
    timer = setTimeout(()=>{ taps = 0; }, 1500);
    if(taps >= 5){ taps = 0; switchTab('admin'); }
  });
})();
document.getElementById('mv-date').onchange = ()=> renderMovementPicker();
document.getElementById('mv-add-btn').onclick = async ()=>{
  const st = document.getElementById('mv-status');
  const err = await saveMovementVideo(document.getElementById('mv-name').value, document.getElementById('mv-url').value);
  st.className = 'status ' + (err ? 'err' : 'ok');
  st.textContent = err || '저장했어요';
  if(!err){ document.getElementById('mv-name').value = ''; document.getElementById('mv-url').value = ''; }
};
document.getElementById('mv-search').oninput = ()=> renderMovementVideoList();
document.getElementById('admin-unlock-btn').onclick = unlockAdmin;
document.getElementById('admin-pw').onkeydown = (e)=>{ if(e.key === 'Enter') unlockAdmin(); };
document.getElementById('mode-ai-btn').onclick = ()=> setInputMode('ai');
document.getElementById('mode-json-btn').onclick = ()=> setInputMode('json');

document.getElementById('json-load-btn').onclick = ()=>{
  const status = document.getElementById('json-status');
  const errEl = document.getElementById('json-error');
  errEl.textContent = '';
  const raw = document.getElementById('json-text').value.trim();
  if(!raw){ status.textContent = "JSON을 붙여넣어주세요"; status.className = "status err"; return; }

  try {
    const items = extractJsonArray(raw);
    validateProgramItems(items);
    status.textContent = `${items.length}개 항목을 불러왔어요`; status.className = "status ok";
    loadItemsIntoEditor(items);
  } catch(e){
    status.textContent = "불러오지 못했어요"; status.className = "status err";
    errEl.textContent = String(e.message || e);
  }
};

document.getElementById('parse-btn').onclick = async ()=>{
  const status = document.getElementById('parse-status');
  const errEl = document.getElementById('parse-error');
  errEl.textContent = '';
  const text = document.getElementById('program-text').value.trim();
  if(!text){ status.textContent = "프로그램 텍스트를 붙여넣어주세요"; status.className = "status err"; return; }
  status.textContent = "분석하고 있어요..."; status.className = "status";

  try {
    const result = await callParseFunction(text);
    const items = extractJsonArray(result);
    validateProgramItems(items);

    status.textContent = `${items.length}개 항목을 추출했어요. 아래에서 검토·수정 후 게시해주세요`; status.className = "status ok";
    loadItemsIntoEditor(items);
  } catch(e){
    status.textContent = "분석에 실패했어요"; status.className = "status err";
    errEl.textContent = String(e.message || e);
  }
};

document.getElementById('editor-add-item-btn').onclick = ()=>{
  editorItems.push({ section: editorItems.length ? editorItems[editorItems.length-1].section : '', subsection: '', name: '', type: 'weight', prescribed: '', rounds: '', movements: [], _open: true });
  renderItemsEditor();
};

document.getElementById('editor-cancel-btn').onclick = ()=>{
  editorItems = [];
  document.getElementById('items-editor-wrap').classList.add('hidden');
};

document.getElementById('editor-publish-btn').onclick = async ()=>{
  const status = document.getElementById('editor-status');
  const errEl = document.getElementById('editor-error');
  const btn = document.getElementById('editor-publish-btn');
  errEl.textContent = '';
  const date = document.getElementById('admin-date').value;
  if(!date){ status.textContent = "날짜를 먼저 선택해주세요"; status.className = "status err"; return; }
  if(btn.disabled) return;

  try {
    const items = editorItemsToClean();
    validateProgramItems(items);
    btn.disabled = true;
    status.textContent = "게시하고 있어요..."; status.className = "status";

    // programs 테이블에 UPDATE RLS 정책이 없어서 upsert(충돌 시 UPDATE)가 막히는 환경이 있어요.
    // 이미 허용된 DELETE + INSERT로 우회해요. 사람들이 입력한 기록(records)은 건드리지 않아요.
    // 넣기가 실패하면 지우기 전 프로그램을 다시 넣어서, 그날 프로그램이 비지 않게 해요.
    const { data: prev } = await sb.from('programs').select('date, raw_text, items').eq('date', date).maybeSingle();
    const { error: delError } = await sb.from('programs').delete().eq('date', date);
    if(delError) throw new Error('기존 프로그램 정리에 실패했어요: ' + delError.message);
    const { error } = await sb.from('programs').insert({
      date, raw_text: JSON.stringify(items), items
    });
    if(error){
      if(prev){
        const { error: backErr } = await sb.from('programs').insert(prev);
        throw new Error('저장에 실패했어요: ' + error.message + (backErr ? ' (이전 프로그램 복구도 실패했어요: ' + backErr.message + ')' : ' (이전 프로그램은 그대로 두었어요)'));
      }
      throw new Error('저장에 실패했어요: ' + error.message);
    }

    status.textContent = `${items.length}개 항목을 ${date}에 게시했어요`; status.className = "status ok";
    renderAdminProgramList();
    btn.disabled = false;
  } catch(e){
    status.textContent = "게시에 실패했어요"; status.className = "status err";
    errEl.textContent = String(e.message || e);
    btn.disabled = false;
  }
};
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') flushLogSaves(); });
window.addEventListener('pagehide', ()=> flushLogSaves());

switchTab('log');
initFloatingWeightCalc();

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

