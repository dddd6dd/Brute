

function round1(n){ return Math.round(n * 10) / 10; }

function formatBothUnits(kgValue, primaryUnit){
  const primary = primaryUnit || getPreferredUnit();
  const other = primary === 'lb' ? 'kg' : 'lb';
  return `${formatWeight(kgValue, primary)} (${formatWeight(kgValue, other)})`;
}

// 박스에 있는 바벨/원판 목록 (바벨은 미국식 45lb/35lb가 실제 정확한 무게 기준)
const BAR_INVENTORY = [
  { key: '45lb', label: '45lb', kg: 45 * KG_PER_LB },
  { key: '20kg', label: '20kg', kg: 20 },
  { key: '35lb', label: '35lb', kg: 35 * KG_PER_LB },
  { key: '15kg', label: '15kg', kg: 15 }
];
const PLATE_INVENTORY = [
  { label: '45lb', kg: 45 * KG_PER_LB, unit: 'lb' },
  { label: '35lb', kg: 35 * KG_PER_LB, unit: 'lb' },
  { label: '25lb', kg: 25 * KG_PER_LB, unit: 'lb' },
  { label: '15lb', kg: 15 * KG_PER_LB, unit: 'lb' },
  { label: '10lb', kg: 10 * KG_PER_LB, unit: 'lb' },
  { label: '25kg', kg: 25, unit: 'kg' },
  { label: '20kg', kg: 20, unit: 'kg' },
  { label: '15kg', kg: 15, unit: 'kg' },
  { label: '10kg', kg: 10, unit: 'kg' },
  { label: '5kg', kg: 5, unit: 'kg' },
  { label: '2.5kg', kg: 2.5, unit: 'kg' },
  { label: '2kg', kg: 2, unit: 'kg' },
  { label: '1.5kg', kg: 1.5, unit: 'kg' },
  { label: '1kg', kg: 1, unit: 'kg' },
  { label: '0.5kg', kg: 0.5, unit: 'kg' }
].sort((a,b)=> b.kg - a.kg);

