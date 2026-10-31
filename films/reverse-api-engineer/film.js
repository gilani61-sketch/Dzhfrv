import * as THREE from '../../engine/three.module.js';
import {
  W, H, PX, lens, Post, makeTextMesh, makeLines, makeCanvasMesh, dofMaterial,
  ease, clamp01, span, lerp, noise1, spline,
} from '../../engine/engine.js';
import { makeBackdrop, makeDust, makeCorridor, makePackets, handheld } from '../../engine/world.js';
import { drawBrowser, drawCode, drawChips, drawPrompt, drawMark, drawLogRow, LOG_LINES } from './content.js';

export const FPS = 30;
export const DURATION = 26.0;
const SUB = 3;            // motion-blur sub-samples per frame
const SHUTTER = 0.72;

const ACCENT = 0x7cc4ff;
const HOT = 0xffb27a;

/* ------------------------------------------------------------------ *
 *  Beat sheet — one continuous world, eight stations down one corridor
 * ------------------------------------------------------------------ */
const ST = [
  { t0: 0.00, t1: 3.40, z: 0 },      // 0  hook
  { t0: 3.40, t1: 5.90, z: -16 },    // 1  turn
  { t0: 5.90, t1: 9.40, z: -32 },    // 2  step 01
  { t0: 9.40, t1: 12.80, z: -48 },   // 3  step 02
  { t0: 12.80, t1: 16.60, z: -64 },  // 4  step 03
  { t0: 16.60, t1: 20.20, z: -80 },  // 5  why it holds
  { t0: 20.20, t1: 23.20, z: -96 },  // 6  the prompt
  { t0: 23.20, t1: 26.00, z: -112 }, // 7  cta
];

/* ------------------------------------------------------------------ *
 *  Small animation helpers
 * ------------------------------------------------------------------ */
function setU(obj, name, v) {
  obj.traverse(o => {
    if (o.material && o.material.uniforms && o.material.uniforms[name]) o.material.uniforms[name].value = v;
  });
}
const op = (o, v) => { if (o.material?.uniforms?.uOpacity) o.material.uniforms.uOpacity.value = v; };
const bl = (o, v) => { if (o.material?.uniforms?.uExtraBlur) o.material.uniforms.uExtraBlur.value = v; };

/**
 * Kinetic word reveal + exit. Words arrive out of the depth of the world,
 * resolve into focus, hold, then get carried past the lens.
 */
function words(group, t, cfg) {
  const { tIn, tOut, stagger = 0.055, dur = 0.85, outDur = 0.55,
    mode = 'depth', drift = 0.10, outMode = 'past' } = cfg;
  const ws = group.userData.words;
  ws.forEach((m, i) => {
    const home = m.userData.home;
    const a = ease.outQuint(span(t, tIn + i * stagger, tIn + i * stagger + dur));
    const o = tOut == null ? 0 : ease.inCubic(span(t, tOut + i * stagger * 0.35, tOut + i * stagger * 0.35 + outDur));

    let z = 0, y = 0, x = 0, s = 1, blur = (1 - a) * 1.25;
    if (mode === 'depth')  { z = lerp(-7.5, 0, a); }
    else if (mode === 'near') { z = lerp(4.2, 0, a); s = lerp(1.6, 1, a); }
    else if (mode === 'rise') { y = lerp(-0.30, 0, a); s = lerp(1.08, 1, a); }
    else if (mode === 'slide'){ x = lerp(-0.55, 0, a); }
    else if (mode === 'pop')  { s = lerp(0.72, 1, ease.outBack(span(t, tIn + i * stagger, tIn + i * stagger + dur * 0.8))); }

    // slow drift while held — nothing in frame is ever truly static
    const hold = t - (tIn + i * stagger);
    y += Math.sin(hold * 0.55 + i) * 0.012 * drift * 10;
    z += hold * drift * 0.055;

    if (o > 0) {
      if (outMode === 'past') { z += o * 7.0; s *= 1 + o * 0.35; }
      else { y -= o * 0.35; }
      blur += o * 1.6;
    }

    m.position.set(home.x + x, home.y + y, z);
    m.scale.setScalar(s);
    op(m, clamp01(a) * (1 - o));
    bl(m, blur);
  });
}

