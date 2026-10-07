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
    const [width, height] = sizes[cfg.size];
    const W = width / 2, H = height / 2, pad = 34;
    const measure = document.createElement('canvas').getContext('2d');
    const commands = [];

    function add(text, size, bold, gap, align) {
      text = shareEnglish(text);
      size *= cfg.fontSize / 40;
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
      if ((cfg.prescribed || !e.rows.length) && e.prescribed) {
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
      canvas.width = width;
      canvas.height = Math.round(logicalH * 2);

      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.fillStyle = cfg.color;
      ctx.strokeStyle = cfg.color;
      ctx.textBaseline = 'top';

      // Draw only text and rules; preview backgrounds never enter the PNG.
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
        ctx.font = (12 * cfg.fontSize / 40) + 'px ' + fonts[cfg.font];
        ctx.textAlign = 'right';
        ctx.fillText(
          (i + 1) + ' / ' + pages.length,
          W - pad, logicalH - pad
        );
      }
      return canvas;
    });
  }

  const css = `
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
#jn-workout-share .ws-font-size{grid-column:1/-1}
#jn-workout-share .ws-font-size-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}
#jn-workout-share .ws-font-size-row output{min-width:66px;text-align:center;font-variant-numeric:tabular-nums;font-size:14px}
#jn-workout-share input[type=range]{width:100%;height:30px;min-height:0;padding:0;margin:4px 0;appearance:auto;-webkit-appearance:auto;accent-color:var(--border-accent,#2f6fd6);box-shadow:none}
#jn-workout-share .ws-detail-hint{font-size:12px;line-height:1.5;color:var(--text-secondary,#666);margin:6px 0 12px}
#jn-workout-share .ws-preview-dock.is-expanded{position:absolute;inset:0;z-index:3;border:0;justify-content:center;padding:16px;background:var(--surface-0,#f2f2f0)}
#jn-workout-share .ws-preview-dock.is-expanded h3{align-self:center}
#jn-workout-share .ws-preview-dock.is-expanded h3,#jn-workout-share .ws-preview-dock.is-expanded>.ws-status:not(.ws-scale-hint){display:none}
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
      font: 'sans', color: '#ffffff', size: 'portrait', fontSize: 40,
      date: true, sections: true, records: true, details: true,
      notes: false, prescribed: false, foot: ''
    };
    const defaults = entries.filter(e => /metcon|메트콘/i.test(e.section));
    const selected = new Set(
      (defaults.length ? defaults : entries.filter(e =>
        !/warm\s*-?\s*up|웜업|워밍업/i.test(e.section)
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
      window.removeEventListener('resize', fitPreview);
      resizeObserver.disconnect();
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
        )].filter(x => !x.disabled && !x.closest('[inert]'));
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

    node('h3', '2. 폰트 · 글자색 · 저장 크기', settings);
    const controls = node('div', null, settings);
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
      ['portrait', '세로'],
      ['landscape', '가로'],
      ['crop', '내용에 맞춤']
    ]);

    const sizeBox = node('div', null, controls);
    sizeBox.className = 'ws-font-size';
    node('label', '기록 글자 크기 · PNG 기준', sizeBox);
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
    minus.onclick = () => changeSize(cfg.fontSize - 1);
    plus.onclick = () => changeSize(cfg.fontSize + 1);
    slider.oninput = () => changeSize(Number(slider.value));
    const fontHint = node('p', '기본 디자인의 기록 본문 기준이에요. 제목과 강조 기록도 같은 비율로 조절돼요.', sizeBox);
    fontHint.className = 'ws-detail-hint';
    function syncSize() {
      slider.value = String(cfg.fontSize); output.textContent = cfg.fontSize + ' px';
      minus.disabled = cfg.fontSize <= 24; plus.disabled = cfg.fontSize >= 72;
      presetButtons.forEach(({b,n}) => b.setAttribute('aria-pressed', String(n === cfg.fontSize)));
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
      ['prescribed', '원본']
    ].forEach(([k, t]) =>
      check(opts, t, cfg[k], v => { cfg[k] = v; update(); })
    );

    const hint = node('p', '세트 정보: 저장된 무게×횟수 등 추가 정보. 웜업은 별도 기록 없이 원본 프로그램을 선택할 수 있어요.', settings);
    hint.className = 'ws-detail-hint';
    node('label', '각주', settings);
    const foot = node('textarea', null, settings);
    foot.rows = 2;
    foot.maxLength = 300;
    foot.placeholder = '필요한 문구만 직접 입력';
    foot.setAttribute('aria-label', '각주');
    foot.oninput = () => { cfg.foot = foot.value; update(); };

    const caution = node(
      'p',
      '원본 처방은 실제 대체한 운동과 다를 수 있어요. '
      + '투명 배경의 체크 무늬는 저장되지 않아요.',
      settings
    );
    caution.className = 'ws-status';

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
    const scaleHint = node('p', '', dock);
    scaleHint.className = 'ws-status ws-scale-hint';
    const transparencyHint = node('p', '체크 무늬는 저장되지 않아요 · 투명 PNG', dock);
    transparencyHint.className = 'ws-status';
    function fitPreview() {
      const canvas = pages[page];
      if (!canvas) { preview.style.width = '0px'; scaleHint.textContent = ''; return; }
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
      const scale = w / canvas.width;
      const recordPx = cfg.fontSize * (style === 2 ? 1.7 : style === 3 ? 1.3 : 1);
      scaleHint.textContent = canvas.width + ' × ' + canvas.height + ' px · ' + Math.round(scale * 100) + '% 미리보기'
        + '\n기록 글자: PNG ' + Math.round(recordPx * 10) / 10 + ' px → 화면 ' + Math.round(recordPx * scale * 10) / 10 + ' px';
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
      try {
        if (document.fonts) {
          await document.fonts.load(
            '20px ' + fonts[cfg.font], '오늘 운동'
          ).catch(() => {});
        }
        if (closed || token !== revision) return;
        const list = chosen();
        pages = list.length
          ? renderPages(list, cfg, options.date, style) : [];

        designButtons.forEach(({ thumb }, i) => {
          thumb.replaceChildren();
          const p = list.length
            ? renderPages(
              list, Object.assign({}, cfg, { size: 'portrait' }),
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
        if ((cfg.prescribed || !e.rows.length) && e.prescribed) {
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
