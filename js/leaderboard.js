

async function renderBoard(){
  const el = document.getElementById('board-content');
  el.innerHTML = '<p class="muted">불러오고 있어요...</p>';

  const { data: programDates, error: progError } = await sb.from('programs').select('date').order('date', { ascending: false });
  if(progError){ el.innerHTML = `<p class="status err">${progError.message}</p>`; return; }
  if(!programDates || programDates.length === 0){ el.innerHTML = '<p class="muted">등록된 프로그램이 없어요.</p>'; return; }

  const currentUnit = getPreferredUnit();

  const topBar = document.createElement('div');
  topBar.className = 'row';
  topBar.style.marginBottom = '16px';
  topBar.innerHTML = `
    <input type="date" id="board-date-select" style="width:160px;" />
    <label style="margin:0; font-size:15px;">단위</label>
    <select id="board-unit-select" style="width:80px;">
      <option value="lb" ${currentUnit==='lb'?'selected':''}>lb</option>
      <option value="kg" ${currentUnit==='kg'?'selected':''}>kg</option>
    </select>
  `;
  el.innerHTML = '';
  el.appendChild(topBar);

  const boardDateList = programDates.map(row=>row.date);
  const dateSel = document.getElementById('board-date-select');
  const boardHint = document.createElement('p');
  boardHint.className = 'muted';
  boardHint.style.cssText = 'font-size:14px; margin:-8px 0 12px;';
  topBar.insertAdjacentElement('afterend', boardHint);

  const contentBox = document.createElement('div');
  contentBox.id = 'board-leaderboard-content';
  el.appendChild(contentBox);

  function handleBoardDateChange(date){
    const unit = document.getElementById('board-unit-select').value;
    if(boardDateList.includes(date)){
      boardHint.textContent = '';
      renderLeaderboardFor(date, unit);
    } else {
      boardHint.textContent = '이 날짜에는 등록된 프로그램이 없어요.';
      contentBox.innerHTML = '';
    }
  }

  async function renderLeaderboardFor(date, unit){
    contentBox.innerHTML = '<p class="muted">불러오고 있어요...</p>';

    const { data: program } = await sb.from('programs').select('*').eq('date', date).single();
    const { data: allRecords, error } = await sb.from('records').select('*').eq('date', date);
    if(error){ contentBox.innerHTML = `<p class="status err">${error.message}</p>`; return; }
    const records = (allRecords || []).filter(r => r.section !== PERSONAL_SECTION);
    if(records.length === 0){ contentBox.innerHTML = '<p class="muted">이 날짜에 등록된 기록이 없어요.</p>'; return; }

    const byItemName = {};
    records.forEach(r=>{
      if(!byItemName[r.item_name]) byItemName[r.item_name] = [];
      byItemName[r.item_name].push(r);
    });

    // 프로그램에 등록된 순서(섹션 구조) 기준으로 렌더링
    const itemOrder = [];
    if(program && program.items){
      program.items.forEach(it=>{
        if(it.type === 'barbell_conditioning' && it.movements){
          it.movements.forEach(m=> itemOrder.push({ key: `${it.name} - ${m}`, section: it.section, type: 'weight' }));
        } else if((it.type === 'amrap_by_round' || it.type === 'weight_by_round' || it.type === 'emom_by_round') && it.rounds){
          const recType = it.type === 'weight_by_round' ? 'weight' : (it.type === 'emom_by_round' ? 'status' : 'reps');
          for(let r = 1; r <= parseInt(it.rounds); r++){
            itemOrder.push({ key: `${it.name} - ${r}R`, section: it.section, type: recType });
          }
        } else {
          itemOrder.push({ key: it.name, section: it.section, type: it.type });
        }
      });
    }
    // records에만 있고 program에는 없는 항목(동작명이 자유 추가된 경우)도 포함
    Object.keys(byItemName).forEach(k=>{
      if(!itemOrder.find(io=>io.key === k)) itemOrder.push({ key: k, section: byItemName[k][0].section, type: byItemName[k][0].type });
    });

    contentBox.innerHTML = '';
    const bySection = {};
    itemOrder.forEach(io=>{
      const sec = io.section || '기타';
      if(!bySection[sec]) bySection[sec] = [];
      if(!bySection[sec].find(x=>x.key === io.key)) bySection[sec].push(io);
    });

    Object.entries(bySection).forEach(([sectionName, items], sIdx)=>{
      const sectionBox = document.createElement('div');
      sectionBox.style.cssText = 'background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px; margin-bottom:16px; box-shadow:var(--card-shadow);';
      const sEyebrow = document.createElement('p');
      sEyebrow.className = 'eyebrow';
      sEyebrow.textContent = `LEADERBOARD 0${sIdx + 1}`;
      sectionBox.appendChild(sEyebrow);
      const sTitle = document.createElement('h3');
      sTitle.style.cssText = 'font-size:18px; font-weight:500; margin:0 0 12px;';
      sTitle.textContent = sectionName;
      sectionBox.appendChild(sTitle);

      items.forEach(io=>{
        const itemRecords = byItemName[io.key] || [];
        if(itemRecords.length === 0) return;

        const itemBox = document.createElement('div');
        itemBox.className = 'card';
        const itemTitle = document.createElement('p');
        itemTitle.className = 'item-name';
        itemTitle.style.marginBottom = '8px';
        itemTitle.textContent = io.key;
        itemBox.appendChild(itemTitle);

        const active = itemRecords.filter(r=>!r.skipped);
        const skipped = itemRecords.filter(r=>r.skipped);

        let sorted;
        if(io.type === 'weight' || io.type === 'reps'){
          sorted = active.slice().sort((a,b)=> (parseFloat(b.value)||0) - (parseFloat(a.value)||0));
        } else if(io.type === 'status'){
          sorted = active.slice().sort((a,b)=> a.name.localeCompare(b.name));
        } else if(io.type === 'for_time'){
          const toSeconds = (v)=>{ if(!/^\d+:\d+$/.test(String(v)) || /^0+:0+$/.test(String(v))) return Infinity; const [m,s] = String(v).split(':').map(Number); return m*60 + s; };
          sorted = active.slice().sort((a,b)=> toSeconds(a.value) - toSeconds(b.value));
        } else if(io.type === 'calories'){
          sorted = active.slice().sort((a,b)=> (parseFloat(b.value)||0) - (parseFloat(a.value)||0));
        } else if(io.type === 'distance'){
          const toCm = v => { const m = String(v).match(/^([\d.]+)\s*(cm|m|ft)$/); return m ? +m[1] * (m[2] === 'm' ? 100 : m[2] === 'ft' ? 30.48 : 1) : -1; };
          sorted = active.slice().sort((a,b)=> toCm(b.value) - toCm(a.value));
        } else {
          sorted = active.slice().sort((a,b)=> a.name.localeCompare(b.name));
        }

        sorted.forEach((r, rank)=>{
          const row = document.createElement('div');
          row.style.cssText = 'font-size:15px; margin-bottom:6px; padding:6px 8px; border-radius:var(--radius);' + (rank===0 ? ' background:var(--bg-success);' : '');
          const displayValue = r.type === 'weight' ? formatWeight(parseFloat(r.value)||0, unit) : r.value;
          const rankBadge = (io.type==='weight'||io.type==='reps'||io.type==='for_time') ? `<span class="muted mono" style="width:20px; display:inline-block; flex-shrink:0;">${rank+1}</span>` : '';
          const detailTag = r.scaled ? `<span class="tag scaled">※${r.scale_detail ? ' '+r.scale_detail : ''}</span>` : '';
          row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <span style="display:flex; align-items:center; min-width:0; overflow:hidden;">
                ${rankBadge}<span style="cursor:pointer; text-decoration:underline; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" onclick="switchTab('profile'); setTimeout(()=>showProfileDetail('${r.name.replace(/'/g,"\\'")}'),0)">${r.name}</span>
              </span>
              <strong class="mono" style="font-weight:500; flex-shrink:0;">${displayValue}</strong>
            </div>
            ${detailTag ? `<div style="margin-top:4px;">${detailTag}</div>` : ''}
          `;
          itemBox.appendChild(row);
        });

        if(skipped.length > 0){
          const skipLine = document.createElement('p');
          skipLine.className = 'muted';
          skipLine.style.cssText = 'font-size:14px; margin:6px 0 0;';
          skipLine.textContent = `생략: ${skipped.map(s=>s.name).join(', ')}`;
          itemBox.appendChild(skipLine);
        }

        sectionBox.appendChild(itemBox);
      });

      contentBox.appendChild(sectionBox);
    });
  }

  const today = todayStr();
  const initialBoardDate = boardDateList.includes(today) ? today : boardDateList[0];
  dateSel.value = initialBoardDate;
  renderLeaderboardFor(initialBoardDate, currentUnit);

  dateSel.onchange = ()=> handleBoardDateChange(dateSel.value);
  document.getElementById('board-unit-select').onchange = (e)=>{
    setPreferredUnit(e.target.value);
    if(boardDateList.includes(dateSel.value)) renderLeaderboardFor(dateSel.value, e.target.value);
  };
}
