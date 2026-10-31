import * as THREE from './three.module.js';

export const W = 1080, H = 1920;
export const PX = 300; // canvas pixels per world unit

/* ------------------------------------------------------------------ *
 *  Shared cinematography uniforms (one lens for the whole world)
 * ------------------------------------------------------------------ */
export const lens = {
  uFocus:    { value: 9.0 },   // focus distance in world units
  uAperture: { value: 0.085 }, // how fast things fall out of focus
  uMaxBlur:  { value: 0.030 }, // max blur radius in uv units
};

/* ------------------------------------------------------------------ *
 *  Depth-of-field text / sprite material
 * ------------------------------------------------------------------ */
const DOF_VERT = /* glsl */`
  varying vec2 vUv;
  varying float vCoC;
  uniform float uFocus, uAperture;
  void main(){
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float d = -mv.z;
    vCoC = clamp(abs(d - uFocus) * uAperture, 0.0, 1.0);
    vCoC = pow(vCoC, 0.85);
    gl_Position = projectionMatrix * mv;
  }`;

const DOF_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  varying float vCoC;
  uniform sampler2D uMap;
  uniform vec3  uColor;
  uniform float uOpacity, uMaxBlur, uGain, uExtraBlur, uAspect;
  const vec2 D[12] = vec2[12](
    vec2( 0.000, 1.000), vec2( 0.866, 0.500), vec2( 0.866,-0.500),
    vec2( 0.000,-1.000), vec2(-0.866,-0.500), vec2(-0.866, 0.500),
    vec2( 0.000, 0.520), vec2( 0.450, 0.260), vec2( 0.450,-0.260),
    vec2( 0.000,-0.520), vec2(-0.450,-0.260), vec2(-0.450, 0.260));
  void main(){
    float r = (vCoC + uExtraBlur) * uMaxBlur;
    vec4 c;
    if (r < 0.0012) {
      c = texture2D(uMap, vUv);
    } else {
      c = texture2D(uMap, vUv) * 0.28;
      float wsum = 0.28;
      for (int i = 0; i < 12; i++){
        vec2 off = D[i] * r * vec2(1.0, uAspect);
        c += texture2D(uMap, vUv + off) * 0.06;
        wsum += 0.06;
      }
      c /= wsum;
    }
    float a = c.a * uOpacity;
    if (a < 0.002) discard;
    vec3 lin = pow(max(c.rgb, 0.0), vec3(2.2));   // canvas art is authored in sRGB
    gl_FragColor = vec4(lin * uColor * uGain, a);
  }`;

export function dofMaterial(map, opts = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: DOF_VERT,
    fragmentShader: DOF_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uMap:       { value: map },
      uColor:     { value: new THREE.Color(opts.color ?? 0xffffff) },
      uOpacity:   { value: opts.opacity ?? 1 },
      uGain:      { value: opts.gain ?? 1 },
      uExtraBlur: { value: 0 },
      uAspect:    { value: opts.aspect ?? 1 },
      uFocus:     lens.uFocus,
      uAperture:  lens.uAperture,
      uMaxBlur:   lens.uMaxBlur,
    },
  });
  return m;
}

/* ------------------------------------------------------------------ *
 *  Canvas text → textured plane
 * ------------------------------------------------------------------ */
const _measure = document.createElement('canvas').getContext('2d');

function fontString(o) {
  return `${o.weight ?? 700} ${o.size}px ${o.family ?? "'Inter Display','Inter',sans-serif"}`;
}

export function makeTextMesh(str, opt = {}) {
  const size = opt.size ?? 110;
  const pad = Math.ceil(size * 0.6);
  const tracking = opt.tracking ?? 0;
  _measure.font = fontString({ ...opt, size });
  const chars = [...str];
  let w = 0;
  for (const ch of chars) w += _measure.measureText(ch).width + tracking;
  w = Math.max(1, Math.ceil(w));
  const cw = w + pad * 2;
  const chh = Math.ceil(size * 1.5) + pad * 2;

  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = chh;
  const g = cv.getContext('2d');
  g.font = fontString({ ...opt, size });
  g.textBaseline = 'middle';
  g.fillStyle = opt.fill ?? '#ffffff';
  if (opt.shadow) { g.shadowColor = opt.shadow; g.shadowBlur = size * 0.5; }
  let x = pad;
  const y = chh / 2;
  for (const ch of chars) {
    g.fillText(ch, x, y);
    x += g.measureText(ch).width + tracking;
  }
  if (opt.strokeOnly) {
    g.clearRect(0, 0, cw, chh);
    g.lineWidth = Math.max(1, size * 0.045);
    g.strokeStyle = opt.fill ?? '#ffffff';
    let sx = pad;
    for (const ch of chars) { g.strokeText(ch, sx, y); sx += g.measureText(ch).width + tracking; }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;

  const uw = cw / PX, uh = chh / PX;
  const mat = dofMaterial(tex, {
    color: opt.color ?? 0xffffff,
    gain: opt.gain ?? 1,
    aspect: uw / uh,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(uw, uh), mat);
  mesh.userData.inkWidth = w / PX;
  mesh.userData.inkHeight = size / PX;
  mesh.userData.boxW = uw;
  mesh.userData.boxH = uh;
  mesh.renderOrder = opt.renderOrder ?? 10;
  return mesh;
}

/* Lay a sentence out as individually animatable word meshes. */
export function makeLines(text, opt = {}) {
  const maxW = (opt.maxWidth ?? 900) / PX;
  const lineH = (opt.lineHeight ?? (opt.size ?? 110) * 1.18) / PX;
  const words = text.split(' ');
  const meshes = words.map(w => makeTextMesh(w, opt));
  const spaceW = (opt.size ?? 110) * 0.3 / PX;

  const lines = [];
  let cur = [], curW = 0;
  for (const m of meshes) {
    const ww = m.userData.inkWidth;
    if (cur.length && curW + spaceW + ww > maxW) { lines.push({ items: cur, w: curW }); cur = []; curW = 0; }
    curW += (cur.length ? spaceW : 0) + ww;
    cur.push(m);
  }
  if (cur.length) lines.push({ items: cur, w: curW });

  const group = new THREE.Group();
  const totalH = (lines.length - 1) * lineH;
  lines.forEach((ln, li) => {
    let x = -ln.w / 2;
    const y = totalH / 2 - li * lineH;
    ln.items.forEach(m => {
      const ww = m.userData.inkWidth;
      m.position.set(x + ww / 2, y, 0);
      m.userData.home = m.position.clone();
      x += ww + spaceW;
      group.add(m);
    });
  });
  group.userData.words = meshes;
  group.userData.lines = lines;
  group.userData.height = totalH + lineH;
  return group;
}

/* ------------------------------------------------------------------ *
 *  Canvas panel → textured plane (browser mocks, code panes, chips)
 * ------------------------------------------------------------------ */
export function makeCanvasMesh(cw, ch, draw, opt = {}) {
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d');
  draw(g, cw, ch);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;
  const scale = opt.scale ?? 1;
  const uw = cw / PX * scale, uh = ch / PX * scale;
  const mat = dofMaterial(tex, { color: opt.color ?? 0xffffff, gain: opt.gain ?? 1, aspect: uw / uh, additive: opt.additive });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(uw, uh), mat);
  mesh.userData.canvas = cv;
  mesh.userData.ctx = g;
  mesh.userData.texture = tex;
  mesh.renderOrder = opt.renderOrder ?? 8;
  return mesh;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* ------------------------------------------------------------------ *
 *  Post-processing chain: bloom → grade → aberration → grain → vignette
 * ------------------------------------------------------------------ */
const quadGeo = new THREE.PlaneGeometry(2, 2);

function fullscreenPass(fragment, uniforms) {
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: /* glsl */`
      in vec3 position; in vec2 uv; out vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: fragment,
    uniforms,
    depthTest: false, depthWrite: false,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(quadGeo, mat));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { scene, cam, mat, uniforms };
}

