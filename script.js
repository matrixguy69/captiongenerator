(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const refImg = document.getElementById('refImg');

  const el = (id) => document.getElementById(id);

  const state = {
    text: el('captionText').value,
    autoWrap: true,
    wrapWidth: 82,
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: 54,
    letterSpacing: 0,
    lineAlign: 'center',
    textColor: '#000000',
    bgColor: '#ffffff',
    bgOpacity: 100,
    cornerRadius: 100, // 0-100 scale, 100 = full pill
    padX: 22,
    padY: 12,
    lineGap: 10,
    posX: 50,
    posY: 80,
    canvasW: 1920,
    canvasH: 1080,
  };

  // ---------- helpers ----------
  function hexToRgba(hex, opacityPct) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacityPct / 100})`;
  }

  // corners = { tl, tr, br, bl } — independent radius per corner.
  // Appends a subpath to whatever path is currently open on c (caller does beginPath/fill).
  function addPillSubpath(c, x, y, w, h, corners) {
    const max = Math.min(w / 2, h / 2);
    const tl = Math.min(corners.tl, max);
    const tr = Math.min(corners.tr, max);
    const br = Math.min(corners.br, max);
    const bl = Math.min(corners.bl, max);
    c.moveTo(x + tl, y);
    c.lineTo(x + w - tr, y);
    c.arcTo(x + w, y, x + w, y + tr, tr);
    c.lineTo(x + w, y + h - br);
    c.arcTo(x + w, y + h, x + w - br, y + h, br);
    c.lineTo(x + bl, y + h);
    c.arcTo(x, y + h, x, y + h - bl, bl);
    c.lineTo(x, y + tl);
    c.arcTo(x, y, x + tl, y, tl);
    c.closePath();
  }

  // measures text width including manual letter-spacing (canvas letterSpacing has patchy support)
  function measureWidth(c, text, spacing) {
    if (!spacing) return c.measureText(text).width;
    let w = 0;
    for (const ch of text) w += c.measureText(ch).width + spacing;
    return w - spacing;
  }

  function drawSpacedText(c, text, cx, cy, spacing, align) {
    if (!spacing) {
      c.textAlign = 'center';
      c.fillText(text, cx, cy);
      return;
    }
    const totalWidth = measureWidth(c, text, spacing);
    let startX = cx - totalWidth / 2;
    c.textAlign = 'left';
    for (const ch of text) {
      const w = c.measureText(ch).width;
      c.fillText(ch, startX, cy);
      startX += w + spacing;
    }
  }

  function wrapLine(c, paragraph, maxWidth, spacing) {
    const words = paragraph.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (measureWidth(c, test, spacing) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function getLines() {
    const paragraphs = state.text.split('\n');
    const fontSpec = `${state.fontWeight} ${state.fontSize}px ${state.fontFamily}`;
    ctx.font = fontSpec;
    if (!state.autoWrap) return paragraphs;
    const maxWidth = state.canvasW * (state.wrapWidth / 100);
    let out = [];
    for (const p of paragraphs) {
      if (p.trim() === '') { out.push(''); continue; }
      out = out.concat(wrapLine(ctx, p, maxWidth, state.letterSpacing));
    }
    return out;
  }

  // ---------- render ----------
  function render() {
    canvas.width = state.canvasW;
    canvas.height = state.canvasH;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const lines = getLines().filter((l) => l !== undefined);
    if (lines.length === 0 || lines.every((l) => l.trim() === '')) return;

    const fontSpec = `${state.fontWeight} ${state.fontSize}px ${state.fontFamily}`;
    ctx.font = fontSpec;
    ctx.textBaseline = 'middle';

    const lineHeight = state.fontSize * 1.28 + state.padY * 2;
    const maxRadius = state.cornerRadius / 100 * (lineHeight / 2);

    const metrics = lines.map((line) => {
      const textW = measureWidth(ctx, line, state.letterSpacing);
      return { line, textW, boxW: textW + state.padX * 2, boxH: lineHeight };
    });

    const totalHeight = metrics.reduce((sum, m) => sum + m.boxH, 0) + state.lineGap * (metrics.length - 1);

    const anchorX = canvas.width * (state.posX / 100);
    const anchorY = canvas.height * (state.posY / 100);
    let cursorY = anchorY - totalHeight / 2;

    const bgFill = hexToRgba(state.bgColor, state.bgOpacity);

    // pass 1 — compute every box's position, then fill all pills as ONE
    // combined path so touching/overlapping seams don't double up alpha
    const boxes = metrics.map((m) => {
      const boxTop = cursorY;
      let boxLeft;
      if (state.lineAlign === 'center') boxLeft = anchorX - m.boxW / 2;
      else if (state.lineAlign === 'left') boxLeft = anchorX - metrics.reduce((mx, mm) => Math.max(mx, mm.boxW), 0) / 2;
      else boxLeft = anchorX + metrics.reduce((mx, mm) => Math.max(mx, mm.boxW), 0) / 2 - m.boxW;
      cursorY += m.boxH + state.lineGap;
      return { ...m, boxLeft, boxTop };
    });

    ctx.fillStyle = bgFill;
    ctx.beginPath();
    for (const b of boxes) {
      if (b.line.trim() === '') continue;
      const corners = { tl: maxRadius, tr: maxRadius, br: maxRadius, bl: maxRadius };
      addPillSubpath(ctx, b.boxLeft, b.boxTop, b.boxW, b.boxH, corners);
    }
    ctx.fill();

    // pass 2 — text on top
    ctx.fillStyle = state.textColor;
    ctx.font = fontSpec;
    ctx.textBaseline = 'middle';
    for (const b of boxes) {
      if (b.line.trim() === '') continue;
      const boxCenterY = b.boxTop + b.boxH / 2;
      drawSpacedText(ctx, b.line, b.boxLeft + b.boxW / 2, boxCenterY + state.fontSize * 0.02, state.letterSpacing);
    }
  }

  // ---------- font loading ----------
  async function ensureFontsLoaded() {
    const spec = `${state.fontWeight} ${state.fontSize}px ${state.fontFamily}`;
    try {
      await document.fonts.load(spec, state.text || 'A');
      await document.fonts.ready;
    } catch (e) { /* system fonts don't need loading */ }
    render();
  }

  // ---------- wiring ----------
  function bindRange(id, key, formatter) {
    const input = el(id);
    const valSpan = el(id + 'Val');
    const update = () => {
      state[key] = Number(input.value);
      if (valSpan) valSpan.textContent = formatter ? formatter(state[key]) : state[key];
      render();
    };
    input.addEventListener('input', update);
    update();
  }

  bindRange('fontSize', 'fontSize', (v) => `${v}px`);
  bindRange('letterSpacing', 'letterSpacing', (v) => `${v}px`);
  bindRange('bgOpacity', 'bgOpacity', (v) => `${v}%`);
  bindRange('cornerRadius', 'cornerRadius', (v) => (v >= 98 ? 'pill' : `${v}%`));
  bindRange('padX', 'padX', (v) => `${v}px`);
  bindRange('padY', 'padY', (v) => `${v}px`);
  bindRange('lineGap', 'lineGap', (v) => (v === 0 ? '0px (connected)' : `${v}px`));
  bindRange('posX', 'posX', (v) => `${v}%`);
  bindRange('posY', 'posY', (v) => `${v}%`);
  bindRange('wrapWidth', 'wrapWidth', (v) => `${v}%`);

  el('captionText').addEventListener('input', (e) => { state.text = e.target.value; render(); });

  el('autoWrap').addEventListener('change', (e) => {
    state.autoWrap = e.target.checked;
    el('wrapWidthField').style.opacity = state.autoWrap ? '1' : '0.4';
    el('wrapWidth').disabled = !state.autoWrap;
    render();
  });

  el('fontFamily').addEventListener('change', (e) => { state.fontFamily = e.target.value; ensureFontsLoaded(); });
  el('fontWeight').addEventListener('change', (e) => { state.fontWeight = Number(e.target.value); ensureFontsLoaded(); });

  function syncColor(colorId, hexId, key) {
    el(colorId).addEventListener('input', (e) => {
      state[key] = e.target.value;
      el(hexId).value = e.target.value;
      render();
    });
    el(hexId).addEventListener('input', (e) => {
      let v = e.target.value;
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        state[key] = v;
        el(colorId).value = v;
        render();
      }
    });
  }
  syncColor('textColor', 'textColorHex', 'textColor');
  syncColor('bgColor', 'bgColorHex', 'bgColor');

  // line alignment segmented control
  document.getElementById('lineAlign').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    document.querySelectorAll('#lineAlign button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.lineAlign = btn.dataset.value;
    render();
  });

  // position presets
  document.querySelectorAll('.row.presets .chip:not(.res-chip)').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.posX = Number(btn.dataset.posx);
      state.posY = Number(btn.dataset.posy);
      el('posX').value = state.posX;
      el('posY').value = state.posY;
      el('posXVal').textContent = `${state.posX}%`;
      el('posYVal').textContent = `${state.posY}%`;
      render();
    });
  });

  // resolution presets
  function setStageAspect() {
    stage.style.aspectRatio = `${state.canvasW} / ${state.canvasH}`;
  }
  document.querySelectorAll('.res-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.res-chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.canvasW = Number(btn.dataset.w);
      state.canvasH = Number(btn.dataset.h);
      el('canvasW').value = state.canvasW;
      el('canvasH').value = state.canvasH;
      setStageAspect();
      render();
    });
  });
  el('canvasW').addEventListener('input', (e) => {
    state.canvasW = Math.max(64, Number(e.target.value) || 64);
    document.querySelectorAll('.res-chip').forEach((b) => b.classList.remove('active'));
    setStageAspect();
    render();
  });
  el('canvasH').addEventListener('input', (e) => {
    state.canvasH = Math.max(64, Number(e.target.value) || 64);
    document.querySelectorAll('.res-chip').forEach((b) => b.classList.remove('active'));
    setStageAspect();
    render();
  });

  // reference image (positioning aid only, never exported)
  el('refImageInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    refImg.src = url;
    refImg.hidden = false;
  });
  el('clearRefBtn').addEventListener('click', () => {
    refImg.hidden = true;
    refImg.src = '';
    el('refImageInput').value = '';
  });

  // download
  el('downloadBtn').addEventListener('click', () => {
    render();
    const name = (el('fileName').value || 'caption').trim().replace(/[^a-z0-9-_]+/gi, '_');
    const link = document.createElement('a');
    link.download = `${name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // init
  setStageAspect();
  ensureFontsLoaded();
})();
