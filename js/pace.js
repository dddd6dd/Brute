
// 지난 같은 요일·같은 형식 기록으로 목표 세트 페이스를 잡아줘요 (근거가 있을 때만)
async function suggestTargetPace(card, it, n, rest, readTarget, compute){
  const date = LOG_CTX.date, name = LOG_CTX.name;
  const reasonEl = card.querySelector('.rs-treason');
  const noBase = ()=>{ if(!readTarget()) reasonEl.textContent = ''; };
  if(!date || !name || !rest){ noBase(); return; }
  const head = (splitPrescribedLines(it.prescribed).filter(Boolean)[0] || '').trim().toLowerCase();
  const wd = new Date(date + 'T00:00:00').getDay();
  const { data: progs } = await sb.from('programs').select('date, items').lt('date', date).order('date', { ascending: false }).limit(60);
  const cands = (progs || []).filter(pg => new Date(pg.date + 'T00:00:00').getDay() === wd)
    .map(pg => ({ date: pg.date, item: (pg.items || []).find(x => x.type === 'for_time' && repeatSetsCount(x) === n && parseRestSec(x.prescribed) === rest && (splitPrescribedLines(x.prescribed).filter(Boolean)[0] || '').trim().toLowerCase() === head) }))
    .filter(c => c.item);
  const sessions = [];
  for(const c of cands){
    if(sessions.length >= 6) break;
    const { data: rr } = await sb.from('records').select('item_name, value, scale_detail, skipped').eq('date', c.date).eq('name', name);
    const main = (rr || []).find(r => r.item_name === c.item.name);
    const mpd = main ? (parsePersonalDetail(main) || {}) : {};
    if(mpd.igug) continue;
    const sp = (rr || []).filter(r => r.item_name.startsWith(c.item.name + ' - ') && /\d+R$/.test(r.item_name) && !r.skipped)
      .map(r => ({ n: +r.item_name.match(/(\d+)R$/)[1], s: clockSec(r.value) })).filter(x => x.s != null).sort((a, b) => a.n - b.n).map(x => x.s);
    if(sp.length < 3) continue;
    sessions.push({ date: c.date, sp, mpd, changed: paceChanged(it, c.item) });
  }
  if(!sessions.length){ noBase(); return; }
  const avgRest = sp => sp.slice(1).reduce((a, b) => a + b, 0) / (sp.length - 1);
  const valid = sessions.filter(x => !x.changed).slice(0, 3);
  let base, why;
  if(valid.length){
    const vals = valid.map(x => avgRest(x.sp)).sort((a, b) => a - b);
    base = vals[Math.floor(vals.length / 2)];
    why = (valid.length === 1 ? shortD(valid[0].date) : '최근 ' + valid.length + '번') + ' ' + WD[wd] + '요일 2세트 이후 평균' + (valid.length > 1 ? '의 중앙값' : '') + ' 기준이에요';
    const last = valid[0], pat = pacePattern(last.sp, false);
    if(pat && pat.key === 'even' && last.mpd.target && last.mpd.hits != null && last.mpd.hits / last.sp.length >= 0.8){ base *= 0.985; why += '. 지난번 고르게 목표를 지켜서 1.5% 당겼어요'; }
  } else {
    base = avgRest(sessions[0].sp);
    why = '참고용 · ' + shortD(sessions[0].date) + ' 기록 기준이에요. 구성이 달라서 그대로 비교하긴 어려워요';
  }
  const target = Math.round(base);
  if(card._targetManual || readTarget() || !card.isConnected) return;
  card.querySelector('.rs-tmin').value = Math.floor(target / 60);
  card.querySelector('.rs-tsec').value = target % 60;
  reasonEl.textContent = why + '.';
  compute();
}
// PACE 판정 (리서치 반영): 값은 모두 속도로 바꿔서 CV·기울기로 "고름", 내 기준 대비 %로 "빠름"을 따로 봐요.
const PACE_LABEL = { even: '고르게', allout: '초반 과속', positive: '점점 느려짐', negative: '후반 상승', variable: '들쭉날쭉' };
function paceRates(vals, higherBetter){ return vals.map(x => (x == null || x <= 0) ? null : (higherBetter ? x : 1 / x)); }
function paceStats(rate){
  const r = rate.filter(x => x != null);
  const n = r.length;
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const m = mean(r);
  const sd = Math.sqrt(r.reduce((s, x) => s + (x - m) * (x - m), 0) / n);
  const xs = r.map((_, i) => i + 1), mx = mean(xs);
  const slope = (r.reduce((s, y, i) => s + (xs[i] - mx) * (y - m), 0) / xs.reduce((s, x) => s + (x - mx) * (x - mx), 0)) / m;
  const rest = r.slice(1), restMean = mean(rest);
  const drops = r.slice(1).map((x, i) => (r[i] - x) / r[i]);
  const laterDrop = drops.length > 1 ? mean(drops.slice(1)) : 0;
  const half = Math.floor(n / 2);
  return { n, m, cv: sd / m, slope, firstExcess: r[0] / restMean - 1, drop12: drops[0] || 0, laterDrop, halfGain: mean(r.slice(n - half)) / mean(r.slice(0, half)) - 1, restMean };
}
function pacePattern(vals, higherBetter, rateOverride){
  const rate = rateOverride || paceRates(vals, higherBetter);
  if(rate.filter(x => x != null).length < 3) return null;
  const s = paceStats(rate);
  let key;
  if(s.firstExcess >= 0.06 && s.drop12 >= 2 * Math.max(s.laterDrop, 0.005)) key = 'allout';
  else if(s.cv <= 0.04 && Math.abs(s.slope) <= 0.01) key = 'even';
  else if(s.halfGain >= 0.03) key = 'negative';
  else if(s.slope < -0.01) key = 'positive';
  else if(s.cv > 0.06) key = 'variable';
  else key = 'even';
  return { key, label: PACE_LABEL[key], stats: s };
}
function paceCoach(key, speed){
  if(key === 'even') return speed === 'fast' ? '빠르면서 고르게 갔어요. 이 페이스가 이제 내 기준이에요.' : speed === 'similar' ? '평소 페이스를 끝까지 지켰어요.' : speed === 'slow' ? '고르게 갔어요. 다음엔 조금 더 밀어도 돼요.' : '세트 간 차이가 작았어요. 고르게 갔어요.';
  if(key === 'allout') return speed === 'fast' ? '1세트가 너무 빨랐어요. 그래도 평균은 좋았어요.' : '1세트에 힘을 많이 썼어요. 다음엔 1세트를 목표에 맞춰 보세요.';
  if(key === 'positive') return '뒤로 갈수록 느려졌어요. 첫 두 세트를 조금만 아껴 보세요.';
  if(key === 'negative') return '뒤로 갈수록 빨라졌어요. 초반에 여유가 있었어요.';
  if(key === 'variable') return '세트마다 차이가 컸어요. 한 세트 목표 하나만 정해 보세요.';
  return '';
}
function paceChanged(itA, itB){
  if(!itA || !itB) return true;
  const mv = it => new Set(splitPrescribedLines(it.prescribed).map(l => extractMovementName(l)).filter(Boolean).map(l => normMv(limName(l))));
  const wt = it => (String(it.prescribed).match(/\d+\s*\/\s*\d+\s*#|\d+(\.\d+)?\s*(lb|kg)\b/gi) || []).map(x => x.replace(/\s/g, '').toLowerCase()).sort().join('|');
  const a = mv(itA), b = mv(itB);
  const inter = [...a].filter(x => b.has(x)).length, uni = new Set([...a, ...b]).size || 1;
  return inter / uni < 0.5 || wt(itA) !== wt(itB);
}
function paceTol(target, unit){ return Math.max(0.03 * target, unit === 'time' ? 3 : 1); }
function paceDetailHtml(s, list, fmtV){
  const hb = s.unit !== 'time';
  const vals = s.vals;
  let html = '<div style="font-weight:600; margin-bottom:10px;">' + escapeHtml(s.name.replace(/ · Total$/, '')) + '</div>';
  if(s.kind === 'parts'){
    html += s.partRecs.map(r => { const d = parsePersonalDetail(r) || {}; return '<div style="display:flex; justify-content:space-between; gap:8px; padding:3px 0;"><span>' + escapeHtml(r.item_name) + '</span><span style="font-weight:600;">' + (r.skipped ? '생략' : d.unfin ? '캡 · ' + (d.reps || 0) + '개' : escapeHtml(r.value)) + '</span></div>'; }).join('');
    html += '<div class="muted" style="font-size:12px; margin-top:8px;">파트마다 동작이 달라서 페이스 판정 대신 끝냈는지와 파트 시간만 봐요.</div>';
  } else {
    const t = s.hits ? s.hits.t : null;
    const vv = vals.filter(x => x != null);
    const ref = t || (vv.length ? vv.reduce((a, b) => a + b, 0) / vv.length : 0);
    const tol = paceTol(ref, s.unit);
    const maxDev = Math.max(tol * 2, ...vv.map(x => Math.abs(x - ref)));
    html += '<div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin:0 0 6px;"><span>' + (hb ? '적음' : '빠름') + '</span><span>' + (t ? '목표 ' : '평균 ') + fmtV(s, ref) + '</span><span>' + (hb ? '많음' : '느림') + '</span></div>';
    html += '<div style="display:flex; flex-direction:column; gap:8px; margin:0 0 14px;">' + vals.map((x, i) => {
      if(x == null) return '<div style="display:grid; grid-template-columns:36px minmax(0,1fr) 84px; align-items:center; gap:10px;"><span class="muted" style="font-size:12px;">' + (i + 1) + '세트</span><div style="height:10px; border-radius:5px; background:var(--surface-2);"></div><span class="muted" style="font-size:12px; text-align:right;">-</span></div>';
      const diff = x - ref;
      const ok = Math.abs(diff) <= tol;
      const worse = hb ? diff < 0 : diff > 0;
      const w = Math.max(3, Math.min(50, Math.abs(diff) / maxDev * 50));
      const color = ok ? 'var(--text-success)' : worse ? 'var(--text-danger)' : 'var(--border-accent)';
      const right = hb ? diff > 0 : diff > 0;
      const bandW = Math.min(50, tol / maxDev * 50);
      const dTxt = s.unit === 'time' ? (diff > 0 ? '+' : diff < 0 ? '−' : '±') + Math.abs(Math.round(diff)) + '초' : (diff > 0 ? '+' : diff < 0 ? '−' : '±') + Math.abs(Math.round(diff * 10) / 10);
      return '<div style="display:grid; grid-template-columns:36px minmax(0,1fr) 84px; align-items:center; gap:10px;">'
        + '<span class="muted" style="font-size:12px;">' + (i + 1) + '세트</span>'
        + '<div style="position:relative; height:10px; border-radius:5px; background:var(--surface-2); overflow:hidden;">'
        + '<span style="position:absolute; top:0; bottom:0; left:' + (50 - bandW) + '%; width:' + (bandW * 2) + '%; background:var(--text-success); opacity:0.1;"></span>'
        + '<span style="position:absolute; top:0; bottom:0; left:50%; width:1.5px; margin-left:-0.75px; background:var(--border-strong);"></span>'
        + '<span style="position:absolute; top:2px; bottom:2px; ' + (right ? 'left:50%;' : 'right:50%;') + ' width:' + w + '%; border-radius:3px; background:' + color + ';"></span>'
        + '</div>'
        + '<span style="font-size:12px; text-align:right; font-variant-numeric:tabular-nums;"><strong style="font-weight:600;">' + (s.unit === 'time' ? fmtClock(Math.round(x)) : Math.round(x)) + '</strong> <span style="color:' + (ok ? 'var(--text-success)' : 'var(--text-muted)') + '; font-size:11px;">' + (ok ? '✓' : dTxt) + '</span></span>'
        + '</div>';
    }).join('') + '</div>';
    if(s.pat) html += '<div style="padding:10px 12px; border-radius:var(--radius); background:var(--surface-2); margin:0 0 12px;"><div style="font-weight:600; font-size:13px;">' + s.pat.label + (s.speed ? ' · ' + ({ fast: hb ? '기준보다 많아요' : '기준보다 빨라요', similar: '기준과 비슷해요', slow: hb ? '기준보다 적어요' : '기준보다 느려요' }[s.speed]) : '') + '</div><div style="font-size:13px; line-height:1.5; margin-top:2px;">' + paceCoach(s.pat.key, s.speed) + '</div></div>';
    else html += '<div class="muted" style="font-size:13px; margin:0 0 12px;">세트가 3개 이상이면 패턴을 판정해요.</div>';
    const line = (k, v) => '<div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px; margin:0 0 6px;"><span class="muted">' + k + '</span><span style="text-align:right;">' + v + '</span></div>';
    const v = vals.filter(x => x != null);
    if(v.length >= 2) html += line('평균', '<strong style="font-weight:600;">' + fmtV(s, v.reduce((a, b) => a + b, 0) / v.length) + '</strong>');
    if(s.unit === 'time' && s.pat){
      let base = s.ref ? 1 / s.ref[0] : v.slice(1).reduce((a, b) => a + b, 0) / (v.length - 1);
      let note = s.ref ? '지난 기록 기준' : '참고용 · 이번 2세트 이후 평균';
      if(s.pat.key === 'even' && s.hits && s.hits.hit / s.hits.n >= 0.8){ base *= 0.985; note = '목표를 지켜서 1.5% 당김'; }
      html += line('다음 목표', '<strong style="font-weight:600;">' + fmtClock(Math.round(base)) + '</strong> <span class="muted" style="font-size:12px;">' + note + '</span>');
    } else if(s.machines && s.machines.length > 1 && Array.isArray(s.cals)){
      const per = s.machines.map((m, j) => { const c = s.cals.slice(1).map(rr => Array.isArray(rr) ? rr[j] : null).filter(x => x != null); return m + ' ' + (c.length ? Math.round(c.reduce((a, b) => a + b, 0) / c.length) : '-'); }).join(' · ');
      html += line('다음 목표', '<strong style="font-weight:600;">' + per + ' cal</strong>');
    } else if(s.pat && v.length >= 2){
      html += line('다음 목표', '<strong style="font-weight:600;">세트당 ' + Math.round(v.slice(1).reduce((a, b) => a + b, 0) / (v.length - 1)) + (s.unit === 'cal' ? ' cal' : '개') + '</strong> <span class="muted" style="font-size:12px;">이번 2세트 이후 평균</span>');
    }
    if(s.hits) html += line('목표 ' + fmtClock(s.hits.t), '<strong style="font-weight:600;">' + s.hits.hit + '/' + s.hits.n + '</strong> 세트 안에 들어왔어요');
    const same = list.filter(x => x.kind === s.kind && x.date <= s.date).slice(0, 4).reverse();
    if(same.length >= 2){
      const avgs = same.map(x => { const vv = x.vals.filter(y => y != null); return vv.length ? vv.reduce((a, b) => a + b, 0) / vv.length : null; });
      html += '<div style="margin:10px 0 0; padding-top:10px; border-top:0.5px solid var(--border);"><div class="muted" style="font-size:12px; margin-bottom:8px;">최근 ' + same.length + '번 평균</div><div style="display:flex; justify-content:space-between; gap:6px;">' + same.map((x, i) => '<div style="flex:1; text-align:center; font-size:12px;"><div style="width:8px; height:8px; border-radius:50%; margin:0 auto 4px; background:' + (x === s ? 'var(--border-accent)' : 'var(--border-strong)') + ';"></div><div style="font-weight:' + (x === s ? '600' : '400') + ';">' + fmtV(x, avgs[i]) + '</div><div class="muted">' + shortD(x.date) + '</div></div>').join('') + '</div></div>';
    }
    if(s.machines && s.machines.length > 1 && Array.isArray(s.cals)) html += '<div class="muted" style="font-size:12px; margin-top:8px;">' + s.machines.join('·') + '는 따로 계산해요. 세트별 ' + s.cals.map((rr, i) => (i + 1) + ': ' + (Array.isArray(rr) ? rr.map(x => x ?? '-').join('/') : rr)).join(' · ') + '</div>';
    if(s.kind === 'igug' && s.stops && s.items[0]){ const mv = igugMoves(s.items[0]); const st = s.stops.map((x, i) => x != null && x !== '' ? (i + 1) + ': ' + (x === 'all' ? '전부 완료' : (mv[+x] ? limName(mv[+x].label) : '')) : '').filter(Boolean); if(st.length) html += '<div class="muted" style="font-size:12px; margin-top:8px;">멈춘 동작 ' + escapeHtml(st.join(' · ')) + '</div>'; }
  }
  if(s.md && s.md.lim) html += '<div style="margin-top:10px; font-size:13px;"><span class="muted">아쉬운 동작</span> ' + escapeHtml(s.md.lim) + '</div>';
  if(s.md && s.md.notes) html += '<div style="margin-top:6px;"><span class="tag scaled" style="white-space:normal;">※ ' + escapeHtml(s.md.notes) + '</span></div>';
  if(s.items && s.items.length) html += '<button type="button" class="pres-toggle" style="margin-top:12px; height:auto; padding:0; border:none; background:none; box-shadow:none; font-size:12px; color:var(--border-accent);">운동 내용 보기</button><div class="pres-body" style="display:none;"><div style="padding-top:8px;">' + s.items.map(it => (s.items.length > 1 ? '<div style="font-weight:500; margin-top:6px;">' + escapeHtml(it.name) + '</div>' : '') + '<div class="muted">' + formatPrescribed(it.prescribed) + '</div>').join('') + '</div></div>';
  return '<div style="margin:8px 0 4px; padding:14px; border-radius:12px; background:var(--surface-1); font-size:13px; line-height:1.55;">' + html + '</div>';
}