function fade(mesh, t, tIn, tOut, dIn = 0.5, dOut = 0.45) {
  const a = ease.outCubic(span(t, tIn, tIn + dIn));
  const o = tOut == null ? 0 : ease.inCubic(span(t, tOut, tOut + dOut));
  op(mesh, a * (1 - o));
  return { a, o };
}

/* Break a canvas plane into shards that can be thrown apart. */
function makeShards(cw, ch, draw, cols, rows, opt = {}) {
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  draw(cv.getContext('2d'), cw, ch);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 8;
  const scale = opt.scale ?? 1;
  const uw = cw / PX * scale, uh = ch / PX * scale;
  const g = new THREE.Group();
  const shards = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const geo = new THREE.PlaneGeometry(uw / cols, uh / rows);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (c + uv.getX(i)) / cols, (rows - 1 - r + uv.getY(i)) / rows);
      }
      uv.needsUpdate = true;
      const m = new THREE.Mesh(geo, dofMaterial(tex, { aspect: (uw / cols) / (uh / rows) }));
      m.position.set(-uw / 2 + uw / cols * (c + 0.5), uh / 2 - uh / rows * (r + 0.5), 0);
      m.userData.home = m.position.clone();
      m.userData.rand = [Math.random() - 0.5, Math.random() - 0.5, Math.random()];
      m.renderOrder = 9;
      g.add(m); shards.push(m);
    }
  }
  g.userData.shards = shards;
  g.userData.canvas = cv; g.userData.texture = tex;
  return g;
}

/* ------------------------------------------------------------------ *
 *  Boot
 * ------------------------------------------------------------------ */
