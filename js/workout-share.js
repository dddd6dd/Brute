/* JOGYM NOTE — workout image sharing. No database writes. */
(function () {
  'use strict';
    function shareEnglish(text) {
    return String(text == null ? '' : text)
      .replace(/시계\s*(\d+:\d{2})에\s*끝남/g, 'FINISH $1')
      .replace(/시계\s*(\d+:\d{2})에\s*멈춤/g, 'FINISH $1')
      .replace(/(?:타임\s*캡(?:\s*걸림)?|못\s*끝냄)\s*(\d+)\s*(?:개|회)/g, 'TC +$1')
      .replace(/타임\s*캡(?:\s*걸림)?|못\s*끝냄|캡/g, 'TC')
      .replace(/\bCAP\b/gi, 'TC')
      .replace(/(\d+)\s*세트/g, 'SET $1')
      .replace(/(\d+(?:\.\d+)?)\s*(?:회|개)/g, '$1 REPS')
      .replace(/원본 처방/g, 'WORKOUT')
      .replace(/웨이트\s*리프팅/g, 'WEIGHTLIFTING')
      .replace(/스트렝스/g, 'STRENGTH')
      .replace(/메트콘/g, 'METCON')
      .replace(/악세서리|액세서리/g, 'ACCESSORY')
      .replace(/웜업|워밍업/g, 'WARM UP')
      .replace(/개인 운동/g, 'PERSONAL')
      .replace(/기타/g, 'OTHER')
      .replace(/완료/g, 'DONE')
      .replace(/생략/g, 'SKIPPED')
      .replace(/총/g, 'TOTAL')
      .replace(/(\d)(kg|lbs?|cal|reps)\b/gi, (_, n, unit) =>
        n + ' ' + unit.toUpperCase())
      .replace(/\b(kg|lb|lbs|cal|reps|finish)\b/gi, word =>
        word.toUpperCase());
  }
  if (window.JogymWorkoutShare) return;

  const fonts = {
  "sans": "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif",
  "serif": "Georgia, Pretendard, serif",
  "inter": "\"JN Inter\", Pretendard, sans-serif",
  "montserrat": "\"JN Montserrat\", Pretendard, sans-serif",
  "bebasneue": "\"JN Bebas Neue\", Pretendard, sans-serif",
  "anton": "\"JN Anton\", Pretendard, sans-serif",
  "oswald": "\"JN Oswald\", Pretendard, sans-serif",
  "barlowcondensed": "\"JN Barlow Condensed\", Pretendard, sans-serif",
  "spacegrotesk": "\"JN Space Grotesk\", Pretendard, sans-serif",
  "mono": "\"JN JetBrains Mono\", Pretendard, sans-serif",
  "ibmplexmono": "\"JN IBM Plex Mono\", Pretendard, sans-serif",
  "dmserifdisplay": "\"JN DM Serif Display\", Pretendard, sans-serif",
  "playfairdisplay": "\"JN Playfair Display\", Pretendard, sans-serif",
  "archivoblack": "\"JN Archivo Black\", Pretendard, sans-serif",
  "robotoslab": "\"JN Roboto Slab\", Pretendard, sans-serif",
  "silkscreen": "\"JN Silkscreen\", Pretendard, sans-serif"
};
  const fontLabels = {
  "sans": "Pretendard",
  "serif": "Georgia",
  "inter": "Inter",
  "montserrat": "Montserrat",
  "bebasneue": "Bebas Neue",
  "anton": "Anton",
  "oswald": "Oswald",
  "barlowcondensed": "Barlow Condensed",
  "spacegrotesk": "Space Grotesk",
  "mono": "JetBrains Mono",
  "ibmplexmono": "IBM Plex Mono",
  "dmserifdisplay": "DM Serif Display",
  "playfairdisplay": "Playfair Display",
  "archivoblack": "Archivo Black",
  "robotoslab": "Roboto Slab",
  "silkscreen": "Silkscreen"
};
  const styles = [
  {
    "name": "미니멀",
    "layout": "flow",
    "font": "inter",
    "titleFont": "inter",
    "recordFont": "inter",
    "body": 20,
    "record": 20,
    "section": 22,
    "gap": 20
  },
  {
    "name": "트레이닝 로그",
    "layout": "table",
    "font": "inter",
    "titleFont": "spacegrotesk",
    "recordFont": "mono",
    "body": 20,
    "record": 20,
    "section": 22,
    "gap": 8
  },
  {
    "name": "기록 중심",
    "layout": "focus",
    "font": "inter",
    "titleFont": "montserrat",
    "recordFont": "barlowcondensed",
    "body": 20,
    "record": 42,
    "section": 24,
    "gap": 28,
    "boldRecord": true
  },
  {
    "name": "에디토리얼",
    "layout": "flow",
    "font": "playfairdisplay",
    "titleFont": "dmserifdisplay",
    "recordFont": "playfairdisplay",
    "body": 20,
    "record": 26,
    "section": 30,
    "gap": 24,
    "center": true
  },
  {
    "name": "포스터",
    "layout": "poster",
    "font": "mono",
    "titleFont": "archivoblack",
    "recordFont": "mono",
    "body": 20,
    "record": 22,
    "section": 76,
    "gap": 16,
    "upperBody": true,
    "accent": true,
    "boldRecord": true
  },
  {
    "name": "타임라인",
    "layout": "timeline",
    "font": "inter",
    "titleFont": "oswald",
    "recordFont": "spacegrotesk",
    "body": 20,
    "record": 22,
    "section": 36,
    "gap": 16,
    "accent": true
  },
  {
    "name": "스코어카드",
    "layout": "cards",
    "font": "inter",
    "titleFont": "montserrat",
    "recordFont": "barlowcondensed",
    "body": 18,
    "record": 34,
    "section": 28,
    "gap": 18,
    "boldRecord": true
  },
  {
    "name": "티켓",
    "layout": "ticket",
    "font": "inter",
    "titleFont": "bebasneue",
    "recordFont": "oswald",
    "body": 18,
    "record": 28,
    "section": 44,
    "gap": 16,
    "boldRecord": true,
    "accent": true
  },
  {
    "name": "영수증",
    "layout": "receipt",
    "font": "ibmplexmono",
    "titleFont": "ibmplexmono",
    "recordFont": "ibmplexmono",
    "body": 18,
    "record": 20,
    "section": 24,
    "gap": 18,
    "upperBody": true
  },
  {
    "name": "대시보드",
    "layout": "dashboard",
    "font": "inter",
    "titleFont": "spacegrotesk",
    "recordFont": "barlowcondensed",
    "body": 20,
    "record": 32,
    "section": 30,
    "gap": 20,
    "boldRecord": true,
    "accent": true
  }
];
  const sizes = {
    portrait: [1080, 1920],
    landscape: [1920, 1080],
    crop: [1080, 1920]
  };

  function sec(s) {
    return String(s || '기타').replace(/^\s*\d+[.)]\s*/, '').trim();
  }
  function personal(r) {
    try {
      return String(r.scale_detail || '').startsWith('§')
        ? JSON.parse(r.scale_detail.slice(1)) : null;
    } catch (_) {
      return null;
    }
  }
  function weight(v, unit) {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return Math.round((unit === 'lb' ? n / 0.45359237 : n) * 10) / 10
      + ' ' + unit;
  }
  function value(r, unit) {
    if (r.type === 'weight') return weight(r.value, unit);
    const raw = String(r.value == null ? '' : r.value);
    if (r.type === 'for_time' && /^0+:0+$/.test(raw)) return '완료';
    const suffix = { reps: '회', calories: 'cal' }[r.type];
    return suffix && /^\d+(\.\d+)?$/.test(raw)
      ? raw + ' ' + suffix : raw;
  }

  // Personal Training: rebuild the format line + movements from the saved entry so the share shows what was done.
  function personalPrescription(p, unit) {
    const f = (p && p.f) || {}, out = [];
    const moves = Array.isArray(p.moves) ? p.moves : [];
    const moveLine = m => [m.r, m.n].filter(v => v != null && v !== '').join(' ')
      + (m.kg != null ? ' @ ' + weight(m.kg, unit) : '');
    if (f.t === 'fortime') {
      const rounds = parseInt(f.rounds);
      out.push(rounds > 1 ? rounds + ' ROUNDS FOR TIME' : 'FOR TIME');
      moves.forEach(m => out.push(moveLine(m)));
    } else if (f.t === 'amrap') {
      out.push('AMRAP' + (parseInt(f.dur) ? ' ' + parseInt(f.dur) + ' MIN' : ''));
      moves.forEach(m => out.push(moveLine(m)));
    } else if (f.t === 'emom') {
      const every = parseInt(f.every) || 1, rounds = parseInt(f.rounds);
      out.push((every === 1 ? 'EMOM' : 'E' + every + 'MOM') + (rounds ? ' ' + every * rounds + ' MIN' : ''));
      moves.forEach(m => out.push(moveLine(m)));
    } else if (f.t === 'accessory' || f.t === 'lifting') {
      const sets = Array.isArray(p.sets) ? p.sets : [];
      const key = s => (s.kg != null ? s.kg : '') + '|' + (s.r || '');
      if (sets.length > 1 && sets.every(s => key(s) === key(sets[0]))) {
        const s0 = sets[0];
        out.push(sets.length + ' × ' + (s0.r || '?') + (s0.kg != null ? ' @ ' + weight(s0.kg, unit) : ''));
      } else sets.forEach((s, i) => out.push('SET ' + (i + 1) + '  '
        + (s.kg != null ? weight(s.kg, unit) + (s.r ? ' × ' + s.r : '') : (s.r || '') + ' REPS')));
    } else if (f.t === 'skill') {
      String(p.notes || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(l => out.push(l));
    }
    return out.join('\n');
  }
  function personalHasName(p, name) {
    const f = (p && p.f) || {};
    if (f.t === 'accessory' || f.t === 'lifting' || f.t === 'skill') return true;
    const auto = (Array.isArray(p.moves) ? p.moves : []).map(m => m.n).join(' + ');
    return !!name && name !== auto && !/^(?:For Time|AMRAP|E\d*MOM)$/i.test(name);
  }

  function buildEntries(records, items, unit) {
    const out = [], map = new Map();
    const program = (Array.isArray(items) ? items : [])
      .filter(it => it && it.name);
    const longest = program.slice()
      .sort((a, b) => b.name.length - a.name.length);

    (records || []).filter(r => !r.skipped).forEach(r => {
      const item = longest.find(it =>
        r.item_name === it.name ||
        String(r.item_name).startsWith(it.name + ' - ')
      );
      const name = item ? item.name : String(r.item_name || '운동');
      const section = sec(r.section || (item && item.section));
      const key = section + '\n' + name;
      let entry = map.get(key);
      const p = personal(r), detail = [];
      const isPersonal = !item && /^personal$/i.test(section) && p && p.f;
      if (!entry) {
        entry = {
          key, section, name,
          prescribed: item ? String(item.prescribed || '')
            : isPersonal ? personalPrescription(p, unit) : '',
          personalName: isPersonal && personalHasName(p, name) ? name : '',
          rawLines: isPersonal && p.f.t === 'skill',
          personalLines: !!isPersonal,
          rows: []
        };
        map.set(key, entry);
        out.push(entry);
      }

      if (p && !isPersonal) {
        if (p.spec) detail.push(String(p.spec));
        if (Array.isArray(p.sets)) p.sets.forEach((s, i) => {
          if (s.kg != null) {
            detail.push(
              (i + 1) + '세트  ' + weight(s.kg, unit)
              + (s.r != null ? ' × ' + s.r : '')
            );
          } else if (s.r != null) {
            detail.push((i + 1) + '세트  ' + s.r + '회');
          }
        });
        if (Array.isArray(p.moves)) p.moves.forEach(m => {
          detail.push(
            [m.r, m.n].filter(v => v != null && v !== '').join(' ')
            + (m.kg != null ? ' @ ' + weight(m.kg, unit) : '')
          );
        });
      }

      const suffix = item && r.item_name !== item.name
        ? String(r.item_name).slice(item.name.length + 3) : '';
      const note = isPersonal && p.f.t === 'skill' ? '' : p ? String(p.notes || '')
        : String(r.scale_detail || '').startsWith('§')
          ? '' : String(r.scale_detail || '');

      entry.rows.push({
        label: suffix,
        value: isPersonal && (r.type === 'note' || p.f.t === 'accessory' || p.f.t === 'lifting') ? ''
          : isPersonal && r.type === 'amrap' ? value(r, unit).replace(/\brounds?\b/i, 'ROUNDS') : value(r, unit),
        detail,
        note
      });
    });


    program.filter(it =>
      /warm\s*-?\s*up|웜업|워밍업/i.test(sec(it.section))
    ).forEach(it => {
      const section = sec(it.section);
      const key = section + '\n' + it.name;
      if (!map.has(key)) {
        const entry = {
          key, section, name: it.name,
          prescribed: String(it.prescribed || ''),
          rows: []
        };
        map.set(key, entry);
        out.push(entry);
      }
    });

    const order = new Map(program.map((it, i) => [it.name, i]));
    out.sort((a, b) =>
      (order.has(a.name) ? order.get(a.name) : 1e6)
      - (order.has(b.name) ? order.get(b.name) : 1e6)
    );
    out.forEach(e => e.rows.sort((a, b) => {
      const ar = a.label.match(/^(\d+)R$/);
      const br = b.label.match(/^(\d+)R$/);
      if (ar && br) return +ar[1] - +br[1];
      return !a.label ? -1 : !b.label ? 1 : 0;
    }));
    return out;
  }

  function node(tag, text, parent) {
    const e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function wrap(ctx, text, max) {
    const lines = [];
    String(text).split(/\r?\n/).forEach(part => {
      let line = '';
      part.trim().split(/\s+/).forEach(word => {
        const candidate = line ? line + ' ' + word : word;
        if (ctx.measureText(candidate).width <= max) { line = candidate; return; }
        if (line) { lines.push(line); line = ''; }
        // Keep movement names readable; split only a token wider than the column.
        Array.from(word).forEach(ch => {
          if (line && ctx.measureText(line + ch).width > max) {
            lines.push(line); line = ch;
          } else line += ch;
        });
      });
      lines.push(line);
    });
    return lines;
  }

  // The image and copied text share this presentation model. Stored records stay intact.
  function prescriptionLines(text) {
    if (typeof splitPrescribedLines === 'function') return splitPrescribedLines(text);
    return String(text || '').replace(/\r\n?/g, '\n').replace(/\\n/g, '\n')
      .split('\n').map(line => line.trim()).filter(Boolean);
  }

  function visiblePrescriptionLines(text, showIntent) {
    const lines = prescriptionLines(text);
    if (showIntent) return lines;
    let inIntent = false;
    const coaching = /의도|목표|목적|자극|포커스|전환|기록|설명|안내|동작(?:은|을|이)|호흡(?:은|을)|페이스(?:는|를)|빠르게|짧게|천천히|일정하게|전체\s*시간/;
    function isWorkout(line) {
      line = String(line).trim().replace(/^[^\p{L}\p{N}]+/u, '');
      if (coaching.test(line)) return false;
      if (!/[가-힣]/.test(line)) return /[A-Za-z]{3}/.test(line);
      return /^\d+(?:[-–/x.:]\d+)*(?:\s*(?:cal|kg|lbs?|cm|m|ft))?\s+[A-Za-z]/i.test(line)
        || /^\d+(?:[-–/x]\d+)*\s*(?!(?:세트|라운드|분|초|회|개))[가-힣][가-힣\s]*$/.test(line)
        || /^[가-힣\s]+\s+\d+(?:[-–/]\d+)*(?:\s*(?:회|개|kg|lbs?|미터|m))?$/i.test(line);
    }
    return lines.flatMap(line => {
      const plain = String(line).trim().replace(/^\d+[.)]\s*/, '')
        .replace(/^[^\p{L}\p{N}]+/u, '').replace(/[\[\]()*_]/g, '').trim();
      const heading = /^(?:(?:오늘의|운동|와드|훈련|WOD)\s*)?(?:의도|목적|자극|포커스|목표(?:\s*(?:기록|시간|페이스))?|intent(?:ion)?|stimulus|goal|target)(?=$|[\s:：/·-]|은|는|를|을)/i.test(plain);
      if (heading) { inIntent = true; return []; }
      if (!plain) return [];
      if (inIntent && /^\d+(?:\s*[-–~]\s*\d+)?\s*(?:분|초|minutes?|mins?|seconds?|secs?)(?:\s*(?:이내|정도|안에).*)?\s*$/i.test(plain)) return [];
      // Korean coaching/recording directions are optional, including numeric prose.
      // Preserve actual quantified movements and the English prescription alongside them.
      let visible = String(line).trim().replace(/\s*[([]([^\])]*[가-힣][^\])]*)[)\]]/g, (whole, note) =>
        coaching.test(note) || !/\d/.test(note) ? '' : whole);
      const marker = visible.search(coaching);
      if (marker >= 0) {
        const prefix = visible.slice(0, marker).replace(/[\s,:：;·/—–-]+$/g, '');
        visible = isWorkout(prefix) ? prefix : '';
      }
      if (visible && /[가-힣]/.test(visible) && !isWorkout(visible)) return [];
      if (!visible) return [];
      inIntent = false;
      return [visible];
    });
  }

  function labelKey(text) {
    return String(text || '').replace(/^\s*(?:\d+|[A-Za-z])[.)]\s*/, '')
      .trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function restDuration(line) {
    // Only whole, unambiguous between-session instructions can be consolidated.
    // Rest inside sets/rounds or qualified instructions must remain in their source.
    const match = String(line).match(/^(?:[-*•]\s*)?(?:BT\s+)?REST\s*:?\s*(\d+(?:\.\d+)?)(?::([0-5]\d)|\s*(MIN(?:UTE)?S?|MINS?|SEC(?:OND)?S?|SECS?))\s*(?:between\s+(?:each\s+)?(?:for\s*time\s+)?(?:parts?|sessions?|sections?))?\.?$/i);
    if (!match || (match[2] != null && match[1].includes('.'))) return null;
    const seconds = match[2] != null ? Number(match[1]) * 60 + Number(match[2])
      : Number(match[1]) * (/^sec/i.test(match[3]) ? 1 : 60);
    return Number.isInteger(seconds) && seconds > 0 ? seconds : null;
  }

  function composeShare(entries, cfg, date, items) {
    const program = Array.isArray(items) ? items : [];
    const groups = new Map();
    entries.forEach(entry => {
      const total = /(?:\s*·\s*|^)total$/i.test(entry.name.trim());
      const base = entry.name.replace(/\s*·\s*total$/i, '');
      const item = program.find(it => it && sec(it.section) === entry.section &&
        (it.name === entry.name || (total && labelKey(it.subsection || it.section) === labelKey(base))));
      const key = entry.section + '\n' + (item ? item.subsection || '' : '');
      if (!groups.has(key)) groups.set(key, []);
      const lines = (cfg.prescribed || !entry.rows.length || entry.personalLines) && entry.prescribed
        ? (entry.rawLines ? prescriptionLines(entry.prescribed) : visiblePrescriptionLines(entry.prescribed, cfg.intent)).filter(line => !/^\s*(?:WORKOUT|원본 처방)\s*:?\s*$/i.test(line)) : [];
      const internalRest = lines.some(line => /^(?:\d+\s*(?:sets?|rounds?)\b|EMOM\b|E\d+MOM\b|every\b)/i.test(line));
      const rests = lines.map((line, index) => ({ index, seconds: restDuration(line) }))
        .filter(rest => rest.seconds != null);
      groups.get(key).push({ entry, total, lines, rests, internalRest,
        eligible: !total && /metcon|메트콘/i.test(entry.section) && (!item || !item.type || item.type === 'for_time') });
    });

    const blocks = [];
    const addBlock = lines => { if (lines.length) blocks.push({ lines }); };
    if (cfg.date && date) addBlock([{ text: shareEnglish(date), role: 'date' }]);
    let previous = '';
    groups.forEach(group => {
      const section = group[0].entry.section;
      if (cfg.sections && previous !== section) {
        addBlock([{ text: shareEnglish(section).toUpperCase(), role: 'section' }]);
        previous = section;
      }
      const sessions = group.filter(part => !part.total);
      const commonFormat = sessions.length >= 2 && sessions.every(part => /^each\s+for\s+time\s*:?$/i.test(part.lines[0] || ''));
      if (commonFormat) addBlock([{ text: 'EACH FOR TIME', role: 'format' }]);
      const rests = sessions.flatMap(part => part.rests);
      const sharedRest = sessions.filter(part => part.rests.length).length >= 2 && rests.length >= 2 &&
        sessions.every(part => part.eligible && !part.internalRest) &&
        sessions.every(part => part.lines.every((line, i) => !/\bREST\b/i.test(line) || part.rests.some(rest => rest.index === i))) &&
        rests.every(rest => rest.seconds === rests[0].seconds) ? rests[0].seconds : null;
      group.forEach(part => {
        const { entry } = part;
        const lines = part.lines.filter((_, i) => !(commonFormat && !part.total && i === 0) && !(sharedRest != null && part.rests.some(rest => rest.index === i)))
          .map(text => ({ text: entry.personalLines && !entry.rawLines ? shareEnglish(text) : text, role: /^(?:each for time|for time|\d+\s*(?:sets?|rounds?)|E\d*MOM|AMRAP|time cap)\b/i.test(text) ? 'format' : 'body' }));
        if (entry.personalName && lines.length) lines.unshift({ text: entry.personalName, role: 'label' });
        else if (!part.total && !commonFormat && !entry.personalLines && lines.length
          && labelKey(entry.name) !== labelKey(entry.section)
          && !labelKey(lines[0].text).includes(labelKey(entry.name))) {
          lines.unshift({ text: entry.name, role: 'label' });
        }
        if (part.total) {
          lines.length = 0;
          if (cfg.records && entry.rows.length) lines.push({ text: 'TOTAL', role: 'label' });
        } else if (!lines.length && labelKey(entry.name) !== labelKey(entry.section)) {
          // With original hidden or missing, keep a quiet identifier rather than a headline.
          lines.push({ text: entry.name, role: 'label' });
        }
        const shown = lines.map(line => line.text.toLowerCase());
        entry.rows.forEach(row => {
          const v = shareEnglish(row.value);
          row.shareValue = v;
          row.shareDetail = row.detail.map(text => {
            let d = shareEnglish(text);
            if (v && d.startsWith(v + ' (')) { row.shareValue = d; return ''; }
            if (v) d = d.split(' · ').filter(seg => seg !== v).join(' · ');
            if (v && d === 'FINISH ' + v) return '';
            if (!d || d === v || shown.some(s => s.includes(d.toLowerCase()))) return '';
            return d;
          }).filter(Boolean);
        });
        const records = cfg.records ? entry.rows.filter(row => row.value !== '') : [];
        if (records.length === 1 && lines.length) {
          const row = records[0];
          lines[0].value = (row.label ? shareEnglish(row.label) + ' · ' : '') + row.shareValue;
        } else records.forEach(row => lines.push({
          text: (row.label ? shareEnglish(row.label) + ' · ' : '') + row.shareValue, role: 'record'
        }));
        const notes = new Set();
        entry.rows.forEach(row => {
          if (cfg.details) row.shareDetail.forEach(text => lines.push({ text, role: 'detail' }));
          if (cfg.notes && row.note && !notes.has(row.note)) {
            lines.push({ text: '※ ' + row.note, role: 'note' });
            notes.add(row.note);
          }
        });
        addBlock(lines);
      });
      if (sharedRest != null) {
        // Keep the footer with the last session/summary when that block fits on a page.
        const last = blocks[blocks.length - 1];
        last.lines.push({ text: 'BT REST ' + Math.floor(sharedRest / 60) + ':' + String(sharedRest % 60).padStart(2, '0'), role: 'rest' });
      }
    });
    if (cfg.foot.trim()) addBlock([{ text: cfg.foot.trim(), role: 'foot' }]);
    return blocks;
  }

  function renderPages(blocks, cfg, style, firstOnly) {
    const theme = styles[style], mode = theme.layout;
    const [width, height] = sizes[cfg.size];
    const W = width / 2, H = height / 2, pad = 34, usable = W - pad * 2;
    const scale = cfg.fontSize / 40;
    const measure = document.createElement('canvas').getContext('2d');
    measure.textBaseline = 'top';
    const chunks = [];
    let sequence = 0;
    const accent = cfg.accent === 'same' ? cfg.color : cfg.accent;
    const headerKey = cfg.titleFont || cfg.font, recordKey = cfg.recordFont || cfg.font;
    function styleFor(role) {
      return { key: role === 'section' ? headerKey : role === 'record' ? recordKey : cfg.font,
        size: (role === 'section' ? theme.section : role === 'record' ? theme.record : /^(date|format|detail|note|rest|foot)$/.test(role) ? 14 : theme.body) * scale,
        weight: role === 'section' || role === 'format' || (role === 'record' && theme.boldRecord) ? 700 : 400,
        color: role === 'format' && theme.accent ? accent : cfg.color,
        alpha: /^(date|detail|note|rest|foot)$/.test(role) ? .78 : 1 };
    }
    function text(ops, string, x, y, maxWidth, role, extra) {
      const spec = Object.assign(styleFor(role), extra);
      const sizeGroup = spec.sizeGroup || (role === 'section' ? 'title' : role === 'record' ? 'record' : 'body');
      spec.size *= cfg.sizeAdjust && cfg.sizeAdjust[sizeGroup] || 1;
      measure.font = spec.weight + ' ' + spec.size + 'px ' + fonts[spec.key];
      if (spec.fit && measure.measureText(string).width > maxWidth) {
        spec.size *= maxWidth / measure.measureText(string).width;
        measure.font = spec.weight + ' ' + spec.size + 'px ' + fonts[spec.key];
      }
      const lines = wrap(measure, string, maxWidth);
      const lineH = spec.size * 1.42 + 2 * scale;
      lines.forEach((value, i) => ops.push({ type: 'text', text: value, x: spec.align === 'right' ? x + maxWidth : spec.align === 'center' ? x + maxWidth / 2 : x,
        y: y + i * lineH, role, spec: Object.assign({}, spec), h: lineH }));
      return lines.length * lineH;
    }
    function shape(ops, type, props) { ops.push(Object.assign({ type, color: cfg.color, alpha: .38 }, props)); }
    function flow(lines, x, maxWidth, ops, startY, center) {
      let y = startY;
      lines.forEach(line => {
        const string = theme.upperBody && line.role === 'body' ? line.text.toUpperCase() : line.text;
        if (line.value && !center) {
          const scoreStyle = styleFor('record');
          scoreStyle.size *= cfg.sizeAdjust && cfg.sizeAdjust.record || 1;
          measure.font = scoreStyle.weight + ' ' + scoreStyle.size + 'px ' + fonts[scoreStyle.key];
          const reserved = measure.measureText(line.value).width + 20 * scale;
          if (reserved < maxWidth * .52) {
            const leftH = text(ops, string, x, y, maxWidth - reserved, line.role);
            const rightH = text(ops, line.value, x + maxWidth - reserved + 12 * scale, y, reserved - 12 * scale, 'record', { align: 'right' });
            y += Math.max(leftH, rightH);
            return;
          }
        }
        y += text(ops, string, x, y, maxWidth, line.role, { align: center ? 'center' : 'left' });
        if (line.value) y += text(ops, line.value, x, y + 4, maxWidth, 'record', { align: center ? 'center' : 'right' }) + 4;
      });
      return y;
    }
    function split(lines) {
      const source = [], scores = [];
      lines.forEach(line => {
        if (line.role === 'record') scores.push(line.text);
        else { source.push({ text: line.text, role: line.role }); if (line.value) scores.push(line.value); }
      });
      return { source, scores };
    }
    function sourceFlow(lines, x, w, ops, y, extra) {
      lines.forEach(line => { y += text(ops, theme.upperBody && line.role === 'body' ? line.text.toUpperCase() : line.text, x, y, w, line.role, extra); });
      return y;
    }
    function isSession(block) { return block.lines.some(line => /^(body|label|record|detail|note)$/.test(line.role)); }
    function isTotal(block) { return block.lines[0] && block.lines[0].text === 'TOTAL' && block.lines[0].role === 'label'; }
    function add(ops, h, original, keep) { chunks.push({ ops, h: h + theme.gap * scale, original, keep }); }
    function session(block, index, x, w, variant) {
      const ops = [], { source, scores } = split(block.lines);
      const inset = 16 * scale, scoreW = w * .31;
      let h;
      if (variant === 'table') {
        const leftW = w - scoreW - 24 * scale;
        const bodyH = sourceFlow(source, x + 8, leftW - 8, ops, 10 * scale);
        let scoreH = 10 * scale;
        scores.forEach(score => { scoreH += text(ops, score, x + w - scoreW + 8, scoreH, scoreW - 16, 'record', { align: 'right', fit: true }); });
        h = Math.max(bodyH, scoreH) + 14 * scale;
        shape(ops, 'line', { x1: x, y1: h, x2: x + w, y2: h });
        shape(ops, 'line', { x1: x + w - scoreW, y1: 0, x2: x + w - scoreW, y2: h, alpha: .2 });
      } else if (variant === 'focus') {
        const leftW = w * .34;
        let scoreH = 0;
        scores.forEach(score => { scoreH += text(ops, score, x, scoreH, leftW - 12, 'record', { fit: true }); });
        const bodyH = sourceFlow(source, scores.length ? x + leftW + 12 : x, scores.length ? w - leftW - 12 : w, ops, 0);
        h = Math.max(scoreH, bodyH) + 10;
      } else if (variant === 'timeline') {
        const gutter = 44 * scale;
        h = flow(block.lines, x + gutter, Math.max(40, w - gutter), ops, 0, false) + 12 * scale;
        shape(ops, 'line', { x1: x + 9, y1: 9, x2: x + 9, y2: h + theme.gap * scale, color: accent, alpha: .55 });
        shape(ops, 'circle', { x: x + 9, y: 9, radius: 4, color: accent, alpha: 1 });
        text(ops, String(index).padStart(2, '0'), x + 18, 0, Math.max(24, gutter - 21), 'date', { size: 10 * scale, fit: true, color: accent, alpha: 1 });
      } else if (variant === 'ticket') {
        const stub = w * .3;
        let scoreH = 18 * scale;
        text(ops, String(index).padStart(2, '0'), x + w - stub + inset, scoreH, stub - inset * 2, 'date', { align: 'center', color: accent, alpha: 1 });
        scoreH += 26 * scale;
        scores.forEach(score => { scoreH += text(ops, score, x + w - stub + inset, scoreH, stub - inset * 2, 'record', { align: 'center', fit: true }); });
        const bodyH = sourceFlow(source, x + inset, w - stub - inset * 2, ops, inset);
        h = Math.max(bodyH, scoreH) + inset;
        shape(ops, 'ticket', { x, y: 0, w, h, alpha: .65 });
        shape(ops, 'line', { x1: x + w - stub, y1: 8, x2: x + w - stub, y2: h - 8, dash: [3, 4], alpha: .6 });
      } else if (variant === 'cards') {
        text(ops, String(index).padStart(2, '0'), x + inset, inset, w - inset * 2, 'date', { color: accent, alpha: 1 });
        let scoreH = inset + 24 * scale;
        scores.forEach(score => { scoreH += text(ops, score, x + inset, scoreH, w - inset * 2, 'record', { fit: true, size: 34 * scale }); });
        const bodyStart = scoreH + (scores.length ? 12 : 0) * scale;
        h = sourceFlow(source, x + inset, w - inset * 2, ops, bodyStart) + inset;
        shape(ops, 'rect', { x, y: 0, w, h, radius: 14, alpha: .6 });
        if (scores.length) shape(ops, 'line', { x1: x + inset, y1: scoreH + 4 * scale, x2: x + w - inset, y2: scoreH + 4 * scale, alpha: .3 });
      } else {
        h = flow(block.lines, x, w, ops, 0, theme.center);
        if (variant === 'receipt') shape(ops, 'line', { x1: x, y1: h + 8, x2: x + w, y2: h + 8, dash: [2, 4], alpha: .65 });
      }
      return { ops, h, original: block.lines };
    }
    const columnW = mode === 'receipt' ? usable * .74 : usable;
    const left = pad + (usable - columnW) / 2;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i], first = block.lines[0];
      if (first.role === 'date' && block.lines.length === 1) {
        const ops = [];
        let h = text(ops, first.text, left, 0, columnW, 'date', { key: mode === 'poster' ? 'silkscreen' : cfg.font, align: mode === 'receipt' || theme.center ? 'center' : 'left' });
        if (mode === 'poster' && /^\d{4}-\d{2}-\d{2}$/.test(first.text)) {
          const d = new Date(first.text + 'T00:00:00Z');
          const day = ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()];
          h += text(ops, day, left, h + 2, columnW, 'date', { key: headerKey, size: 18 * scale, sizeGroup: 'title', weight: 700, alpha: 1 });
        }
        add(ops, h, block.lines); continue;
      }
      if (first.role === 'section' && block.lines.length === 1) {
        const ops = [];
        const next = blocks[i + 1];
        const format = next && next.lines.length === 1 && next.lines[0].role === 'format' ? next.lines[0] : null;
        let h = 0;
        if (mode === 'poster' && format) { h += text(ops, format.text, left, h, columnW, 'format', { key: headerKey, color: accent, alpha: 1 }); i++; }
        h += text(ops, first.text, left, h, columnW, 'section', { fit: true, align: theme.center || mode === 'receipt' ? 'center' : 'left' });
        if (mode === 'table') {
          h += 12 * scale;
          text(ops, 'MOVEMENT', left + 8, h, columnW * .62, 'format', { size: 10 * scale, alpha: .7 });
          if (cfg.records) text(ops, 'RESULT', left + columnW * .7, h, columnW * .3 - 8, 'format', { size: 10 * scale, align: 'right', alpha: .7 });
          h += 22 * scale;
          shape(ops, 'line', { x1: left, y1: h, x2: left + columnW, y2: h, alpha: .6 });
        }
        add(ops, h, format && mode === 'poster' ? [format, first] : block.lines, true); continue;
      }
      if (mode === 'cards' && isSession(block) && !isTotal(block)) {
        const batch = [block];
        if (blocks[i + 1] && isSession(blocks[i + 1]) && !isTotal(blocks[i + 1])) batch.push(blocks[++i]);
        const gap = 16, w = (usable - gap) / 2, parts = batch.map((b, j) => session(b, ++sequence, pad + j * (w + gap), w, 'cards'));
        const h = Math.max(...parts.map(part => part.h));
        parts.forEach(part => { const rect = part.ops.find(op => op.type === 'rect'); if (rect) rect.h = h; });
        add(parts.flatMap(part => part.ops), h, batch.flatMap(b => b.lines)); continue;
      }
      if (mode === 'dashboard' && isSession(block) && !isTotal(block)) {
        const batch = [block];
        while (batch.length < 3 && blocks[i + 1] && isSession(blocks[i + 1]) && !isTotal(blocks[i + 1])) batch.push(blocks[++i]);
        const ops = [], gap = 12, tileW = (usable - gap * (batch.length - 1)) / batch.length;
        const parts = batch.map(b => ({ lines: b.lines, index: ++sequence, ...split(b.lines) }));
        let tileH = 40 * scale;
        parts.forEach((part, j) => {
          const x = pad + j * (tileW + gap); text(ops, String(part.index).padStart(2, '0'), x + 12, 12, tileW - 24, 'date', { color: accent, alpha: 1 });
          let y = 38 * scale;
          part.scores.forEach(score => { y += text(ops, score, x + 12, y, tileW - 24, 'record', { fit: true, size: 32 * scale }); });
          tileH = Math.max(tileH, y + 16);
        });
        parts.forEach((part, j) => shape(ops, 'rect', { x: pad + j * (tileW + gap), y: 0, w: tileW, h: tileH, radius: 12, alpha: .6 }));
        let y = tileH + 22 * scale;
        parts.forEach(part => {
          text(ops, String(part.index).padStart(2, '0'), pad, y, 30 * scale, 'date', { color: accent, alpha: 1 });
          y = sourceFlow(part.source, pad + 40 * scale, usable - 40 * scale, ops, y) + 16 * scale;
        });
        add(ops, y, batch.flatMap(b => b.lines)); continue;
      }
      if (isSession(block)) {
        const variant = isTotal(block) ? 'flow' : mode;
        const chunk = session(block, ++sequence, left, columnW, variant);
        add(chunk.ops, chunk.h, chunk.original);
      } else {
        const ops = [], h = flow(block.lines, left, columnW, ops, 0, theme.center || mode === 'receipt');
        add(ops, h, block.lines);
      }
    }

    const pages = [], contentLimit = H - pad - 30, capacity = contentLimit - pad;
    let ops = [], y = pad;
    function flush() { if (ops.some(op => op.type === 'text')) pages.push({ ops, y }); ops = []; y = pad; }
    function place(chunk) {
      if (y + chunk.h > contentLimit && ops.length) flush();
      chunk.ops.forEach(op => {
        const moved = Object.assign({}, op);
        if (op.y != null) moved.y += y;
        if (op.y1 != null) { moved.y1 += y; moved.y2 += y; }
        ops.push(moved);
      }); y += chunk.h;
    }
    chunks.forEach((chunk, ci) => {
      const following = chunks[ci + 1];
      if (chunk.keep && following && ops.length && y + chunk.h + Math.min(following.h, capacity * .3) > contentLimit) flush();
      if (chunk.h <= capacity) { place(chunk); return; }
      // Very long content keeps every line, using plain continuation rows across pages.
      if (ops.length) flush();
      const compactOps = [];
      flow(chunk.original, pad, usable, compactOps, 0, false);
      // A record shares the first source row even when that source spans many pages.
      compactOps.sort((a, b) => a.y - b.y);
      const pieceHeight = piece => Math.max(...piece.map(op => op.y + op.h)) + 12;
      let start = 0, piece = [];
      compactOps.forEach(op => {
        if (op.y + op.h - start > capacity && piece.length) { place({ ops: piece, h: pieceHeight(piece) }); flush(); piece = []; start = op.y; }
        piece.push(Object.assign({}, op, { y: op.y - start }));
      });
      if (piece.length) place({ ops: piece, h: pieceHeight(piece) });
    });
    flush();
    return (firstOnly ? pages.slice(0, 1) : pages).map((page, index) => {
      const logicalH = cfg.size === 'crop' ? Math.min(H, Math.max(160, page.y + pad + 22)) : H;
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = Math.round(logicalH * 2);
      const ctx = canvas.getContext('2d'); ctx.scale(2, 2); ctx.textBaseline = 'top';
      if (pages.length > 1) page.ops.push({ type: 'text', text: (index + 1) + ' / ' + pages.length, x: W - pad, y: logicalH - pad, role: 'foot',
        spec: { key: cfg.font, size: 12 * scale * (cfg.sizeAdjust && cfg.sizeAdjust.body || 1), weight: 400, color: cfg.color, alpha: 1, align: 'right' } });
      if (cfg.background === 'photo' && cfg.photoImage) {
        const image = cfg.photoImage, factor = Math.max(W / image.naturalWidth, logicalH / image.naturalHeight);
        const w = image.naturalWidth * factor, h = image.naturalHeight * factor;
        ctx.drawImage(image, (W - w) / 2, (logicalH - h) / 2, w, h);
        ctx.fillStyle = 'rgba(0,0,0,' + (cfg.photoShade == null ? .25 : cfg.photoShade) + ')';
        ctx.fillRect(0, 0, W, logicalH);
      } else if (cfg.background && cfg.background !== 'transparent' && cfg.background !== 'photo') {
        const palette = { charcoal: ['#171b21'], paper: ['#f3eee4'], midnight: ['#173a52', '#080f20'], dusk: ['#6a315e', '#25243e'] }[cfg.background];
        if (palette) {
          let fill = palette[0];
          if (palette.length > 1) { fill = ctx.createLinearGradient(0, 0, W, logicalH); palette.forEach((color, i) => fill.addColorStop(i / (palette.length - 1), color)); }
          ctx.fillStyle = fill; ctx.fillRect(0, 0, W, logicalH);
        }
      }
      const boxColor = cfg.textBox === 'light' ? '#fffaf3' : cfg.textBox === 'accent' ? accent : '#14171d';
      const rgb = boxColor.replace('#', '').match(/../g).map(part => parseInt(part, 16));
      const lightBox = (rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114) / 255 > .5;
      const boxed = op => cfg.textBox && cfg.textBox !== 'none' && op.type === 'text' &&
        (cfg.boxScope !== 'titleRecord' || /^(section|record)$/.test(op.role));
      // Paint all plates first so a neighboring plate never covers already drawn text.
      page.ops.filter(boxed).forEach(op => {
        ctx.save(); ctx.font = op.spec.weight + ' ' + op.spec.size + 'px ' + fonts[op.spec.key]; ctx.textAlign = op.spec.align || 'left';
        const metrics = ctx.measureText(op.text), px = Math.min(6 * scale, op.spec.size * .22), py = Math.min(4 * scale, op.spec.size * .18);
        const x = op.x - metrics.actualBoundingBoxLeft - px, y = op.y - metrics.actualBoundingBoxAscent - py;
        const w = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight + px * 2;
        const h = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + py * 2;
        if (w > 0 && h > 0) {
          ctx.fillStyle = boxColor; ctx.globalAlpha = cfg.boxOpacity == null ? .88 : cfg.boxOpacity;
          ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(h * .25, 8 * scale)); ctx.fill();
        }
        ctx.restore();
      });
      const recordSizes = [];
      page.ops.forEach(op => {
        ctx.save(); ctx.fillStyle = op.color || cfg.color; ctx.strokeStyle = op.color || cfg.color; ctx.globalAlpha = op.alpha == null ? 1 : op.alpha; ctx.lineWidth = .8;
        if (op.type === 'text') {
          ctx.fillStyle = op.spec.color; ctx.globalAlpha = op.spec.alpha; ctx.font = op.spec.weight + ' ' + op.spec.size + 'px ' + fonts[op.spec.key]; ctx.textAlign = op.spec.align || 'left';
          if (boxed(op)) {
            ctx.fillStyle = lightBox ? '#151515' : '#ffffff';
            if (op.role === 'format' && theme.accent && cfg.textBox !== 'accent') ctx.fillStyle = lightBox
              ? '#' + accent.replace('#', '').match(/../g).map(part => Math.round(parseInt(part, 16) * .5).toString(16).padStart(2, '0')).join('') : accent;
          }
          ctx.fillText(op.text, op.x, op.y);
          if (op.role === 'record') recordSizes.push(op.spec.size * 2);
        } else if (op.type === 'line') {
          if (op.dash) ctx.setLineDash(op.dash); ctx.beginPath(); ctx.moveTo(op.x1, op.y1); ctx.lineTo(op.x2, op.y2); ctx.stroke();
        } else if (op.type === 'circle') {
          ctx.beginPath(); ctx.arc(op.x, op.y, op.radius, 0, Math.PI * 2); ctx.stroke();
        } else if (op.type === 'rect') {
          ctx.beginPath(); ctx.roundRect(op.x, op.y, op.w, op.h, op.radius || 0); ctx.stroke();
        } else if (op.type === 'ticket') {
          const r = 8, mid = op.y + op.h / 2;
          ctx.beginPath(); ctx.moveTo(op.x, op.y); ctx.lineTo(op.x + op.w, op.y); ctx.lineTo(op.x + op.w, mid - r);
          ctx.lineTo(op.x + op.w - r, mid); ctx.lineTo(op.x + op.w, mid + r); ctx.lineTo(op.x + op.w, op.y + op.h);
          ctx.lineTo(op.x, op.y + op.h); ctx.lineTo(op.x, mid + r); ctx.lineTo(op.x + r, mid); ctx.lineTo(op.x, mid - r); ctx.closePath(); ctx.stroke();
        }
        ctx.restore();
      });
      if (mode === 'receipt') {
        const x = left - 14, w = columnW + 28, bottom = Math.min(logicalH - 30, page.y + 8);
        ctx.strokeStyle = cfg.color; ctx.globalAlpha = .35; ctx.lineWidth = .7; ctx.beginPath();
        ctx.moveTo(x, 22); ctx.lineTo(x, bottom); for (let px = x; px < x + w; px += 10) { ctx.lineTo(px + 5, bottom - 6); ctx.lineTo(Math.min(px + 10, x + w), bottom); } ctx.lineTo(x + w, 22); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (recordSizes.length) { canvas.dataset.recordMin = String(Math.min(...recordSizes)); canvas.dataset.recordMax = String(Math.max(...recordSizes)); }
      return canvas;
    });
  }


  const css = `
@font-face {
  font-family: 'JN Inter';
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
  src: url(./assets/share-fonts/inter-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN Montserrat';
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
  src: url(./assets/share-fonts/montserrat-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN Bebas Neue';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(./assets/share-fonts/bebasneue-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN Anton';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(./assets/share-fonts/anton-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN Oswald';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(./assets/share-fonts/oswald-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN Barlow Condensed';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(./assets/share-fonts/barlowcondensed-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'JN Barlow Condensed';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(./assets/share-fonts/barlowcondensed-1.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN Space Grotesk';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(./assets/share-fonts/spacegrotesk-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN JetBrains Mono';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(./assets/share-fonts/jetbrainsmono-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN IBM Plex Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(./assets/share-fonts/ibmplexmono-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'JN IBM Plex Mono';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url(./assets/share-fonts/ibmplexmono-1.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN DM Serif Display';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(./assets/share-fonts/dmserifdisplay-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN Playfair Display';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(./assets/share-fonts/playfairdisplay-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN Archivo Black';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(./assets/share-fonts/archivoblack-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN Roboto Slab';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(./assets/share-fonts/robotoslab-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JN Silkscreen';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(./assets/share-fonts/silkscreen-0.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

#jn-workout-share{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:12px;background:rgba(0,0,0,.42);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--text-primary,#171717);font-family:var(--font-sans,sans-serif)}
#jn-workout-share *{box-sizing:border-box}
#jn-workout-share .ws-panel{position:relative;display:flex;flex-direction:column;width:min(1000px,100%);height:min(900px,96dvh);min-height:0;overflow:hidden;border:1px solid var(--glass-edge,#ddd);border-radius:26px;background:var(--glass-panel,#fafaf8);backdrop-filter:var(--blur-panel);-webkit-backdrop-filter:var(--blur-panel);box-shadow:var(--glass-shadow-float,0 20px 80px #0004)}
#jn-workout-share .ws-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border,#ddd);flex-shrink:0;background:var(--glass-bg,#fafaf8)}
#jn-workout-share h2{font-size:19px;margin:0;font-weight:600;letter-spacing:-.02em}
#jn-workout-share h3{font-size:14px;margin:20px 0 10px;font-weight:600}
#jn-workout-share .ws-body{display:grid;grid-template-columns:360px minmax(0,1fr);min-height:0;flex:1}
#jn-workout-share .ws-preview-dock{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px;min-width:0;min-height:0;background:var(--surface-0,#f2f2f0);border-right:1px solid var(--border,#ddd);overflow:auto}
#jn-workout-share .ws-preview-dock h3{margin:0;align-self:flex-start}
#jn-workout-share .ws-settings{overflow:auto;overscroll-behavior:contain;padding:0 20px 20px;min-height:0;min-width:0;background:var(--surface-0,#f2f2f0)}
#jn-workout-share .ws-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
#jn-workout-share button{font:inherit;touch-action:manipulation;cursor:pointer;color:inherit;min-height:36px;height:auto;padding:8px 12px;line-height:1.3;border:1px solid var(--glass-edge,#ddd);border-radius:999px;background:var(--glass-bg,#fff);box-shadow:var(--glass-shadow);transition:background .16s ease}
#jn-workout-share button[aria-pressed=true]{background:var(--glass-selected,#fff);border-color:var(--border-accent,#2f6fd6);box-shadow:var(--thumb-shadow)}
#jn-workout-share button:disabled{opacity:.45;cursor:default}
#jn-workout-share button:focus-visible,#jn-workout-share input:focus-visible,#jn-workout-share select:focus-visible,#jn-workout-share textarea:focus-visible{outline:2px solid var(--border-accent,#2f6fd6);outline-offset:2px}
#jn-workout-share button.primary{background:var(--text-primary,#171717);color:var(--surface-0,#fff);border-color:transparent}
#jn-workout-share .ws-design{display:flex;flex-direction:column;gap:6px;padding:7px;border-radius:14px;min-width:0;font-size:11px;white-space:normal}
#jn-workout-share .ws-design span{overflow-wrap:anywhere;line-height:1.4}
#jn-workout-share .ws-thumb{aspect-ratio:9/16;overflow:hidden;width:100%;border-radius:7px;background:#3a3a38}
#jn-workout-share canvas{display:block;width:100%;height:auto}
#jn-workout-share .ws-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
#jn-workout-share .ws-controls>div{min-width:0}
#jn-workout-share select,#jn-workout-share textarea{width:100%;min-width:0;max-width:100%;height:auto;min-height:44px;font:inherit;font-size:16px;line-height:1.5;color:inherit;background:var(--surface-1,#fff);border:1px solid var(--border,#ddd);border-radius:12px;padding:10px 12px;box-shadow:var(--card-shadow)}
#jn-workout-share label{font-size:13px;letter-spacing:normal;text-transform:none;display:flex;gap:8px;align-items:center;color:inherit;margin:0 0 4px}
#jn-workout-share input[type=checkbox]{appearance:auto;-webkit-appearance:checkbox;width:18px;height:18px;min-width:18px;padding:0;margin:0;box-shadow:none;accent-color:var(--border-accent,#2f6fd6)}
#jn-workout-share .ws-options{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}
#jn-workout-share .ws-section{padding:12px 0;border-bottom:1px solid var(--border,#ddd)}
#jn-workout-share .ws-item{padding:8px 0 0 26px}
#jn-workout-share .ws-footer{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap}
#jn-workout-share .ws-preview{flex-shrink:0;overflow:hidden;padding:0;max-width:100%;border-radius:12px;background-color:#333332;background-image:conic-gradient(#40403e 25%,transparent 0 50%,#40403e 0 75%,transparent 0);background-size:16px 16px;box-shadow:0 0 0 1px var(--border),0 6px 20px #0002}
#jn-workout-share .ws-preview.is-dark-text{background-color:#f6f6f3;background-image:conic-gradient(#e5e5e2 25%,transparent 0 50%,#e5e5e2 0 75%,transparent 0)}
#jn-workout-share .ws-status{font-size:12px;line-height:1.5;min-height:18px;margin:0;color:var(--text-secondary,#666);white-space:pre-line;overflow-wrap:anywhere}
#jn-workout-share .ws-preview-dock .ws-status{text-align:center}
#jn-workout-share .ws-status:empty{display:none}
#jn-workout-share .ws-font-size{grid-column:1/-1}
#jn-workout-share .ws-font-size-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}
#jn-workout-share .ws-font-size-row output{min-width:66px;text-align:center;font-variant-numeric:tabular-nums;font-size:14px}
#jn-workout-share input[type=range]{width:100%;height:30px;min-height:0;padding:0;margin:4px 0;appearance:auto;-webkit-appearance:auto;accent-color:var(--border-accent,#2f6fd6);box-shadow:none}
#jn-workout-share .ws-detail-hint{font-size:12px;line-height:1.5;color:var(--text-secondary,#666);margin:6px 0 12px}
#jn-workout-share .ws-font-trigger{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:48px;padding:10px 12px;border-radius:12px;background:var(--surface-1,#fff);font-size:18px;text-align:left}
#jn-workout-share .ws-font-trigger span:first-child{min-width:0;overflow-wrap:anywhere}
#jn-workout-share .ws-font-arrow{flex-shrink:0;font:16px sans-serif;opacity:.65}
#jn-workout-share .ws-font-sheet{position:absolute;inset:0;z-index:5;display:grid;place-items:center;padding:12px;background:rgba(0,0,0,.22);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
#jn-workout-share .ws-font-dialog{width:min(700px,100%);max-height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--glass-edge,#ddd);border-radius:22px;background:var(--glass-panel,#fafaf8);box-shadow:var(--glass-shadow-float,0 20px 80px #0004)}
#jn-workout-share .ws-font-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;flex-shrink:0}
#jn-workout-share .ws-font-heading h3{margin:0;font-size:16px}
#jn-workout-share .ws-font-help{padding:0 16px 12px;flex-shrink:0}
#jn-workout-share .ws-font-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;overflow:auto;overscroll-behavior:contain;min-height:0;padding:4px 16px 16px}
#jn-workout-share .ws-font-option{display:flex;flex-direction:column;align-items:stretch;gap:8px;min-width:0;min-height:92px;padding:12px;border-radius:14px;text-align:left;background:var(--surface-1,#fff)}
#jn-workout-share .ws-font-option-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
#jn-workout-share .ws-font-name{font-size:22px;line-height:1.35;min-width:0;overflow-wrap:anywhere}
#jn-workout-share .ws-font-mark{font:16px sans-serif;flex-shrink:0;width:18px;text-align:center}
#jn-workout-share .ws-font-sample{font-size:18px;line-height:1.5;overflow-wrap:anywhere;opacity:.8}
#jn-workout-share .ws-background-controls{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding-top:12px;border-top:1px solid var(--border,#ddd)}
#jn-workout-share .ws-background-controls>div{min-width:0}
#jn-workout-share .ws-wide{grid-column:1/-1}
#jn-workout-share .ws-photo-actions{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
@media(max-width:700px){#jn-workout-share .ws-background-controls{grid-template-columns:1fr}}
@media(max-width:700px){#jn-workout-share .ws-font-sheet{padding:10px}#jn-workout-share .ws-font-list{grid-template-columns:1fr}}
#jn-workout-share .ws-preview-dock.is-expanded{position:absolute;inset:0;z-index:3;border:0;justify-content:center;padding:16px;background:var(--surface-0,#f2f2f0)}
#jn-workout-share .ws-preview-dock.is-expanded h3{align-self:center}
#jn-workout-share .ws-preview-dock.is-expanded h3{display:none}
@media(max-width:700px){#jn-workout-share{padding:6px}#jn-workout-share .ws-panel{height:calc(100dvh - 12px);border-radius:22px}#jn-workout-share .ws-head{padding:10px 14px}#jn-workout-share .ws-body{display:flex;flex-direction:column}#jn-workout-share .ws-preview-dock{flex-shrink:0;border-right:0;border-bottom:1px solid var(--border);padding:10px 14px;gap:5px;overflow:hidden}#jn-workout-share .ws-preview-dock h3{display:none}#jn-workout-share .ws-preview-dock .ws-footer button{min-height:32px;font-size:12px;padding:6px 10px}#jn-workout-share .ws-settings{flex:1;padding:0 14px 20px}#jn-workout-share .ws-controls{grid-template-columns:1fr}#jn-workout-share .ws-preview-dock.is-expanded h3{display:block}}
@media(prefers-reduced-transparency:reduce){#jn-workout-share .ws-panel,#jn-workout-share .ws-head{background:var(--surface-0);backdrop-filter:none;-webkit-backdrop-filter:none}}
@media(prefers-reduced-motion:reduce){#jn-workout-share button{transition:none}}
`;

  function open(options) {
    const entries = buildEntries(
      options.records, options.items,
      options.unit === 'kg' ? 'kg' : 'lb'
    );
    if (!entries.length) {
      alert('공유할 기록이 없어요. 생략 기록은 제외해요.');
      return;
    }
    if (document.getElementById('jn-workout-share')) return;
    if (!document.getElementById('jn-share-css')) {
      const s = node('style', css, document.head);
      s.id = 'jn-share-css';
    }

    const cfg = {
      font: 'inter', titleFont: 'inter', recordFont: 'inter', accent: '#ff5b24', color: '#ffffff', size: 'portrait', fontSize: 40,
      sizeAdjust: { title: 1, body: 1, record: 1 },
      background: 'transparent', textBox: 'none', boxScope: 'all', boxOpacity: .88, photoImage: null, photoShade: .25,
      date: true, sections: true, records: true, details: false,
      notes: false, prescribed: true, intent: false, foot: ''
    };
    const defaults = entries.filter(e => /metcon|메트콘/i.test(e.section));
    const selected = new Set(
      (defaults.length ? defaults : entries.filter(e =>
        !/warm\s*-?\s*up|웜업|워밍업/i.test(e.section)
      )).map(e => e.key)
    );
    let style = 0, pages = [], page = 0, revision = 0, closed = false;
    let fontSheet = null;
    let photoVersion = 0;
    const photoURLs = new Set();

    const root = node('div', null, document.body);
    root.id = 'jn-workout-share';
    const panel = node('section', null, root);
    panel.className = 'ws-panel';
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    const head = node('div', null, panel);
    head.className = 'ws-head';
    const title = node('h2', '공유', head);
    title.id = 'jn-share-title';
    panel.setAttribute('aria-labelledby', title.id);
    const close = node('button', '닫기', head);
    close.type = 'button';

    const active = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function end() {
      closed = true;
      revision++;
      photoVersion++;
      photoURLs.forEach(url => URL.revokeObjectURL(url)); photoURLs.clear();
      root.remove();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keys);
      window.removeEventListener('resize', fitPreview);
      resizeObserver.disconnect();
      if (active && active.isConnected) active.focus();
    }
    close.onclick = end;

    function keys(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (fontSheet) fontSheet.close();
        return;
      }
      if (e.key === 'Tab') {
        const scope = fontSheet ? fontSheet.dialog : panel;
        const f = [...scope.querySelectorAll(
          'button,input,select,textarea'
        )].filter(x => !x.disabled && !x.closest('[inert]') && x.getClientRects().length);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (
          document.activeElement === first ||
          document.activeElement === panel
        )) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', keys);

    const body = node('div', null, panel);
    body.className = 'ws-body';
    const dock = node('div', null, body);
    dock.className = 'ws-preview-dock';
    const settings = node('div', null, body);
    settings.className = 'ws-settings';
    node('h3', '1. 디자인 선택', settings);
    const grid = node('div', null, settings);
    grid.className = 'ws-grid';
    const designButtons = styles.map((theme, i) => {
      const b = node('button', null, grid);
      b.type = 'button';
      b.className = 'ws-design';
      b.setAttribute('aria-pressed', String(i === 0));
      const thumb = node('div', null, b);
      thumb.className = 'ws-thumb';
      node('span', theme.name, b);
      b.onclick = () => {
        style = i;
        cfg.font = theme.font; cfg.titleFont = theme.titleFont; cfg.recordFont = theme.recordFont;
        fontSelect.value = cfg.font; titleSelect.value = cfg.titleFont; recordSelect.value = cfg.recordFont;
        syncSize();
        designButtons.forEach((x, j) =>
          x.b.setAttribute('aria-pressed', String(i === j))
        );
        update();
      };
      return { b, thumb };
    });

    node('h3', '2. 폰트 · 배경 · 저장 크기', settings);
    const controls = node('div', null, settings);
    controls.className = 'ws-controls';

    function select(label, key, list, parent = controls) {
      const box = node('div', null, parent);
      node('label', label, box);
      const s = node('select', null, box);
      s.setAttribute('aria-label', label);
      list.forEach(([v, t]) => {
        const o = node('option', t, s);
        o.value = v;
      });
      s.value = cfg[key];
      s.onchange = () => { cfg[key] = s.value; update(); };
      return s;
    }
    function fontPicker(label, key) {
      const box = node('div', null, controls);
      const caption = node('label', label, box);
      const trigger = node('button', null, box);
      trigger.type = 'button'; trigger.className = 'ws-font-trigger';
      trigger.id = 'jn-share-' + key;
      caption.htmlFor = trigger.id;
      trigger.setAttribute('aria-label', label);
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-expanded', 'false');
      const selectedName = node('span', null, trigger);
      selectedName.id = trigger.id + '-name';
      trigger.setAttribute('aria-describedby', selectedName.id);
      const arrow = node('span', '⌄', trigger);
      arrow.className = 'ws-font-arrow'; arrow.setAttribute('aria-hidden', 'true');
      function sync(v) { selectedName.textContent = fontLabels[v]; selectedName.style.fontFamily = fonts[v]; }
      sync(cfg[key]);
      trigger.onclick = () => {
        if (fontSheet) return;
        const sheet = node('div', null, panel); sheet.className = 'ws-font-sheet';
        const dialog = node('section', null, sheet); dialog.className = 'ws-font-dialog';
        dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
        const heading = node('div', null, dialog); heading.className = 'ws-font-heading';
        const title = node('h3', label + ' 선택', heading); title.id = 'jn-share-font-title';
        dialog.setAttribute('aria-labelledby', title.id);
        const dismiss = node('button', '닫기', heading); dismiss.type = 'button';
        const help = node('p', '', dialog);
        help.className = 'ws-status ws-font-help'; help.setAttribute('role', 'status');
        const list = node('div', null, dialog); list.className = 'ws-font-list';
        const weight = key === 'titleFont' || (key === 'recordFont' && styles[style].boldRecord) ? 700 : 400;
        const sample = key === 'titleFont' ? 'METCON · TRAINING' : key === 'recordFont' ? '6:42 · 150 KG · 12 REPS' : '12 TOES TO BAR';
        const choices = Object.entries(fontLabels).map(([v, name]) => {
          const option = node('button', null, list); option.type = 'button'; option.className = 'ws-font-option';
          option.dataset.font = v; option.setAttribute('aria-label', name); option.setAttribute('aria-pressed', String(cfg[key] === v));
          const top = node('span', null, option); top.className = 'ws-font-option-head';
          const nameText = node('span', name, top); nameText.className = 'ws-font-name'; nameText.style.fontFamily = fonts[v];
          const mark = node('span', cfg[key] === v ? '✓' : '', top); mark.className = 'ws-font-mark'; mark.setAttribute('aria-hidden', 'true');
          const example = node('span', sample, option); example.className = 'ws-font-sample'; example.style.fontFamily = fonts[v]; example.style.fontWeight = String(weight);
          option.onclick = () => { cfg[key] = v; sync(v); hide(); update(); };
          return option;
        });
        function hide() {
          if (!sheet.isConnected) return;
          sheet.remove(); head.inert = false; body.inert = false;
          fontSheet = null; trigger.setAttribute('aria-expanded', 'false');
          trigger.removeAttribute('aria-controls'); trigger.focus();
        }
        dialog.id = 'jn-share-font-dialog';
        fontSheet = { dialog, close: hide };
        head.inert = true; body.inert = true;
        trigger.setAttribute('aria-expanded', 'true'); trigger.setAttribute('aria-controls', dialog.id);
        dismiss.onclick = hide;
        sheet.onclick = e => { if (e.target === sheet) hide(); };
        const current = choices.find(option => option.dataset.font === cfg[key]);
        if (current) { current.focus(); current.scrollIntoView({ block: 'nearest' }); } else dismiss.focus();
        if (document.fonts) {
          help.textContent = '폰트 로딩 중…';
          Promise.all(Object.keys(fontLabels).map(v => document.fonts.load(weight + ' 20px ' + fonts[v], sample).catch(() => false)))
            .then(loaded => {
              if (sheet.isConnected) help.textContent = loaded.includes(false)
                ? '일부 글꼴을 불러오지 못해 대체 글꼴로 표시될 수 있어요.'
                : '';
            });
        }
      };
      return { get value() { return cfg[key]; }, set value(v) { sync(v); } };
    }
    const titleSelect = fontPicker('제목 폰트', 'titleFont');
    const fontSelect = fontPicker('본문 폰트', 'font');
    const recordSelect = fontPicker('기록 폰트', 'recordFont');
    const colorSelect = select('글자색', 'color', [
      ['#ffffff', '화이트'],
      ['#151515', '블랙'],
      ['#ece3d1', '아이보리'],
      ['#a6f0ce', '민트']
    ]);
    select('강조색', 'accent', [['#ff5b24', '오렌지'], ['#b8f343', '라임'], ['#83c9ff', '블루'], ['same', '글자색과 같게']]);
    select('PNG 크기', 'size', [
      ['portrait', '세로'],
      ['landscape', '가로'],
      ['crop', '내용에 맞춤']
    ]);

    const backgroundControls = node('div', null, controls); backgroundControls.className = 'ws-background-controls';
    const backgroundSelect = select('PNG 배경', 'background', [['transparent', '투명'], ['charcoal', '차콜'], ['paper', '아이보리'], ['midnight', '미드나잇 그라데이션'], ['dusk', '더스크 그라데이션'], ['photo', '내 사진']], backgroundControls);
    function syncBackgroundColor() { cfg.color = cfg.background === 'paper' ? '#151515' : '#ffffff'; colorSelect.value = cfg.color; }
    backgroundSelect.onchange = () => {
      if (backgroundSelect.value === 'photo' && !cfg.photoImage) {
        backgroundSelect.value = cfg.background;
        photoInput.click();
        return;
      }
      cfg.background = backgroundSelect.value; syncBackgroundColor(); update();
    };
    select('글자 뒤 박스', 'textBox', [['none', '없음'], ['dark', '다크 라운드'], ['light', '화이트 라운드'], ['accent', '강조색 라운드']], backgroundControls);
    select('박스 범위', 'boxScope', [['all', '전체 글자'], ['titleRecord', '제목·기록만']], backgroundControls);
    function backgroundSlider(label, key, min, max) {
      const box = node('div', null, backgroundControls);
      const caption = node('label', null, box); node('span', label, caption);
      const output = node('output', Math.round(cfg[key] * 100) + '%', caption);
      const slider = node('input', null, box); slider.type = 'range'; slider.min = min; slider.max = max; slider.step = '1'; slider.value = Math.round(cfg[key] * 100); slider.setAttribute('aria-label', label);
      slider.oninput = () => { cfg[key] = Number(slider.value) / 100; output.textContent = slider.value + '%'; update(); };
      return slider;
    }
    backgroundSlider('박스 불투명도', 'boxOpacity', 55, 100);
    const photoBox = node('div', null, backgroundControls); photoBox.className = 'ws-wide';
    node('label', '배경 사진', photoBox);
    const photoInput = node('input', null, photoBox); photoInput.type = 'file'; photoInput.accept = 'image/*'; photoInput.hidden = true; photoInput.setAttribute('aria-label', '배경 사진 파일');
    const photoActions = node('div', null, photoBox); photoActions.className = 'ws-photo-actions';
    const choosePhoto = node('button', '사진 선택', photoActions); choosePhoto.type = 'button'; choosePhoto.onclick = () => photoInput.click();
    const clearPhoto = node('button', '사진 지우기', photoActions); clearPhoto.type = 'button'; clearPhoto.disabled = true;
    const photoHint = node('p', '', photoBox); photoHint.className = 'ws-status';
    photoInput.onchange = () => {
      const file = photoInput.files[0]; if (!file) return;
      if (file.type && !/^image\//i.test(file.type)) { photoHint.textContent = '사진 파일을 선택해주세요.'; photoInput.value = ''; return; }
      const token = ++photoVersion, url = URL.createObjectURL(file), image = new Image(); photoURLs.add(url);
      photoHint.textContent = '사진을 불러오는 중이에요.';
      image.onload = () => {
        if (closed || token !== photoVersion) { URL.revokeObjectURL(url); photoURLs.delete(url); return; }
        photoURLs.forEach(old => { if (old !== url) { URL.revokeObjectURL(old); photoURLs.delete(old); } });
        cfg.photoImage = image; cfg.background = 'photo'; backgroundSelect.value = 'photo';
        clearPhoto.disabled = false; choosePhoto.textContent = '사진 변경'; photoHint.textContent = file.name; syncBackgroundColor(); update();
      };
      image.onerror = () => {
        URL.revokeObjectURL(url); photoURLs.delete(url);
        if (!closed && token === photoVersion) photoHint.textContent = /heic|heif/i.test(file.type + ' ' + file.name)
          ? '이 브라우저에서 HEIC 사진을 열 수 없어요. JPG로 변환한 사진이나 스크린샷을 선택해주세요.'
          : '사진을 불러오지 못했어요. JPG, PNG, WebP 사진을 다시 선택해주세요.';
      };
      image.src = url; photoInput.value = '';
    };
    clearPhoto.onclick = () => {
      photoVersion++; photoURLs.forEach(url => URL.revokeObjectURL(url)); photoURLs.clear(); cfg.photoImage = null;
      clearPhoto.disabled = true; choosePhoto.textContent = '사진 선택';
      photoHint.textContent = '';
      if (cfg.background === 'photo') { cfg.background = 'transparent'; backgroundSelect.value = 'transparent'; }
      update();
    };
    backgroundSlider('사진 어둡게', 'photoShade', 0, 70);

    const sizeBox = node('div', null, controls);
    sizeBox.className = 'ws-font-size';
    node('label', '전체 크기', sizeBox);
    const presets = node('div', null, sizeBox);
    presets.className = 'ws-font-size-row';
    const presetButtons = [['작게', 32], ['중간', 40], ['크게', 48]].map(([label, n]) => {
      const b = node('button', label, presets);
      b.type = 'button'; b.onclick = () => changeSize(n);
      return {b, n};
    });
    const row = node('div', null, sizeBox);
    row.className = 'ws-font-size-row';
    const minus = node('button', '−', row);
    minus.type = 'button'; minus.setAttribute('aria-label', '글자 크기 1px 줄이기');
    const output = node('output', '', row);
    const plus = node('button', '+', row);
    plus.type = 'button'; plus.setAttribute('aria-label', '글자 크기 1px 늘리기');
    const slider = node('input', null, sizeBox);
    slider.type = 'range'; slider.min = '24'; slider.max = '72'; slider.step = '1';
    slider.setAttribute('aria-label', '기록 글자 크기');
    const advancedToggle = node('button', '세부 조정', sizeBox);
    advancedToggle.type = 'button'; advancedToggle.setAttribute('aria-expanded', 'false');
    const advanced = node('div', null, sizeBox);
    advanced.id = 'jn-share-size-details'; advanced.hidden = true;
    advancedToggle.setAttribute('aria-controls', advanced.id);
    advancedToggle.onclick = () => {
      advanced.hidden = !advanced.hidden;
      advancedToggle.setAttribute('aria-expanded', String(!advanced.hidden));
    };
    const sizeControls = [];
    function baseSize(group) {
      return styles[style][group === 'title' ? 'section' : group === 'record' ? 'record' : 'body'] * 2 * cfg.fontSize / 40;
    }
    [['title', '제목', 24, 320], ['body', '본문', 12, 120], ['record', '기록', 16, 240]].forEach(([group, label, min, max]) => {
      const box = node('div', null, advanced);
      const caption = node('label', label + ' 크기', box);
      const row = node('div', null, box); row.className = 'ws-font-size-row';
      const less = node('button', '−', row); less.type = 'button'; less.setAttribute('aria-label', label + ' 크기 1px 줄이기');
      const value = node('output', '', row);
      const more = node('button', '+', row); more.type = 'button'; more.setAttribute('aria-label', label + ' 크기 1px 늘리기');
      const range = node('input', null, box); range.type = 'range'; range.min = min; range.max = max; range.step = '1';
      range.id = 'jn-share-size-' + group; range.setAttribute('aria-label', label + ' 크기'); caption.htmlFor = range.id;
      const current = () => Math.round(baseSize(group) * cfg.sizeAdjust[group]);
      const change = n => { cfg.sizeAdjust[group] = Math.max(min, Math.min(max, n)) / baseSize(group); syncSize(); update(); };
      less.onclick = () => change(current() - 1); more.onclick = () => change(current() + 1);
      range.oninput = () => change(Number(range.value));
      sizeControls.push(() => {
        const n = current(); range.value = n; value.textContent = n + ' px'; less.disabled = n <= min; more.disabled = n >= max;
      });
    });
    const resetSizes = node('button', '크기 초기화', advanced); resetSizes.type = 'button';
    resetSizes.onclick = () => { cfg.sizeAdjust = { title: 1, body: 1, record: 1 }; syncSize(); update(); };
    minus.onclick = () => changeSize(cfg.fontSize - 1);
    plus.onclick = () => changeSize(cfg.fontSize + 1);
    slider.oninput = () => changeSize(Number(slider.value));
    function syncSize() {
      slider.value = String(cfg.fontSize); output.textContent = cfg.fontSize + ' px';
      minus.disabled = cfg.fontSize <= 24; plus.disabled = cfg.fontSize >= 72;
      presetButtons.forEach(({b,n}) => b.setAttribute('aria-pressed', String(n === cfg.fontSize)));
      sizeControls.forEach(sync => sync());
    }
    function changeSize(n) { cfg.fontSize = Math.max(24, Math.min(72, n)); syncSize(); update(); }
    syncSize();

    node('h3', '3. 표시할 내용', settings);
    const opts = node('div', null, settings);
    opts.className = 'ws-options';

    function check(parent, label, on, change) {
      const l = node('label', null, parent);
      const c = node('input', null, l);
      c.type = 'checkbox';
      c.checked = on;
      node('span', label, l);
      c.onchange = () => change(c.checked);
      return c;
    }
    [
      ['date', '날짜'],
      ['sections', '섹션'],
      ['records', '기록'],
      ['details', '세트 정보'],
      ['notes', '세부내용'],
      ['prescribed', '원본'],
      ['intent', '한국어 안내']
    ].forEach(([k, t]) =>
      check(opts, t, cfg[k], v => { cfg[k] = v; update(); })
    );

    node('label', '각주', settings);
    const foot = node('textarea', null, settings);
    foot.rows = 2;
    foot.maxLength = 300;
    foot.setAttribute('aria-label', '각주');
    foot.oninput = () => { cfg.foot = foot.value; update(); };


    node('h3', '4. 운동 섹션 · 개별 운동', settings);
    [...new Set(entries.map(e => e.section))].forEach(section => {
      const box = node('div', null, settings);
      box.className = 'ws-section';
      const members = entries.filter(e => e.section === section);
      const children = [];
      const sectionCheck = check(box, section, false, v => {
        members.forEach(e =>
          v ? selected.add(e.key) : selected.delete(e.key)
        );
        sync();
        update();
      });
      members.forEach(e => {
        const row = node('div', null, box);
        row.className = 'ws-item';
        const c = check(row, e.name, selected.has(e.key), v => {
          v ? selected.add(e.key) : selected.delete(e.key);
          sync();
          update();
        });
        children.push({ c, e });
      });
      function sync() {
        children.forEach(({ c, e }) =>
          { c.checked = selected.has(e.key); }
        );
        const n = members.filter(e => selected.has(e.key)).length;
        sectionCheck.checked = n === members.length;
        sectionCheck.indeterminate = n > 0 && n < members.length;
      }
      sync();
    });

    node('h3', '미리보기', dock);
    const status = node('p', '', dock);
    status.className = 'ws-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const preview = node('div', null, dock);
    preview.className = 'ws-preview';
    const pager = node('div', null, dock);
    pager.className = 'ws-footer';
    const prev = node('button', '이전', pager);
    const next = node('button', '다음', pager);
    const count = node('span', '', pager);
    prev.type = next.type = 'button';
    prev.onclick = () => { page--; show(); };
    next.onclick = () => { page++; show(); };

    const actions = node('div', null, dock);
    actions.className = 'ws-footer';
    const save = node('button', '이 이미지 저장', actions);
    const copy = node('button', '텍스트 복사', actions);
    save.type = copy.type = 'button';
    save.className = 'primary';

    const expand = node('button', '크게 보기', pager);
    expand.type = 'button'; expand.setAttribute('aria-expanded', 'false');
    expand.onclick = () => {
      const expanded = dock.classList.toggle('is-expanded');
      expand.textContent = expanded ? '설정으로 돌아가기' : '크게 보기';
      expand.setAttribute('aria-expanded', String(expanded));
      settings.inert = expanded; head.inert = expanded;
      fitPreview();
    };
    function fitPreview() {
      const canvas = pages[page];
      if (!canvas) { preview.style.width = '0px'; return; }
      const mobile = window.innerWidth <= 700;
      const expanded = dock.classList.contains('is-expanded');
      const visible = [...dock.children].filter(e => e !== preview && e.getClientRects().length);
      const dockStyle = getComputedStyle(dock);
      const occupied = visible.reduce((sum, e) => sum + e.getBoundingClientRect().height, 0)
        + parseFloat(dockStyle.paddingTop) + parseFloat(dockStyle.paddingBottom)
        + (parseFloat(dockStyle.rowGap) || 0) * visible.length + 8;
      const maxH = expanded ? Math.max(1, panel.clientHeight - occupied)
        : mobile ? Math.max(90, Math.min(300, panel.clientHeight * .33))
        : Math.max(100, panel.clientHeight - 280);
      const maxW = Math.max(1, dock.clientWidth - 32);
      const w = Math.min(expanded ? 430 : 320, maxW, maxH * canvas.width / canvas.height);
      preview.style.width = w + 'px';
    }
    const resizeObserver = new ResizeObserver(fitPreview);
    resizeObserver.observe(dock);
    window.addEventListener('resize', fitPreview);

    function chosen() {
      return entries.filter(e => selected.has(e.key));
    }
    function show() {
      page = Math.max(0, Math.min(page, pages.length - 1));
      preview.replaceChildren();
      if (pages[page]) preview.appendChild(pages[page]);
      preview.classList.toggle('is-dark-text', cfg.color === '#151515');
      count.textContent = pages.length
        ? (page + 1) + ' / ' + pages.length + '장' : '0장';
      prev.disabled = page <= 0;
      next.disabled = page >= pages.length - 1;
      save.disabled = copy.disabled = !pages.length;
      fitPreview();
    }

    async function update() {
      const token = ++revision;
      save.disabled = copy.disabled = true;
      foot.style.fontFamily = fonts[cfg.font];
      try {
        if (document.fonts) {
          const needed = new Set([cfg.font, cfg.titleFont, cfg.recordFont, 'silkscreen']);
          styles.forEach(theme => [theme.font, theme.titleFont, theme.recordFont].forEach(key => needed.add(key)));
          await Promise.all([...needed].flatMap(key => [400, 700].map(weight => document.fonts.load(weight + ' 20px ' + fonts[key], 'METCON 0123456789').catch(() => []))));
        }
        if (closed || token !== revision) return;
        const list = chosen();
        const blocks = composeShare(list, cfg, options.date, options.items);
        pages = list.length ? renderPages(blocks, cfg, style) : [];

        designButtons.forEach(({ thumb }, i) => {
          thumb.replaceChildren();
          const p = list.length
            ? renderPages(blocks, Object.assign({}, cfg, { size: 'portrait', font: i === style ? cfg.font : styles[i].font, titleFont: i === style ? cfg.titleFont : styles[i].titleFont, recordFont: i === style ? cfg.recordFont : styles[i].recordFont }), i, true)[0] : null;
          if (p) thumb.appendChild(p);
          thumb.style.background =
            cfg.color === '#151515' ? '#eee' : '#555';
        });
        status.textContent = list.length ? '' : '공유할 운동을 선택해주세요.';
        show();
      } catch (e) {
        if (token === revision) {
          pages = [];
          show();
          status.textContent =
            '미리보기를 만들지 못했어요: ' + e.message;
        }
      }
    }

    save.onclick = () => {
      const canvas = pages[page], number = page + 1;
      if (!canvas) return;
      save.disabled = true;
      canvas.toBlob(blob => {
        if (closed) return;
        save.disabled = false;
        if (!blob) {
          status.textContent = '이미지 저장에 실패했어요.';
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = node('a', null, document.body);
        a.href = url;
        a.download = 'workout-' + options.date + '-' + number + '.png';
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        status.textContent = 'PNG 저장';
      }, 'image/png');
    };

    function text() {
      return composeShare(chosen(), cfg, options.date, options.items)
        .map(block => block.lines.map(line =>
          line.text + (line.value ? '  ·  ' + line.value : '')
        ).join('\n')).join('\n\n').trim();
    }
    copy.onclick = async () => {
      const t = text();
      try {
        if (!navigator.clipboard) {
          throw new Error('clipboard unavailable');
        }
        await navigator.clipboard.writeText(t);
        status.textContent = '텍스트를 복사했어요.';
      } catch (_) {
        if (dock.classList.contains('is-expanded')) expand.click();
        const box = node('textarea', t, settings);
        box.readOnly = true;
        box.setAttribute('aria-label', '복사할 공유 텍스트');
        box.focus();
        box.select();
        settings.scrollTop = settings.scrollHeight;
        status.textContent =
          '자동 복사가 제한되어 있어요. '
          + '아래 텍스트를 선택해 복사해주세요.';
      }
    };

    close.focus();
    update();
  }

  window.JogymWorkoutShare = { open, buildEntries };

  if (
    typeof buildDateLookupBox !== 'function' ||
    typeof buildCalendarPicker !== 'function'
  ) return;

  const originalBox = buildDateLookupBox;
  buildDateLookupBox = function (records, unit) {
    let date = [...new Set(records.map(r => r.date))]
      .sort().reverse()[0];
    const originalPicker = buildCalendarPicker;

    buildCalendarPicker = function (opts) {
      const select = opts.onSelect;
      return originalPicker(Object.assign({}, opts, {
        onSelect: function (d) {
          date = d;
          return select(d);
        }
      }));
    };

    let box;
    try {
      box = originalBox(records, unit);
    } finally {
      buildCalendarPicker = originalPicker;
    }

    const button = node('button', '공유', box.firstElementChild);
    button.type = 'button';
    button.style.cssText =
      'height:32px;flex-shrink:0;padding:0 12px;margin-top:2px;';

    button.onclick = async () => {
      const chosenDate = date;
      const day = records.filter(r => r.date === chosenDate);
      if (!day.some(r => !r.skipped)) {
        alert('이 날짜에는 공유할 기록이 없어요.');
        return;
      }
      button.disabled = true;
      try {
        const result = await sb.from('programs')
          .select('*').eq('date', chosenDate).maybeSingle();
        if (result.error) throw result.error;
        open({
          date: chosenDate,
          records: day,
          items: result.data && result.data.items || [],
          unit
        });
      } catch (e) {
        alert(
          '공유할 운동을 불러오지 못했어요: '
          + (e.message || e)
        );
      } finally {
        button.disabled = false;
      }
    };
    return box;
  };
})();
