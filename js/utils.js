

// 관리자 비밀번호는 코드에 없어요. Supabase의 admin_login 함수가 암호화된 값과 비교해요.

function todayStr(){ return new Date().toISOString().slice(0,10); }

// ---------- 가벼운 등장 애니메이션 헬퍼 ----------
// 요소가 나타날 때 살짝 페이드+슬라이드 되도록. 매번 다시 트리거되게 리플로우로 리셋해요.
function reveal(el){
  if(!el) return;
  el.classList.remove('reveal-anim');
  void el.offsetWidth;
  el.classList.add('reveal-anim');
}
// hidden 클래스를 토글하면서, 보여질 때만 reveal 애니메이션을 같이 트리거해요.
function revealToggle(el, show){
  if(!el) return;
  el.classList.toggle('hidden', !show);
  if(show) reveal(el);
}
// 두 컨테이너 중 하나만 보이게 전환하면서, 새로 보이는 쪽에 살짝 페이드인을 줘요.
function fadeSwap(showEl, ...hideEls){
  hideEls.forEach(el=> el && el.classList.add('hidden'));
  if(showEl){
    showEl.classList.remove('hidden');
    showEl.classList.remove('fade-swap');
    void showEl.offsetWidth;
    showEl.classList.add('fade-swap');
  }
}

// 접혔다 펼쳐지는 패널(무게 계산기 등)에 공통으로 쓰는 max-height 트랜지션 초기화/토글.
function initCollapsible(panel){
  panel.style.cssText += 'overflow:hidden; max-height:0; opacity:0; transition: max-height .28s ease, opacity .22s ease;';
}
function toggleCollapsible(panel, opening){
  if(opening){
    panel.classList.add('open');
    panel.style.maxHeight = panel.scrollHeight + 'px';
    panel.style.opacity = '1';
    panel.addEventListener('transitionend', function onEnd(e){
      if(e.propertyName !== 'max-height') return;
      if(panel.classList.contains('open')) panel.style.maxHeight = 'none';
      panel.removeEventListener('transitionend', onEnd);
    });
  } else {
    panel.style.maxHeight = panel.scrollHeight + 'px';
    panel.offsetHeight;
    requestAnimationFrame(()=>{
      panel.style.maxHeight = '0';
      panel.style.opacity = '0';
    });
    panel.classList.remove('open');
  }
}

const TRASH_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
const PLUS_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
const CHART_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>';
const PENCIL_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>';
const CHEVRON_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
const CALCULATOR_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10.5" x2="8" y2="10.5"></line><line x1="12" y1="10.5" x2="12" y2="10.5"></line><line x1="16" y1="10.5" x2="16" y2="10.5"></line><line x1="8" y1="14.5" x2="8" y2="14.5"></line><line x1="12" y1="14.5" x2="12" y2="14.5"></line><line x1="16" y1="14.5" x2="16" y2="14.5"></line><line x1="8" y1="18.5" x2="8" y2="18.5"></line><line x1="12" y1="18.5" x2="12" y2="18.5"></line><line x1="16" y1="18.5" x2="16" y2="18.5"></line></svg>';
const LOCK_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const UNLOCK_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>';
const CLOSE_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
const ICON_BTN_STYLE = 'padding:0; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--text-primary); background:var(--surface-1); border:1px solid var(--border);';
const ICON_BTN_DANGER_STYLE = 'padding:0; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--text-danger); background:var(--surface-1); border:1px solid var(--border);';

// ---------- 단위 변환 유틸 ----------
// 저장은 항상 kg 기준. 표시/입력 시에만 lb <-> kg 변환.
const KG_PER_LB = 0.45359237;
function toKg(value, unit){ return unit === 'lb' ? value * KG_PER_LB : value; }
function fromKg(kgValue, unit){ return unit === 'lb' ? kgValue / KG_PER_LB : kgValue; }
function formatWeight(kgValue, unit){
  const v = fromKg(kgValue, unit);
  return (Math.round(v * 10) / 10) + (unit === 'lb' ? 'lb' : 'kg');
}
function getPreferredUnit(){ return localStorage.getItem('weightUnit') || 'lb'; }
function setPreferredUnit(u){ localStorage.setItem('weightUnit', u); }