// 목표 무게(kg), 바벨 무게(kg)를 받아 한쪽에 꽂을 원판 조합을 계산 (원판은 넉넉히 있다고 가정)
// 그램 단위 동적계획법으로, 목표를 살짝 넘기더라도(반올림 오차 보정) 가장 근접한 조합을 찾는다
function calcPlatesForWeight(targetKg, barKg){
  const perSideKg = Math.max((targetKg - barKg) / 2, 0);
  const targetGrams = Math.round(perSideKg * 1000);

  if(targetGrams <= 0){
    return { used: [], achievedTotalKg: barKg, perSideTarget: perSideKg, diffPerSideKg: -perSideKg };
  }

  // 1단계: lb 원판만으로 최선의 조합을 찾아요 (실제로 주로 쓰는 원판).
  const lbPlates = PLATE_INVENTORY.filter(p=> p.unit === 'lb');
  const lbDenoms = lbPlates.map(p=>({ label: p.label, grams: Math.round(p.kg * 1000) }));
  const lbBuffer = Math.max(...lbDenoms.map(d=>d.grams));
  const lbSearchMax = targetGrams + lbBuffer;

  const INF = Infinity;
  const minCount = new Array(lbSearchMax + 1).fill(INF);
  const chosen = new Array(lbSearchMax + 1).fill(-1);
  minCount[0] = 0;

  for(let s = 1; s <= lbSearchMax; s++){
    for(let i = 0; i < lbDenoms.length; i++){
      const g = lbDenoms[i].grams;
      if(g <= s && minCount[s - g] + 1 < minCount[s]){
        minCount[s] = minCount[s - g] + 1;
        chosen[s] = i;
      }
    }
  }

  let bestS = -1;
  let bestDiff = Infinity;
  const lbSearchMin = Math.max(0, targetGrams - lbBuffer);
  for(let s = lbSearchMin; s <= lbSearchMax; s++){
    if(minCount[s] === INF) continue;
    const diff = Math.abs(s - targetGrams);
    if(diff < bestDiff - 1e-9){
      bestDiff = diff;
      bestS = s;
    } else if(Math.abs(diff - bestDiff) <= 1e-9 && bestS !== -1){
      const currentBetter = (s <= targetGrams && bestS > targetGrams) ||
        ((s <= targetGrams) === (bestS <= targetGrams) && minCount[s] < minCount[bestS]);
      if(currentBetter){ bestS = s; }
    }
  }
  if(bestS === -1) bestS = 0;

  const countMap = {};
  let s = bestS;
  while(s > 0){
    const idx = chosen[s];
    if(idx === -1) break;
    countMap[lbDenoms[idx].label] = (countMap[lbDenoms[idx].label] || 0) + 1;
    s -= lbDenoms[idx].grams;
  }

  // 2단계: 남는 오차를 작은 kg 원판(5kg 이하) 최대 2장으로만 정밀 보정해요.
  // (많이 섞으면 실제로 꽂기 번거로우니 미세 조정 용도로만 최소한으로 사용)
  const smallKgPlates = PLATE_INVENTORY.filter(p=> p.unit === 'kg' && p.kg <= 5);
  let bestTotal = bestS;
  let bestExtra = [];
  let bestExtraDiff = Math.abs(bestS - targetGrams);

  const tryCombo = (combo)=>{
    const extraGrams = combo.reduce((sum, p)=> sum + Math.round(p.kg * 1000), 0);
    const total = bestS + extraGrams;
    const diff = Math.abs(total - targetGrams);
    const better = diff < bestExtraDiff - 1e-9 ||
      (Math.abs(diff - bestExtraDiff) <= 1e-9 && combo.length < bestExtra.length);
    if(better){
      bestExtraDiff = diff;
      bestTotal = total;
      bestExtra = combo;
    }
  };

  smallKgPlates.forEach(p=> tryCombo([p]));
  smallKgPlates.forEach((p, i)=>{
    smallKgPlates.slice(i).forEach(q=> tryCombo([p, q]));
  });

  bestExtra.forEach(p=>{ countMap[p.label] = (countMap[p.label] || 0) + 1; });

  const allPlates = [...lbPlates, ...smallKgPlates];
  const used = allPlates
    .filter(p=> countMap[p.label])
    .map(p=> ({ label: p.label, count: countMap[p.label] }));

  const achievedPerSideKg = bestTotal / 1000;
  const achievedTotalKg = barKg + achievedPerSideKg * 2;
  const diffPerSideKg = perSideKg - achievedPerSideKg; // 양수: 목표에 못 미침, 음수: 목표를 초과

  return { used, achievedTotalKg, perSideTarget: perSideKg, diffPerSideKg };
}

// 한쪽에 꽂는 원판 구성을 실제 바벨처럼 그림으로 보여줘요. 바에서 가까운 쪽이 큰 원판.
function buildBarbellVisual(used){
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:2px; margin:10px 0; padding:10px 4px; overflow-x:auto;';

  const plates = [];
  used.forEach(p=>{
    const m = p.label.match(/^([\d.]+)(lb|kg)$/);
    const num = m ? parseFloat(m[1]) : parseFloat(p.label);
    const unit = m ? m[2] : 'lb';
    for(let i = 0; i < p.count; i++) plates.push({ num, unit });
  });

  if(plates.length === 0){
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.style.cssText = 'font-size:13px; text-align:center; width:100%;';
    empty.textContent = '추가 원판 없이 바벨만 사용해요';
    wrap.appendChild(empty);
    return wrap;
  }

  function plateEl(plate){
    // kg 원판은 lb 환산 무게 기준으로 높이를 잡아서 실제 크기 느낌이 나게 해요.
    const equivLb = plate.unit === 'kg' ? plate.num / KG_PER_LB : plate.num;
    const h = Math.round(26 + Math.min(equivLb, 45) / 45 * 42);
    const el = document.createElement('div');
    el.style.cssText = `position:relative; display:flex; align-items:center; justify-content:center;
      min-width:24px; height:${h}px; flex-shrink:0; margin:0 1px; padding:0 3px;
      border-radius:3px; background:var(--surface-1); border:1px solid var(--border-strong);
      box-shadow: var(--card-shadow);`;
    const label = document.createElement('span');
    label.textContent = plate.unit === 'kg' ? `${plate.num}kg` : plate.num;
    label.style.cssText = `font-family:var(--font-mono); font-size:10px; color:var(--text-secondary); white-space:nowrap;`;
    el.appendChild(label);
    return el;
  }

  plates.forEach(p=> wrap.appendChild(plateEl(p)));

  return wrap;
}

