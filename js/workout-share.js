/* JOGYM NOTE — transparent workout sharing. No database writes. */
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
    sans: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
    serif: 'Georgia, "Noto Serif KR", Batang, serif',
    mono: '"SFMono-Regular", Consolas, "Malgun Gothic", monospace'
  };
  const styles = ['Minimal', 'Training Log', 'Record Focus', 'Editorial'];
  const sizes = {
    story: [1080, 1920],
    portrait: [1080, 1350],
    square: [1080, 1080],
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
      if (!entry) {
        entry = {
          key, section, name,
          prescribed: item ? String(item.prescribed || '') : '',
          rows: []
        };
        map.set(key, entry);
        out.push(entry);
      }

      const p = personal(r), detail = [];
      if (p) {
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
      const note = p ? String(p.notes || '')
        : String(r.scale_detail || '').startsWith('§')
          ? '' : String(r.scale_detail || '');

      entry.rows.push({
        label: suffix,
        value: value(r, unit),
        detail,
        note
      });
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
      Array.from(part).forEach(ch => {
        if (line && ctx.measureText(line + ch).width > max) {
          lines.push(line.trimEnd());
          line = ch;
        } else {
          line += ch;
        }
      });
      lines.push(line.trimEnd());
    });
    return lines;
  }

  function renderPages(entries, cfg, date, style) {
    const W = 540, H = sizes[cfg.size][1] / 2, pad = 34;
    const measure = document.createElement('canvas').getContext('2d');
    const commands = [];

    function add(text, size, bold, gap, align) {
      text = shareEnglish(text);
      measure.font = (bold ? '600 ' : '400 ')
        + size + 'px ' + fonts[cfg.font];
      wrap(measure, text, W - pad * 2).forEach(t =>
        commands.push({
          text: t, size, bold,
          align: align || 'left',
          h: size * 1.35
        })
      );
      if (gap) commands.push({ h: gap });
    }

    if (cfg.date) {
      add(date, 16, false, 20, style === 3 ? 'center' : 'left');
    }
    let previous = '';
    entries.forEach(e => {
      if (cfg.sections && previous !== e.section) {
        add(
          e.section.toUpperCase(), 14, true, 12,
          style === 3 ? 'center' : 'left'
        );
        previous = e.section;
      }
      add(
        e.name, style === 2 ? 23 : style === 3 ? 25 : 21,
        true, 8, style === 3 ? 'center' : 'left'
      );
      e.rows.forEach(r => {
        if (cfg.records) {
          const text = (r.label ? r.label + '  ·  ' : '') + r.value;
          add(
            text, style === 2 ? 34 : style === 3 ? 26 : 20,
            style === 2 || style === 3, 5,
            style === 3 ? 'center' : style === 1 ? 'right' : 'left'
          );
        }
        if (cfg.details) r.detail.forEach(t =>
          add(t, 16, false, 3, style === 3 ? 'center' : 'left')
        );
        if (cfg.notes && r.note) {
          add('※ ' + r.note, 15, false, 5,
            style === 3 ? 'center' : 'left');
        }
      });
      if (cfg.prescribed && e.prescribed) {
        add('원본 처방', 13, true, 3);
        add(e.prescribed, 15, false, 8);
      }
      commands.push({ h: 22, rule: style === 1 });
    });

    if (cfg.foot.trim()) {
      commands.push({ h: 12 });
      add(cfg.foot.trim(), 15, false, 0,
        style === 3 ? 'center' : 'left');
    }

    const pages = [], contentLimit = H - pad - 24;
    let list = [], y = pad;
    commands.forEach(c => {
      if (y + c.h > contentLimit && list.some(x => x.text)) {
        pages.push({ list, y });
        list = [];
        y = pad;
      }
      list.push(Object.assign({ y }, c));
      y += c.h;
    });
    if (list.some(x => x.text)) pages.push({ list, y });

    return pages.map((p, i) => {
      const logicalH = cfg.size === 'crop'
        ? Math.min(H, Math.max(160, p.y + pad + 24)) : H;
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = Math.round(logicalH * 2);

      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.fillStyle = cfg.color;
      ctx.strokeStyle = cfg.color;
      ctx.textBaseline = 'top';

      // 背景を塗らず、文字と罫線だけを描くため PNG は透明。
      p.list.forEach(c => {
        if (c.rule) {
          ctx.globalAlpha = .3;
          ctx.beginPath();
          ctx.moveTo(pad, c.y + 8);
          ctx.lineTo(W - pad, c.y + 8);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (!c.text) return;
        ctx.font = (c.bold ? '600 ' : '400 ')
          + c.size + 'px ' + fonts[cfg.font];
        ctx.textAlign = c.align;
        ctx.fillText(
          c.text,
          c.align === 'center' ? W / 2
            : c.align === 'right' ? W - pad : pad,
          c.y
        );
      });
      if (pages.length > 1) {
        ctx.font = '12px ' + fonts[cfg.font];
        ctx.textAlign = 'right';
        ctx.fillText(
          (i + 1) + ' / ' + pages.length,
          W - pad, logicalH - pad
        );
      }
      return canvas;
    });
  }

  const css = [
    '#jn-workout-share{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.48);display:grid;place-items:center;padding:12px;color:var(--text-primary,#171717)}',
    '#jn-workout-share *{box-sizing:border-box}',
    '#jn-workout-share .ws-panel{background:var(--surface-0,#f7f7f7);border:1px solid var(--border,#ddd);border-radius:22px;width:min(940px,100%);max-height:92dvh;overflow:auto;padding:20px;box-shadow:0 20px 80px #0004}',
    '#jn-workout-share .ws-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}',
    '#jn-workout-share h2{font-size:20px;margin:0;font-weight:600}',
    '#jn-workout-share h3{font-size:15px;margin:20px 0 10px;font-weight:600}',
    '#jn-workout-share .ws-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}',
    '#jn-workout-share .ws-design{display:flex;flex-direction:column;gap:8px;height:auto;padding:8px;border-radius:14px;min-width:0;background:var(--surface-1,#fff);border:1px solid var(--border,#ddd);color:inherit;box-shadow:none}',
    '#jn-workout-share .ws-design[aria-pressed=true]{outline:2px solid var(--text-primary,#171717);outline-offset:2px}',
    '#jn-workout-share .ws-thumb{height:150px;overflow:hidden;width:100%;border-radius:8px;background:#555}',
    '#jn-workout-share canvas{display:block;width:100%;height:auto}',
    '#jn-workout-share .ws-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
    '#jn-workout-share select,#jn-workout-share textarea{width:100%;font:inherit;color:inherit;background:var(--surface-1,#fff);border:1px solid var(--border,#ddd);border-radius:10px;padding:10px}',
    '#jn-workout-share label{font-size:14px;letter-spacing:normal;text-transform:none;display:flex;gap:8px;align-items:center;color:inherit;margin:0}',
    '#jn-workout-share input[type=checkbox]{appearance:auto;-webkit-appearance:checkbox;width:18px;height:18px;min-width:18px;padding:0;margin:0;box-shadow:none;accent-color:var(--text-primary,#171717)}',
    '#jn-workout-share .ws-options{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}',
    '#jn-workout-share .ws-section{padding:12px 0;border-bottom:1px solid var(--border,#ddd)}',
    '#jn-workout-share .ws-item{padding:8px 0 0 26px}',
    '#jn-workout-share .ws-footer{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}',
    '#jn-workout-share .ws-preview{padding:18px;background-color:#555;background-image:linear-gradient(45deg,#666 25%,transparent 25%),linear-gradient(-45deg,#666 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#666 75%),linear-gradient(-45deg,transparent 75%,#666 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0;border-radius:14px;max-width:390px;margin:12px auto}',
    '#jn-workout-share .ws-preview.is-dark-text{background-color:#eee;background-image:linear-gradient(45deg,#ddd 25%,transparent 25%),linear-gradient(-45deg,#ddd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ddd 75%),linear-gradient(-45deg,transparent 75%,#ddd 75%)}',
    '#jn-workout-share .ws-status{font-size:13px;min-height:20px;margin:8px 0;white-space:pre-line}',
    '#jn-workout-share button{touch-action:manipulation}',
    '@media(max-width:600px){#jn-workout-share .ws-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#jn-workout-share .ws-panel{padding:16px}#jn-workout-share .ws-controls{grid-template-columns:1fr}}'
  ].join('\n');

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
      font: 'sans', color: '#ffffff', size: 'story',
      date: true, sections: true, records: true, details: true,
      notes: false, prescribed: false, foot: ''
    };
    const defaults = entries.filter(e => /metcon|메트콘/i.test(e.section));
    const selected = new Set(
      (defaults.length ? defaults : entries.filter(e =>
        !/warm\s*-?\s*up|웜업/i.test(e.section)
      )).map(e => e.key)
    );
    let style = 0, pages = [], page = 0, revision = 0, closed = false;

    const root = node('div', null, document.body);
    root.id = 'jn-workout-share';
    const panel = node('section', null, root);
    panel.className = 'ws-panel';
    panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    const head = node('div', null, panel);
    head.className = 'ws-head';
    const title = node('h2', '운동 기록 공유', head);
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
      root.remove();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keys);
      if (active && active.isConnected) active.focus();
    }
    close.onclick = end;
    root.onclick = e => { if (e.target === root) end(); };

    function keys(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        end();
      }
      if (e.key === 'Tab') {
        const f = [...panel.querySelectorAll(
          'button,input,select,textarea'
        )].filter(x => !x.disabled);
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

    node('h3', '1. 디자인 선택', panel);
    const grid = node('div', null, panel);
    grid.className = 'ws-grid';
    const designButtons = styles.map((name, i) => {
      const b = node('button', null, grid);
      b.type = 'button';
      b.className = 'ws-design';
      b.setAttribute('aria-pressed', String(i === 0));
      const thumb = node('div', null, b);
      thumb.className = 'ws-thumb';
      node('span', name, b);
      b.onclick = () => {
        style = i;
        designButtons.forEach((x, j) =>
          x.b.setAttribute('aria-pressed', String(i === j))
        );
        update();
      };
      return { b, thumb };
    });

    node('h3', '2. 폰트 · 글자색 · 저장 크기', panel);
    const controls = node('div', null, panel);
    controls.className = 'ws-controls';

    function select(label, key, list) {
      const box = node('div', null, controls);
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
    select('폰트', 'font', [
      ['sans', 'Sans · 깔끔하게'],
      ['serif', 'Serif · 클래식하게'],
      ['mono', 'Mono · 기록 노트']
    ]);
    select('글자색', 'color', [
      ['#ffffff', '화이트'],
      ['#151515', '블랙'],
      ['#ece3d1', '아이보리'],
      ['#a6f0ce', '민트']
    ]);
    select('PNG 크기', 'size', [
      ['story', '스토리 · 1080 × 1920'],
      ['portrait', '세로 · 1080 × 1350'],
      ['square', '정사각 · 1080 × 1080'],
      ['crop', '내용에 맞춤 · 너비 1080']
    ]);

    node('h3', '3. 표시할 내용', panel);
    const opts = node('div', null, panel);
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
      ['sections', '섹션 제목'],
      ['records', '기록값'],
      ['details', '세트·수행 상세'],
      ['notes', '저장된 메모'],
      ['prescribed', '원본 처방']
    ].forEach(([k, t]) =>
      check(opts, t, cfg[k], v => { cfg[k] = v; update(); })
    );

    node('label', '각주', panel);
    const foot = node('textarea', null, panel);
    foot.rows = 2;
    foot.maxLength = 300;
    foot.placeholder = '필요한 문구만 직접 입력';
    foot.setAttribute('aria-label', '각주');
    foot.oninput = () => { cfg.foot = foot.value; update(); };

    const caution = node(
      'p',
      '원본 처방은 실제 대체한 운동과 다를 수 있어요. '
      + '투명 배경의 체크 무늬는 저장되지 않아요.',
      panel
    );
    caution.className = 'ws-status';

    node('h3', '4. 운동 섹션 · 개별 운동', panel);
    [...new Set(entries.map(e => e.section))].forEach(section => {
      const box = node('div', null, panel);
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

    node('h3', '미리보기', panel);
    const status = node('p', '', panel);
    status.className = 'ws-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const preview = node('div', null, panel);
    preview.className = 'ws-preview';
    const pager = node('div', null, panel);
    pager.className = 'ws-footer';
    const prev = node('button', '이전 이미지', pager);
    const next = node('button', '다음 이미지', pager);
    const count = node('span', '', pager);
    prev.type = next.type = 'button';
    prev.onclick = () => { page--; show(); };
    next.onclick = () => { page++; show(); };

    const actions = node('div', null, panel);
    actions.className = 'ws-footer';
    const save = node('button', '이 이미지 저장', actions);
    const copy = node('button', '텍스트 복사', actions);
    save.type = copy.type = 'button';
    save.className = 'primary';

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
    }

    async function update() {
      const token = ++revision;
      save.disabled = copy.disabled = true;
      try {
        if (document.fonts) {
          await document.fonts.load(
            '20px ' + fonts[cfg.font], '오늘 운동'
          );
        }
        if (closed || token !== revision) return;
        const list = chosen();
        pages = list.length
          ? renderPages(list, cfg, options.date, style) : [];

        designButtons.forEach(({ thumb }, i) => {
          thumb.replaceChildren();
          const p = list.length
            ? renderPages(
              list, Object.assign({}, cfg, { size: 'square' }),
              options.date, i
            )[0] : null;
          if (p) thumb.appendChild(p);
          thumb.style.background =
            cfg.color === '#151515' ? '#eee' : '#555';
        });
        status.textContent = list.length
          ? list.length + '개 운동 · ' + pages.length
            + '장 · PNG 배경 투명'
          : '공유할 운동을 선택해주세요.';
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
        status.textContent = number
          + '번째 PNG 다운로드를 요청했어요. '
          + '다음 이미지도 각각 저장할 수 있어요.';
      }, 'image/png');
    };

    function text() {
      const parts = cfg.date ? [options.date] : [];
      chosen().forEach(e => {
        if (cfg.sections) parts.push(e.section.toUpperCase());
        parts.push(e.name);
        e.rows.forEach(r => {
          if (cfg.records) {
            parts.push((r.label ? r.label + ' · ' : '') + r.value);
          }
          if (cfg.details) parts.push(...r.detail);
          if (cfg.notes && r.note) parts.push('※ ' + r.note);
        });
        if (cfg.prescribed && e.prescribed) {
          parts.push('원본 처방\n' + e.prescribed);
        }
        parts.push('');
      });
      if (cfg.foot.trim()) parts.push(cfg.foot.trim());
      return parts.join('\n').trim();
    }
    copy.onclick = async () => {
      const t = shareEnglish(text());
      try {
        if (!navigator.clipboard) {
          throw new Error('clipboard unavailable');
        }
        await navigator.clipboard.writeText(t);
        status.textContent = '텍스트를 복사했어요.';
      } catch (_) {
        const box = node('textarea', t, panel);
        box.readOnly = true;
        box.setAttribute('aria-label', '복사할 공유 텍스트');
        box.focus();
        box.select();
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