function escapeHtml(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
const WD = ['일', '월', '화', '수', '목', '금', '토'];
function limName(label){
  const base = extractMovementName(label) || String(label || '');
  return base.replace(/\s+[\d./]+\s*(#|lbs?|kg|")?\s*(\([^)]*\))?$/i, '').trim();
}
const clockSec = v => { const m = String(v).match(/^(\d+):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; };
const shortD = d => { const p = String(d).split('-'); return (+p[1]) + '/' + (+p[2]); };
const wdOf = d => WD[new Date(d + 'T00:00:00').getDay()];
function slideToggle(el, open){
  const isOpen = el.dataset.open === '1';
  if(open === undefined) open = !isOpen;
  if(open === isOpen) return;
  el.dataset.open = open ? '1' : '';
  const ease = 'cubic-bezier(0.32, 0.72, 0, 1)';
  el.style.overflow = 'hidden';
  el.style.transition = 'none';
  const done = fn => { const te = e => { if(e.target === el && e.propertyName === 'height'){ el.removeEventListener('transitionend', te); fn(); } }; el.addEventListener('transitionend', te); };
  if(open){
    el.style.display = 'block';
    const target = el.scrollHeight;
    el.style.height = '0px'; el.style.opacity = '0'; el.style.transform = 'translateY(-6px)';
    el.getBoundingClientRect();
    el.style.transition = 'height 420ms ' + ease + ', opacity 300ms ease, transform 420ms ' + ease;
    el.style.height = target + 'px'; el.style.opacity = '1'; el.style.transform = 'none';
    done(()=>{ el.style.height = ''; el.style.overflow = ''; el.style.transition = ''; });
  } else {
    el.style.height = el.scrollHeight + 'px';
    el.getBoundingClientRect();
    el.style.transition = 'height 340ms ' + ease + ', opacity 220ms ease, transform 340ms ' + ease;
    el.style.height = '0px'; el.style.opacity = '0'; el.style.transform = 'translateY(-4px)';
    done(()=>{ el.style.display = 'none'; el.style.height = ''; el.style.overflow = ''; el.style.transition = ''; });
  }
}

// 재사용 가능한 월별 캘린더 선택기. highlightedDates에 있는 날짜는 초록색으로 강조되고,
// allowAllDays가 true면 강조 안 된 날짜도 클릭 가능해요 (오늘 운동 탭 날짜 선택용).
function buildCalendarPicker({ highlightedDates, initialDate, selectedDate, onSelect, summaryLabel, allowAllDays }){
  const wrap = document.createElement('div');
  const highlightSet = new Set(highlightedDates || []);
  const ref = initialDate ? new Date(initialDate + 'T00:00:00') : new Date();
  let calYear = ref.getFullYear();
  let calMonth = ref.getMonth();
  let currentSelected = selectedDate || null;

  function pad2(n){ return n.toString().padStart(2, '0'); }

  function render(){
    wrap.innerHTML = '';
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;';
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.style.cssText = 'width:32px; height:28px; padding:0; font-size:15px;';
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.style.cssText = 'width:32px; height:28px; padding:0; font-size:15px;';
    const monthLabel = document.createElement('span');
    monthLabel.style.cssText = 'font-size:16px; font-weight:500;';
    monthLabel.textContent = `${calYear}년 ${calMonth + 1}월`;
    header.appendChild(prevBtn);
    header.appendChild(monthLabel);
    header.appendChild(nextBtn);
    wrap.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(7, 1fr); gap:4px;';
    ['일','월','화','수','목','금','토'].forEach(d=>{
      const dEl = document.createElement('div');
      dEl.className = 'muted';
      dEl.style.cssText = 'text-align:center; font-size:13px; padding:2px 0;';
      dEl.textContent = d;
      grid.appendChild(dEl);
    });

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    for(let i = 0; i < firstDay; i++){
      grid.appendChild(document.createElement('div'));
    }

    const todayStrVal = todayStr();
    let highlightCount = 0;

    for(let day = 1; day <= daysInMonth; day++){
      const dateStr = `${calYear}-${pad2(calMonth + 1)}-${pad2(day)}`;
      const isHighlighted = highlightSet.has(dateStr);
      if(isHighlighted) highlightCount++;
      const clickable = allowAllDays || isHighlighted;

      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      if(clickable) cell.classList.add('clickable');
      if(isHighlighted) cell.classList.add('available');
      if(dateStr === todayStrVal) cell.classList.add('today');
      if(dateStr === currentSelected) cell.classList.add('selected');
      cell.textContent = day;
      if(clickable){
        cell.onclick = ()=>{
          currentSelected = dateStr;
          render();
          onSelect(dateStr);
        };
      }
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);

    if(summaryLabel){
      const summary = document.createElement('p');
      summary.className = 'muted';
      summary.style.cssText = 'font-size:14px; margin:8px 0 0;';
      summary.textContent = summaryLabel(highlightCount);
      wrap.appendChild(summary);
    }

    prevBtn.onclick = ()=>{
      calMonth--;
      if(calMonth < 0){ calMonth = 11; calYear--; }
      render();
    };
    nextBtn.onclick = ()=>{
      calMonth++;
      if(calMonth > 11){ calMonth = 0; calYear++; }
      render();
    };
  }
  render();

  return { el: wrap, setSelected(date){ currentSelected = date; render(); } };
}