export async function boot(canvas) {
  await document.fonts.load("800 100px 'Inter Display'");
  await document.fonts.load("600 40px 'JetBrains Mono'");
  await document.fonts.ready;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 400);
  const post = new Post(renderer);

  /* --- persistent world ------------------------------------------- */
  const backdrop = makeBackdrop();
  scene.add(backdrop);
  const dust = makeDust();
  scene.add(dust);
  const corridor = makeCorridor();
  scene.add(corridor);
  const packets = makePackets(300);
  scene.add(packets);

  /* --- station groups ---------------------------------------------- */
  const scenes = [];
  const addStation = (i, build) => {
    const g = new THREE.Group();
    g.position.z = ST[i].z;
    scene.add(g);
    const api = build(g, ST[i]);
    scenes.push({ ...ST[i], group: g, ...api });
  };

  const TXT = (s, o = {}) => makeLines(s, {
    size: o.size ?? 90, weight: o.weight ?? 800, maxWidth: o.maxWidth ?? 600,
    lineHeight: o.lineHeight ?? (o.size ?? 96) * 1.14,
    fill: o.fill ?? '#ffffff', color: o.color ?? 0xffffff, tracking: o.tracking ?? -1.5,
  });

  /* ============ 0 — the hook ====================================== */
  addStation(0, (g, st) => {
    const l1 = TXT('У Midjourney', { size: 86, color: 0xcfe0f5 });
    l1.position.set(0, 0.72, 0);
    const l2 = TXT('до сих пор', { size: 86, color: 0xcfe0f5 });
    l2.position.set(0, 0.36, 0);
    const l3 = TXT('нет API', { size: 132, weight: 800, color: 0xffffff, maxWidth: 620 });
    l3.position.set(0, -0.26, 0.25);
    const dot = makeTextMesh('.', { size: 132, weight: 800 });
    dot.position.set(l3.userData.lines[0].w / 2 + 0.06, -0.26, 0.25);
    const rule = makeCanvasMesh(560, 7, (c, w2, h2) => {
      const gr = c.createLinearGradient(0, 0, w2, 0);
      gr.addColorStop(0, 'rgba(124,196,255,0)');
      gr.addColorStop(0.5, 'rgba(160,215,255,0.9)');
      gr.addColorStop(1, 'rgba(124,196,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w2, h2);
    }, { additive: true });
    rule.position.set(0, -0.70, 0.25);
    g.add(l1, l2, l3, dot, rule);

    return {
      focusZ: () => 0,
      update(t) {
        words(l1, t, { tIn: st.t0 + 0.25, tOut: st.t1 - 0.55, mode: 'depth', stagger: 0.07 });
        words(l2, t, { tIn: st.t0 + 0.55, tOut: st.t1 - 0.50, mode: 'depth', stagger: 0.07 });
        words(l3, t, { tIn: st.t0 + 1.05, tOut: st.t1 - 0.45, mode: 'near', stagger: 0.10, dur: 1.0 });
        const a = ease.outQuint(span(t, st.t0 + 1.35, st.t0 + 2.0));
        const o = ease.inCubic(span(t, st.t1 - 0.45, st.t1));
        op(dot, a * (1 - o));
        dot.scale.setScalar(lerp(0.4, 1, ease.outBack(a)));
        bl(dot, (1 - a) * 1.4 + o * 1.6);
        dot.position.z = 0.25 + o * 7;
        const ra = ease.outExpo(span(t, st.t0 + 1.6, st.t0 + 2.5));
        rule.scale.x = ra;
        op(rule, ra * (1 - ease.inCubic(span(t, st.t1 - 0.5, st.t1))) * 0.9);
      },
    };
  });

  /* ============ 1 — but you can build it ========================== */
  addStation(1, (g, st) => {
    const l1 = TXT('Но его можно', { size: 78, color: 0xbcd2ea });
    l1.position.set(0, 0.46, 0);
    const l2 = TXT('собрать самому', { size: 112, weight: 800, maxWidth: 620 });
    l2.position.set(0, -0.18, 0.3);
    const sub = TXT('за один промпт', { size: 52, weight: 600, color: ACCENT });
    sub.position.set(0, -0.84, 0.3);
    g.add(l1, l2, sub);
    return {
      focusZ: () => 0.15,
      update(t) {
        words(l1, t, { tIn: st.t0 + 0.15, tOut: st.t1 - 0.55, mode: 'rise', stagger: 0.05 });
        words(l2, t, { tIn: st.t0 + 0.42, tOut: st.t1 - 0.48, mode: 'pop', stagger: 0.08, dur: 0.75 });
        words(sub, t, { tIn: st.t0 + 0.95, tOut: st.t1 - 0.45, mode: 'slide', stagger: 0.05 });
      },
    };
  });

  /* ============ 2 — step 01: it drives the site =================== */
  addStation(2, (g, st) => {
    const ghost = makeTextMesh('01', { size: 400, weight: 800, color: 0x4a7fd0 });
    ghost.position.set(-0.24, 1.00, -1.7);
    const browserState = { typed: '', caret: true, press: 0 };
    const card = makeCanvasMesh(980, 620, (c, w2, h2) => drawBrowser(c, w2, h2, browserState), { scale: 0.68 });
    card.position.set(0, 0.42, 0);
    const title = TXT('Открывает сайт и жмёт кнопки', { size: 72, maxWidth: 600 });
    title.position.set(0, -1.05, 0.25);
    const cursor = makeCanvasMesh(90, 110, (c) => {
      c.beginPath(); c.moveTo(10, 6); c.lineTo(10, 86); c.lineTo(30, 68); c.lineTo(44, 100); c.lineTo(58, 93); c.lineTo(45, 62); c.lineTo(70, 60); c.closePath();
      c.fillStyle = '#ffffff'; c.shadowColor = 'rgba(120,180,255,0.9)'; c.shadowBlur = 22; c.fill();
    }, { scale: 0.5 });
    const ring = makeCanvasMesh(300, 300, (c, w2) => {
      c.beginPath(); c.arc(w2 / 2, w2 / 2, w2 / 2 - 14, 0, 7);
      c.strokeStyle = 'rgba(150,205,255,0.95)'; c.lineWidth = 10; c.stroke();
    }, { scale: 0.5, additive: true });
    g.add(ghost, card, title, cursor, ring);

    const full = 'собор из света, кинематографично --ar 9:16';
    return {
      focusZ(t) { return t < st.t0 + 1.9 ? 0 : 0.2; },
      update(t) {
        fade(ghost, t, st.t0 + 0.1, st.t1 - 0.5, 0.9);
        op(ghost, (ghost.material.uniforms.uOpacity.value) * 0.085);
        ghost.position.y = 1.05 + Math.sin(t * 0.4) * 0.03;

        const ca = ease.outQuint(span(t, st.t0 + 0.12, st.t0 + 1.0));
        const co = ease.inCubic(span(t, st.t1 - 0.55, st.t1));
        card.position.z = lerp(-3.2, 0, ca) + co * 6.5;
        card.rotation.y = lerp(-0.32, 0.015, ca) + co * 0.12;
        card.rotation.x = lerp(0.14, -0.008, ca);
        card.scale.setScalar(lerp(1.1, 1, ca) * (1 + co * 0.25));
        op(card, ca * (1 - co));
        bl(card, (1 - ca) * 1.1 + co * 1.5);

        // typing, then the click
        const tp = span(t, st.t0 + 0.75, st.t0 + 2.05);
        browserState.typed = full.slice(0, Math.round(full.length * tp));
        browserState.caret = tp < 1 ? (Math.floor(t * 2.2) % 2 === 0) : false;
        const press = Math.exp(-Math.pow((t - (st.t0 + 2.45)) * 7.0, 2));
        browserState.press = press;
        drawBrowser(card.userData.ctx, 980, 620, browserState);
        card.userData.texture.needsUpdate = true;

        // cursor travels to the button and clicks
        const mv = ease.inOutQuint(span(t, st.t0 + 1.9, st.t0 + 2.45));
        const cw = card.userData.boxW ?? 2.0;
        cursor.position.set(lerp(0.95, 0.42, mv), lerp(-0.55, 0.06, mv), 0.3);
        cursor.scale.setScalar(1 - press * 0.22);
        op(cursor, ease.outCubic(span(t, st.t0 + 1.75, st.t0 + 2.0)) * (1 - ease.inCubic(span(t, st.t0 + 2.9, st.t0 + 3.2))));
        const rp = span(t, st.t0 + 2.42, st.t0 + 3.1);
        ring.position.set(0.42, 0.06, 0.28);
        ring.scale.setScalar(lerp(0.08, 1.5, ease.outQuart(rp)));
        op(ring, (1 - rp) * (rp > 0 ? 0.85 : 0));

        words(title, t, { tIn: st.t0 + 0.55, tOut: st.t1 - 0.45, mode: 'rise', stagger: 0.04 });
      },
    };
  });

  /* ============ 3 — step 02: it records every request ============= */
  addStation(3, (g, st) => {
    const ghost = makeTextMesh('02', { size: 400, weight: 800, color: 0x4a7fd0 });
    ghost.position.set(0.24, 1.00, -1.7);
    const rows = LOG_LINES.map((row, i) => {
      const m = makeCanvasMesh(780, 66, (c, w2, h2) => drawLogRow(c, w2, h2, row), { scale: 0.72 });
      m.userData.row = row;
      m.position.set(0, 1.00 - i * 0.215, 0);
      return m;
    });
    rows.forEach(r => g.add(r));
    const title = TXT('Пишет каждый запрос к серверу', { size: 66, maxWidth: 620 });
    title.position.set(0, -1.22, 0.25);
    g.add(ghost, title);

    return {
      focusZ: () => 0.1,
      update(t) {
        fade(ghost, t, st.t0 + 0.1, st.t1 - 0.5, 0.9);
        op(ghost, ghost.material.uniforms.uOpacity.value * 0.085);

        const scroll = clamp01(span(t, st.t0 + 0.3, st.t1 - 0.3));
        rows.forEach((m, i) => {
          const tIn = st.t0 + 0.28 + i * 0.13;
          const a = ease.outQuint(span(t, tIn, tIn + 0.5));
          const o = ease.inCubic(span(t, st.t1 - 0.55 + i * 0.02, st.t1 - 0.05 + i * 0.02));
          m.position.y = 1.00 - i * 0.215 - scroll * 0.30;
          m.position.x = lerp(0.5, 0, a);
          m.position.z = lerp(-1.6, 0, a) + o * 5.5;
          op(m, a * (1 - o) * clamp01((m.position.y + 0.92) * 3.2) * (1 - clamp01((m.position.y - 1.02) * 3)));
          bl(m, (1 - a) * 1.4 + o * 1.4);
        });
        words(title, t, { tIn: st.t0 + 0.5, tOut: st.t1 - 0.45, mode: 'rise', stagger: 0.04 });
      },
    };
  });

  /* ============ 4 — step 03: it writes the client ================= */
  addStation(4, (g, st) => {
    const ghost = makeTextMesh('03', { size: 400, weight: 800, color: 0x4a7fd0 });
    ghost.position.set(-0.24, 1.00, -1.7);
    let codeProgress = 0;
    const panel = makeCanvasMesh(900, 460, (c, w2, h2) => drawCode(c, w2, h2, 1), { scale: 0.76 });
    panel.position.set(0, 0.40, 0);
    let chipsLit = 0;
    const chips = makeCanvasMesh(900, 90, (c, w2, h2) => drawChips(c, w2, h2, ['Python', 'TypeScript', 'Go', '+ ещё 7'], 1), { scale: 0.62 });
    chips.position.set(0, -0.52, 0.1);
    const title = TXT('Собирает готовый API-клиент', { size: 66, maxWidth: 620 });
    title.position.set(0, -1.12, 0.25);
    g.add(ghost, panel, chips, title);

    return {
      focusZ(t) { return t < st.t0 + 1.6 ? 0 : 0.1; },
      update(t) {
        fade(ghost, t, st.t0 + 0.1, st.t1 - 0.5, 0.9);
        op(ghost, ghost.material.uniforms.uOpacity.value * 0.085);

        const a = ease.outQuint(span(t, st.t0 + 0.1, st.t0 + 0.95));
        const o = ease.inCubic(span(t, st.t1 - 0.55, st.t1));
        panel.position.z = lerp(-2.6, 0, a) + o * 6.2;
        panel.rotation.x = lerp(-0.22, 0.01, a);
        panel.scale.setScalar(lerp(1.08, 1, a) * (1 + o * 0.22));
        op(panel, a * (1 - o));
        bl(panel, (1 - a) * 1.2 + o * 1.5);

        codeProgress = ease.outCubic(span(t, st.t0 + 0.5, st.t0 + 2.3));
        drawCode(panel.userData.ctx, 900, 460, codeProgress);
        panel.userData.texture.needsUpdate = true;

        chipsLit = span(t, st.t0 + 1.9, st.t0 + 2.9);
        drawChips(chips.userData.ctx, 900, 90, ['Python', 'TypeScript', 'Go', '+ ещё 7'], chipsLit * 1.05);
        chips.userData.texture.needsUpdate = true;
        const cf = fade(chips, t, st.t0 + 1.75, st.t1 - 0.5, 0.45);
        chips.position.z = 0.1 + cf.o * 5.5;
        bl(chips, cf.o * 1.4);

        words(title, t, { tIn: st.t0 + 0.65, tOut: st.t1 - 0.45, mode: 'rise', stagger: 0.04 });
      },
    };
  });

  /* ============ 5 — why it does not break ========================= */
  addStation(5, (g, st) => {
    const shards = makeShards(900, 540, (c, w2, h2) => {
      drawBrowser(c, w2, h2, { variant: 'redesign', url: 'midjourney.com' });
    }, 5, 3, { scale: 0.66 });
    shards.position.set(0, 0.66, 0);
    const l1 = TXT('Парсер ломается от новой кнопки', { size: 66, maxWidth: 580, color: HOT, fill: '#ffd3b0' });
    l1.position.set(0, -0.28, 0.2);
    const l2 = TXT('Клиент говорит с сервером на его языке', { size: 70, maxWidth: 580 });
    l2.position.set(0, -0.20, 0.2);
    g.add(shards, l1, l2);

    const tBreak = st.t0 + 1.75;
    return {
      focusZ: () => 0.05,
      update(t) {
        const a = ease.outQuint(span(t, st.t0 + 0.05, st.t0 + 0.8));
        const brk = span(t, tBreak, tBreak + 1.35);
        const e = ease.outQuart(brk);
        shards.userData.shards.forEach((m, i) => {
          const r = m.userData.rand;
          const home = m.userData.home;
          m.position.set(
            home.x + r[0] * e * 2.6,
            home.y + r[1] * e * 1.9 - e * e * 0.5,
            lerp(-2.2, 0, a) + r[2] * e * 3.4);
          m.rotation.set(r[1] * e * 2.0, r[0] * e * 2.4, r[2] * e * 1.6);
          op(m, a * (1 - ease.inCubic(brk)));
          bl(m, (1 - a) * 1.2 + e * 1.8);
        });
        words(l1, t, { tIn: st.t0 + 0.45, tOut: tBreak + 0.75, mode: 'rise', stagger: 0.035, outDur: 0.4, outMode: 'down' });
        words(l2, t, { tIn: tBreak + 1.0, tOut: st.t1 - 0.45, mode: 'pop', stagger: 0.05, dur: 0.7 });
      },
    };
  });

  /* ============ 6 — the prompt ==================================== */
  addStation(6, (g, st) => {
    const PROMPT = 'Открой midjourney.com, сгенерируй картинку и собери из запросов клиент на Python';
    const panel = makeCanvasMesh(900, 300, (c, w2, h2) => drawPrompt(c, w2, h2, PROMPT, PROMPT.length, false), { scale: 0.76 });
    panel.position.set(0, 0.18, 0);
    const label = TXT('Одна фраза агенту', { size: 54, weight: 700, color: ACCENT, maxWidth: 580 });
    label.position.set(0, 0.82, 0.1);
    const foot = TXT('дальше он работает сам', { size: 62, weight: 700, maxWidth: 580 });
    foot.position.set(0, -0.70, 0.1);
    g.add(panel, label, foot);

    return {
      focusZ: () => 0.05,
      update(t) {
        const a = ease.outQuint(span(t, st.t0 + 0.08, st.t0 + 0.8));
        const o = ease.inCubic(span(t, st.t1 - 0.55, st.t1));
        panel.position.z = lerp(-2.4, 0, a) + o * 6.0;
        panel.rotation.x = lerp(-0.18, 0.008, a);
        op(panel, a * (1 - o));
        bl(panel, (1 - a) * 1.1 + o * 1.5);

        const tp = span(t, st.t0 + 0.45, st.t0 + 2.3);
        const shown = Math.round(PROMPT.length * ease.outCubic(tp));
        drawPrompt(panel.userData.ctx, 900, 300, PROMPT, shown, tp < 1 ? Math.floor(t * 3) % 2 === 0 : false);
        panel.userData.texture.needsUpdate = true;

        words(label, t, { tIn: st.t0 + 0.2, tOut: st.t1 - 0.45, mode: 'slide', stagger: 0.04 });
        words(foot, t, { tIn: st.t0 + 2.1, tOut: st.t1 - 0.45, mode: 'rise', stagger: 0.05 });
      },
    };
  });

  /* ============ 7 — the close ===================================== */
  addStation(7, (g, st) => {
    const mark = makeCanvasMesh(320, 320, (c, w2, h2) => drawMark(c, w2, h2, 1), { scale: 0.76 });
    mark.position.set(0, 0.78, 0);
    const name = TXT('Reverse API Engineer', { size: 86, weight: 800, maxWidth: 560 });
    name.position.set(0, -0.14, 0.1);
    const sub = TXT('бесплатно · открытый код', { size: 44, weight: 600, color: 0xa9c4e2, maxWidth: 620 });
    sub.position.set(0, -0.76, 0.1);
    const cta = makeCanvasMesh(600, 118, (c, w2, h2) => {
      const r = 55;
      c.beginPath();
      c.moveTo(r, 0); c.arcTo(w2, 0, w2, h2, r); c.arcTo(w2, h2, 0, h2, r);
      c.arcTo(0, h2, 0, 0, r); c.arcTo(0, 0, w2, 0, r); c.closePath();
      const gr = c.createLinearGradient(0, 0, w2, h2);
      gr.addColorStop(0, 'rgba(150,205,255,0.96)');
      gr.addColorStop(1, 'rgba(110,160,255,0.96)');
      c.fillStyle = gr; c.fill();
      c.fillStyle = '#06101d';
      c.font = "700 44px 'Inter Display','Inter',sans-serif";
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ссылка в описании', w2 / 2, h2 / 2 + 2);
    }, { scale: 0.62 });
    cta.position.set(0, -1.22, 0.1);
    g.add(mark, name, sub, cta);

    return {
      focusZ: () => 0.05,
      update(t) {
        const ma = span(t, st.t0 + 0.05, st.t0 + 1.1);
        drawMark(mark.userData.ctx, 320, 320, ease.outQuart(ma));
        mark.userData.texture.needsUpdate = true;
        op(mark, ease.outCubic(span(t, st.t0, st.t0 + 0.35)));
        mark.position.z = lerp(-1.4, 0, ease.outQuint(span(t, st.t0, st.t0 + 1.0)));
        bl(mark, (1 - ease.outQuint(span(t, st.t0, st.t0 + 1.0))) * 1.0);

        words(name, t, { tIn: st.t0 + 0.55, tOut: null, mode: 'pop', stagger: 0.06, dur: 0.8, drift: 0.04 });
        words(sub, t, { tIn: st.t0 + 1.15, tOut: null, mode: 'rise', stagger: 0.04, drift: 0.03 });
        const ca = ease.outBack(span(t, st.t0 + 1.5, st.t0 + 2.1));
        op(cta, clamp01(ca));
        cta.scale.setScalar(lerp(0.8, 1, clamp01(ca)) * (1 + Math.sin(t * 2.4) * 0.008));
      },
    };
  });

  /* ------------------------------------------------------------------ *
   *  The single, unbroken camera move
   * ------------------------------------------------------------------ */
  const camZ = [[-1.0, ST[0].z + 13.5]];
  const camX = [[-1.0, 0.10]], camY = [[-1.0, -0.07]];
  ST.forEach((s, i) => {
    camZ.push([s.t0 + 0.28, s.z + 8.2]);
    camZ.push([s.t1 - 0.46, s.z + 6.0]);
    const sx = (i % 2 === 0 ? 1 : -1) * 0.085;
    camX.push([s.t0 + 0.28, sx]); camX.push([s.t1 - 0.46, -sx * 0.5]);
    camY.push([s.t0 + 0.28, (i % 3 === 0 ? 0.07 : -0.055)]);
    camY.push([s.t1 - 0.46, (i % 3 === 0 ? -0.045 : 0.05)]);
  });
  camZ.push([DURATION + 1.2, ST[7].z + 4.4]);
  camX.push([DURATION + 1.2, 0]); camY.push([DURATION + 1.2, 0]);

  function activeIndex(t) {
    for (let i = ST.length - 1; i >= 0; i--) if (t >= ST[i].t0) return i;
    return 0;
  }

  /* transition energy: 1 right at a station boundary, 0 while holding */
  function whoosh(t) {
    let e = 0;
    for (let i = 1; i < ST.length; i++) {
      const b = ST[i].t0;
      e = Math.max(e, Math.exp(-Math.pow((t - b) * 3.1, 2)));
    }
    return e;
  }

  /* ------------------------------------------------------------------ *
   *  Per-sample world update
   * ------------------------------------------------------------------ */
  function update(t) {
    const pz = spline(camZ, t);
    camera.position.set(spline(camX, t), spline(camY, t), pz);
    camera.rotation.set(0, 0, 0);
    const wh = whoosh(t);
    camera.rotation.z = Math.sin(t * 0.3) * 0.006 + wh * 0.02 * Math.sin(t * 1.7);
    handheld(camera, t, 1.0 - wh * 0.4);
    camera.updateMatrixWorld();

    // focus: always riding the active station, racking across the travel
    const i = activeIndex(t);
    const cur = scenes[i];
    const nxt = scenes[Math.min(scenes.length - 1, i + 1)];
    const blend = ease.inOut(span(t, cur.t1 - 0.42, cur.t1 + 0.30));
    const fz = lerp(cur.z + (cur.focusZ ? cur.focusZ(t) : 0), nxt.z + (nxt.focusZ ? nxt.focusZ(t) : 0), blend);
    const dist = Math.max(0.6, camera.position.z - fz);
    // a touch of focus lag — the lens is always catching up a little
    lens.uFocus.value = dist + Math.sin(t * 0.8) * 0.05;
    lens.uAperture.value = 0.075 + wh * 0.075;
    lens.uMaxBlur.value = 0.026 + wh * 0.012;

    // world
    backdrop.material.uniforms.uTime.value = t;
    backdrop.material.uniforms.uShift.value = -camera.position.z * 0.05;
    const warm = clamp01(span(t, 16.4, 17.6) - span(t, 19.0, 20.2)) * 0.80;
    backdrop.material.uniforms.uWarm.value = warm;
    const tint = backdrop.material.uniforms.uTint.value;
    tint.setHSL(lerp(0.60, 0.045, warm / 0.80), 0.9, 0.5);

    dust.material.uniforms.uTime.value = t;
    dust.material.uniforms.uZ.value = camera.position.z;
    dust.material.uniforms.uAmount.value = 0.42 + wh * 0.35;

    corridor.userData.mat.uniforms.uTime.value = t;
    corridor.userData.mat.uniforms.uZ.value = camera.position.z;
    corridor.position.z = camera.position.z - 70;
    corridor.userData.mat.uniforms.uAmount.value = lerp(0.16, 0.45, clamp01(span(t, 8.6, 10.2))) * (1 - 0.5 * span(t, 22.6, 24.0));

    // packets swell through the "records every request" beat
    const pk = clamp01(span(t, 8.4, 9.9)) * (1 - clamp01(span(t, 15.6, 17.0)) * 0.55)
             + wh * 0.35 + clamp01(span(t, 22.8, 24.0)) * 0.35;
    packets.material.uniforms.uTime.value = t;
    packets.material.uniforms.uZ.value = camera.position.z;
    packets.material.uniforms.uAmount.value = clamp01(pk) * 1.15;
    packets.material.uniforms.uStretch.value = 0.6 + wh * 3.2;
    packets.material.uniforms.uSpeed.value = 18 + wh * 26;

    // stations
    scenes.forEach((s, idx) => {
      const live = t > s.t0 - 1.6 && t < s.t1 + 1.2;
      s.group.visible = live;
      if (live) s.update(t);
    });

    // grade
    const u = post.comp.uniforms;
    u.uExposure.value = 1.0 + wh * 0.16 + Math.exp(-Math.pow((t - 3.52) * 8, 2)) * 0.18;
    u.uAberration.value = 0.0013 + wh * 0.0042;
    u.uBloom.value = 0.26 + wh * 0.12;
    u.uGlitch.value = Math.max(
      Math.exp(-Math.pow((t - 18.15) * 7.0, 2)) * 0.010,
      wh * 0.0016);
    u.uFade.value = ease.outCubic(span(t, 0, 0.55)) * (1 - ease.inCubic(span(t, DURATION - 0.6, DURATION)));
  }

  /* ------------------------------------------------------------------ *
   *  Frame renderer — motion blur by sub-sample accumulation
   * ------------------------------------------------------------------ */
  function renderFrame(frame) {
    const base = frame / FPS;
    post.beginAccum();
    for (let s = 0; s < SUB; s++) {
      const t = base + (SHUTTER / FPS) * (s / SUB);
      update(t);
      renderer.setRenderTarget(post.rtScene);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      post.addAccum(1 / SUB);
    }
    post.render(base);
  }

  window.__film = { FPS, DURATION, total: Math.round(DURATION * FPS), renderFrame };
  renderFrame(0);
  return window.__film;
}