// 오른쪽 아래에 항상 떠있는 계산기 아이콘. 눌러서 열고 닫으며 무게 계산기 패널을 확장/축소해요.
function initFloatingWeightCalc(){
  const unit = getPreferredUnit();

  const container = document.createElement('div');
  container.id = 'floating-calc';
  container.style.cssText = 'position:fixed; right:20px; bottom:20px; z-index:1000; display:flex; flex-direction:column; align-items:flex-end; gap:10px;';

  const panel = document.createElement('div');
  panel.style.cssText = 'width:min(360px, calc(100vw - 40px)); background:var(--surface-1); border:1px solid var(--border); border-radius:var(--radius-lg); box-shadow:var(--card-shadow);';
  initCollapsible(panel);

  const panelInner = document.createElement('div');
  panelInner.style.cssText = 'padding:16px; max-height:min(60vh, 480px); overflow-y:auto;';
  panel.appendChild(panelInner);

  panelInner.innerHTML = `
    
    <h3 style="font-size:18px; font-weight:500; margin:0 0 14px;">무게 계산기</h3>

    <div class="row" style="margin-bottom:16px;">
      <label style="margin:0; font-size:15px;">기준 무게</label>
      <input type="number" step="0.1" id="calc-base-value" placeholder="무게" style="width:110px;" />
      <select id="calc-base-unit" style="width:80px;">
        <option value="lb" ${unit==='lb'?'selected':''}>lb</option>
        <option value="kg" ${unit==='kg'?'selected':''}>kg</option>
      </select>
    </div>

    <p class="muted" style="margin:0 0 8px; font-weight:500;">퍼센트 계산</p>
    <div class="row" id="calc-percent-presets" style="margin-bottom:8px;"></div>
    <div class="row" style="margin-bottom:6px;">
      <input type="number" id="calc-custom-percent" placeholder="직접입력 %" style="width:110px;" />
      <button id="calc-custom-percent-btn" style="height:32px; font-size:15px;">계산</button>
    </div>
    <p id="calc-percent-result" style="font-size:17px; font-weight:500; margin:8px 0 18px; min-height:20px;"></p>

    <p class="muted" style="margin:0 0 8px; font-weight:500;">단계별 증량</p>
    <div id="calc-steps-list" style="margin-bottom:8px;"></div>
    <div class="row">
      <input type="number" step="0.1" id="calc-step-amount" placeholder="증량" style="width:90px;" />
      <select id="calc-step-unit" style="width:80px;">
        <option value="lb" ${unit==='lb'?'selected':''}>lb</option>
        <option value="kg" ${unit==='kg'?'selected':''}>kg</option>
      </select>
      <button id="calc-step-add-btn" style="height:32px; font-size:15px;">단계 추가</button>
      <button id="calc-step-reset-btn" style="height:32px; font-size:15px;">초기화</button>
    </div>

    <p class="muted" style="margin:18px 0 8px; font-weight:500;">바벨 플레이트 계산</p>
    <p class="muted" style="font-size:14px; margin:0 0 8px;">위 "기준 무게"를 목표 무게로 사용해요.</p>
    <div class="row" style="margin-bottom:10px;">
      <label style="margin:0; font-size:15px;">바벨</label>
      <select id="calc-bar-select" style="width:180px;">
        ${BAR_INVENTORY.map(b=>`<option value="${b.key}">${b.label}</option>`).join('')}
      </select>
    </div>
    <div id="calc-plate-result"></div>
  `;
  container.appendChild(panel);

  const toggleBtn = document.createElement('button');
  toggleBtn.title = '무게 계산기 열기';
  toggleBtn.setAttribute('aria-label', '무게 계산기 열기');
  toggleBtn.style.cssText = `width:52px; height:52px; ${ICON_BTN_STYLE}`;
  toggleBtn.innerHTML = CALCULATOR_ICON_SVG;
  toggleBtn.querySelector('svg').setAttribute('width', '22');
  toggleBtn.querySelector('svg').setAttribute('height', '22');
  container.appendChild(toggleBtn);

  document.body.appendChild(container);

  toggleBtn.onclick = ()=>{
    const isOpen = panel.classList.contains('open');
    toggleCollapsible(panel, !isOpen);
    if(!isOpen){
      toggleBtn.innerHTML = CLOSE_ICON_SVG;
      toggleBtn.title = '무게 계산기 닫기'; toggleBtn.setAttribute('aria-label', '무게 계산기 닫기');
      toggleBtn.style.color = 'var(--text-danger)';
    } else {
      toggleBtn.innerHTML = CALCULATOR_ICON_SVG;
      toggleBtn.title = '무게 계산기 열기'; toggleBtn.setAttribute('aria-label', '무게 계산기 열기');
      toggleBtn.style.color = 'var(--text-primary)';
    }
    toggleBtn.querySelector('svg').setAttribute('width', '22');
    toggleBtn.querySelector('svg').setAttribute('height', '22');
  };

  const baseValueInput = panelInner.querySelector('#calc-base-value');
  const baseUnitSelect = panelInner.querySelector('#calc-base-unit');

  function getBaseKg(){
    const v = parseFloat(baseValueInput.value);
    if(isNaN(v)) return null;
    return toKg(v, baseUnitSelect.value);
  }

  // 퍼센트 프리셋 버튼
  const presetWrap = panelInner.querySelector('#calc-percent-presets');
  [50,60,65,70,75,80,85,90,95].forEach(pct=>{
    const btn = document.createElement('button');
    btn.textContent = `${pct}%`;
    btn.style.cssText = 'height:30px; font-size:14px; padding:0 10px;';
    btn.onclick = ()=> showPercentResult(pct);
    presetWrap.appendChild(btn);
  });

  const percentResultEl = panelInner.querySelector('#calc-percent-result');
  function showPercentResult(pct){
    const baseKg = getBaseKg();
    if(baseKg === null){ percentResultEl.textContent = '기준 무게를 먼저 입력해주세요'; return; }
    const resultKg = baseKg * (pct / 100);
    percentResultEl.textContent = `${pct}% = ${formatBothUnits(resultKg, baseUnitSelect.value)}`;
  }

  panelInner.querySelector('#calc-custom-percent-btn').onclick = ()=>{
    const pct = parseFloat(panelInner.querySelector('#calc-custom-percent').value);
    if(isNaN(pct)){ percentResultEl.textContent = '퍼센트를 입력해주세요'; return; }
    showPercentResult(pct);
  };

  // 단계별 증량 계산
  let calcSteps = [];
  const stepsListEl = panelInner.querySelector('#calc-steps-list');

  function renderSteps(){
    stepsListEl.innerHTML = '';
    const baseKg = getBaseKg();
    if(baseKg === null){
      stepsListEl.innerHTML = '<p class="muted" style="font-size:14px;">기준 무게를 먼저 입력해주세요</p>';
      return;
    }
    const startLine = document.createElement('p');
    startLine.style.cssText = 'font-size:15px; margin:0 0 6px;';
    startLine.innerHTML = `시작: <strong style="font-weight:500;">${formatBothUnits(baseKg, baseUnitSelect.value)}</strong>`;
    stepsListEl.appendChild(startLine);

    let runningKg = baseKg;
    calcSteps.forEach((step, i)=>{
      const incKg = toKg(step.amount, step.unit);
      runningKg += incKg;
      const otherUnit = step.unit === 'lb' ? 'kg' : 'lb';
      const line = document.createElement('div');
      line.style.cssText = 'display:flex; justify-content:space-between; align-items:center; font-size:15px; margin-bottom:4px; gap:8px;';
      line.innerHTML = `<span>${i+1}단계: +${step.amount}${step.unit} (${round1(fromKg(incKg, otherUnit))}${otherUnit}) → <strong style="font-weight:500;">${formatBothUnits(runningKg, baseUnitSelect.value)}</strong></span>`;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '삭제';
      removeBtn.style.cssText = 'height:24px; font-size:13px; padding:0 8px; flex-shrink:0;';
      removeBtn.onclick = ()=>{ calcSteps.splice(i,1); renderSteps(); };
      line.appendChild(removeBtn);
      stepsListEl.appendChild(line);
    });
  }

  panelInner.querySelector('#calc-step-add-btn').onclick = ()=>{
    const amount = parseFloat(panelInner.querySelector('#calc-step-amount').value);
    if(isNaN(amount)){ alert('증량 값을 입력해주세요'); return; }
    const stepUnit = panelInner.querySelector('#calc-step-unit').value;
    calcSteps.push({ amount, unit: stepUnit });
    panelInner.querySelector('#calc-step-amount').value = '';
    renderSteps();
  };
  panelInner.querySelector('#calc-step-reset-btn').onclick = ()=>{ calcSteps = []; renderSteps(); };

  // 바벨 플레이트 계산
  const barSelect = panelInner.querySelector('#calc-bar-select');
  const plateResultEl = panelInner.querySelector('#calc-plate-result');

  function renderPlateCalc(){
    const baseKg = getBaseKg();
    if(baseKg === null){
      plateResultEl.innerHTML = '<p class="muted" style="font-size:14px;">기준 무게를 먼저 입력해주세요</p>';
      return;
    }
    const bar = BAR_INVENTORY.find(b=>b.key === barSelect.value);
    if(baseKg < bar.kg - 0.05){
      plateResultEl.innerHTML = `<p class="muted" style="font-size:14px;">기준 무게가 바벨 무게(${formatBothUnits(bar.kg, baseUnitSelect.value)})보다 가벼워요</p>`;
      return;
    }

    const { used, achievedTotalKg, diffPerSideKg } = calcPlatesForWeight(baseKg, bar.kg);

    plateResultEl.innerHTML = '';
    plateResultEl.appendChild(buildBarbellVisual(used));

    const totalLine = document.createElement('p');
    totalLine.style.cssText = 'font-size:17px; font-weight:500; margin:8px 0 0;';
    totalLine.textContent = `총 무게: ${formatBothUnits(achievedTotalKg, baseUnitSelect.value)}`;
    plateResultEl.appendChild(totalLine);

    if(Math.abs(diffPerSideKg) > 0.05){
      const diffLine = document.createElement('p');
      diffLine.className = 'muted';
      diffLine.style.cssText = 'font-size:14px; margin:4px 0 0;';
      const directionText = diffPerSideKg > 0 ? '목표보다 살짝 부족해요' : '목표보다 살짝 초과했어요';
      diffLine.textContent = `${directionText} (한쪽당 차이: ${formatBothUnits(Math.abs(diffPerSideKg), baseUnitSelect.value)})`;
      plateResultEl.appendChild(diffLine);
    }
  }

  barSelect.onchange = renderPlateCalc;

  baseValueInput.oninput = ()=>{ renderSteps(); renderPlateCalc(); };
  baseUnitSelect.onchange = ()=>{ renderSteps(); renderPlateCalc(); };

  renderSteps();
  renderPlateCalc();
}