const BRIGHT = /* glsl */`
  precision highp float; in vec2 vUv; out vec4 o;
  uniform sampler2D tDiffuse; uniform float uThreshold, uSoft;
  void main(){
    vec3 c = texture(tDiffuse, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float k = smoothstep(uThreshold, uThreshold + uSoft, l);
    o = vec4(c * k, 1.0);
  }`;

const BLUR = /* glsl */`
  precision highp float; in vec2 vUv; out vec4 o;
  uniform sampler2D tDiffuse; uniform vec2 uDir;
  void main(){
    vec3 s = texture(tDiffuse, vUv).rgb * 0.227027;
    s += texture(tDiffuse, vUv + uDir * 1.3846).rgb * 0.316216;
    s += texture(tDiffuse, vUv - uDir * 1.3846).rgb * 0.316216;
    s += texture(tDiffuse, vUv + uDir * 3.2307).rgb * 0.070270;
    s += texture(tDiffuse, vUv - uDir * 3.2307).rgb * 0.070270;
    o = vec4(s, 1.0);
  }`;

const COMPOSITE = /* glsl */`
  precision highp float; in vec2 vUv; out vec4 o;
  uniform sampler2D tDiffuse, tBloomA, tBloomB, tBloomC;
  uniform float uBloom, uAberration, uGrain, uVignette, uTime, uExposure, uFade, uGlitch;

  vec3 aces(vec3 x){
    const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
  }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main(){
    vec2 uv = vUv;
    vec2 c = uv - 0.5;
    float r2 = dot(c, c);

    // barrel + chromatic aberration, stronger toward the edges
    float ab = uAberration * (0.25 + r2 * 2.4);
    vec2 off = c * ab;

    // horizontal data-glitch slip
    float gl = uGlitch;
    if (gl > 0.001){
      float band = floor(uv.y * 90.0);
      float n = hash(vec2(band, floor(uTime * 24.0)));
      uv.x += (n - 0.5) * gl * step(0.72, n);
    }

    vec3 col;
    col.r = texture(tDiffuse, uv - off).r;
    col.g = texture(tDiffuse, uv).g;
    col.b = texture(tDiffuse, uv + off).b;

    vec3 bloom = texture(tBloomA, uv).rgb * 0.55
               + texture(tBloomB, uv).rgb * 0.75
               + texture(tBloomC, uv).rgb * 1.0;
    col += bloom * uBloom;

    col *= uExposure;
    col = aces(col);

    // filmic grade: cool shadows, clean warm-neutral highlights
    col = pow(col, vec3(1.02, 1.0, 0.985));
    col += vec3(-0.004, 0.002, 0.016) * (1.0 - smoothstep(0.0, 0.5, col));

    // vignette
    float vig = smoothstep(0.95, 0.18, r2 * 1.65);
    col *= mix(1.0, vig, uVignette);

    // grain
    float g = hash(uv * vec2(1920.0, 1080.0) + uTime * 37.0) - 0.5;
    col += g * uGrain * (1.0 - 0.55 * dot(col, vec3(0.333)));

    col *= uFade;
    // linear -> display
    col = mix(col * 12.92, 1.055 * pow(max(col, 1e-5), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
    o = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    const rtOpt = { type: THREE.HalfFloatType, colorSpace: THREE.NoColorSpace, depthBuffer: false };
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { ...rtOpt, depthBuffer: true });
    this.rtAccum = new THREE.WebGLRenderTarget(W, H, rtOpt);
    const mk = (d) => new THREE.WebGLRenderTarget(Math.ceil(W / d), Math.ceil(H / d), rtOpt);
    this.b1 = mk(4);  this.b1b = mk(4);
    this.b2 = mk(8);  this.b2b = mk(8);
    this.b3 = mk(16); this.b3b = mk(16);

    this.bright = fullscreenPass(BRIGHT, {
      tDiffuse: { value: null }, uThreshold: { value: 0.90 }, uSoft: { value: 0.40 },
    });
    this.blur = fullscreenPass(BLUR, { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.comp = fullscreenPass(COMPOSITE, {
      tDiffuse: { value: this.rtAccum.texture },
      tBloomA: { value: this.b1.texture },
      tBloomB: { value: this.b2.texture },
      tBloomC: { value: this.b3.texture },
      uBloom: { value: 0.26 }, uAberration: { value: 0.0016 }, uGrain: { value: 0.022 },
      uVignette: { value: 1.0 }, uTime: { value: 0 }, uExposure: { value: 1.0 },
      uFade: { value: 1 }, uGlitch: { value: 0 },
    });

    // accumulation helpers
    this.copy = fullscreenPass(/* glsl */`
      precision highp float; in vec2 vUv; out vec4 o;
      uniform sampler2D tDiffuse; uniform float uWeight;
      void main(){ o = vec4(texture(tDiffuse, vUv).rgb * uWeight, 1.0); }`,
      { tDiffuse: { value: null }, uWeight: { value: 1 } });
    this.copy.mat.blending = THREE.AdditiveBlending;
    this.copy.mat.transparent = true;
  }

  _run(pass, target) {
    this.renderer.setRenderTarget(target);
    this.renderer.render(pass.scene, pass.cam);
  }

  beginAccum() {
    this.renderer.setRenderTarget(this.rtAccum);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear(true, true, true);
  }

  addAccum(weight) {
    this.copy.uniforms.tDiffuse.value = this.rtScene.texture;
    this.copy.uniforms.uWeight.value = weight;
    this.renderer.autoClear = false;
    this._run(this.copy, this.rtAccum);
    this.renderer.autoClear = true;
  }

  _blur(src, tmp, dst, radius) {
    const u = this.blur.uniforms;
    u.tDiffuse.value = src.texture;
    u.uDir.value.set(radius / src.width, 0);
    this._run(this.blur, tmp);
    u.tDiffuse.value = tmp.texture;
    u.uDir.value.set(0, radius / src.height);
    this._run(this.blur, dst);
  }

  render(time) {
    // bright pass + 3-octave bloom
    this.bright.uniforms.tDiffuse.value = this.rtAccum.texture;
    this._run(this.bright, this.b1);
    this._blur(this.b1, this.b1b, this.b1, 1.1);

    this.copyTo(this.b1, this.b2);
    this._blur(this.b2, this.b2b, this.b2, 1.6);

    this.copyTo(this.b2, this.b3);
    this._blur(this.b3, this.b3b, this.b3, 2.2);

    this.comp.uniforms.uTime.value = time;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.comp.scene, this.comp.cam);
  }

  copyTo(src, dst) {
    this.copy.mat.blending = THREE.NoBlending;
    this.copy.uniforms.tDiffuse.value = src.texture;
    this.copy.uniforms.uWeight.value = 1;
    this._run(this.copy, dst);
    this.copy.mat.blending = THREE.AdditiveBlending;
  }
}

/* ------------------------------------------------------------------ *
 *  Easing + timing helpers
 * ------------------------------------------------------------------ */
export const ease = {
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inOutQuint: t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

export const clamp01 = t => Math.min(1, Math.max(0, t));
export const span = (t, a, b) => clamp01((t - a) / (b - a));
export const lerp = (a, b, t) => a + (b - a) * t;

/* deterministic value noise for handheld camera */
function h1(n) { return (Math.sin(n * 127.1) * 43758.5453) % 1; }
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = h1(i + seed * 97.3), b = h1(i + 1 + seed * 97.3);
  const u = f * f * (3 - 2 * f);
  return (a + (b - a) * u) * 2 - 1;
}

/* Catmull-Rom through (t, v) keys — the single continuous camera path */
export function spline(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1][1];
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1][0] < t) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = (t - p1[0]) / (p2[0] - p1[0]);
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u +
    (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 +
    (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
}
