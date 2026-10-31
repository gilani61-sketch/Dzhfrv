import * as THREE from './three.module.js';
import { lens, noise1 } from './engine.js';

/* ------------------------------------------------------------------ *
 *  The backdrop: one continuous volume the whole film lives inside.
 * ------------------------------------------------------------------ */
export function makeBackdrop() {
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: /* glsl */`
      in vec3 position; in vec2 uv; out vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */`
      precision highp float; in vec2 vUv; out vec4 o;
      uniform float uTime, uWarm, uShift;
      uniform vec3 uTint;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++){ v += a * vnoise(p); p *= 2.03; a *= 0.5; }
        return v;
      }

      void main(){
        vec2 p = (vUv - 0.5) * vec2(1.0, 1.9);
        float r = length(p);

        // deep space base
        vec3 col = vec3(0.0016, 0.0032, 0.0072);

        // slow nebula volume
        float n = fbm(p * 2.1 + vec2(uShift * 0.08, uTime * 0.012));
        float n2 = fbm(p * 4.3 - vec2(uTime * 0.02, uShift * 0.05));
        vec3 cool = vec3(0.04, 0.14, 0.38);
        vec3 warm = vec3(0.46, 0.11, 0.015);
        vec3 neb = mix(cool, warm, smoothstep(0.0, 1.0, uWarm));
        col += neb * pow(n, 2.8) * 0.085;
        col += neb * pow(n2, 4.5) * 0.055;

        // central light well
        float well = exp(-r * r * 3.2);
        col += uTint * well * 0.055;

        // horizon falloff
        col *= 1.0 - smoothstep(0.25, 1.05, r) * 0.75;
        o = vec4(col, 1.0);
      }`,
    uniforms: {
      uTime: { value: 0 }, uWarm: { value: 0 }, uShift: { value: 0 },
      uTint: { value: new THREE.Color(0x2a6cff) },
    },
    depthWrite: false, depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return mesh;
}

/* ------------------------------------------------------------------ *
 *  Dust: volumetric motes that give the camera move its parallax.
 * ------------------------------------------------------------------ */
export function makeDust(count = 1500, range = { x: 13, y: 20, z: 170 }) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3 + 0] = (Math.random() - 0.5) * range.x;
    pos[i * 3 + 1] = (Math.random() - 0.5) * range.y;
    pos[i * 3 + 2] = (Math.random() - 0.5) * range.z;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uZ: { value: 0 }, uSpan: { value: range.z },
      uFocus: lens.uFocus, uAperture: lens.uAperture,
      uColor: { value: new THREE.Color(0x8fc2ff) }, uAmount: { value: 1 },
    },
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime, uZ, uSpan, uFocus, uAperture;
      varying float vCoC, vSeed;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * 0.35 + aSeed * 31.0) * 0.30;
        p.x += cos(uTime * 0.28 + aSeed * 17.0) * 0.25;
        // wrap the field around the travelling camera: one endless volume
        p.z = mod(p.z - uZ, uSpan) - uSpan * 0.5 + uZ;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        vCoC = clamp(abs(d - uFocus) * uAperture, 0.0, 1.0);
        vSeed = aSeed;
        gl_Position = projectionMatrix * mv;
        float base = 2.0 + aSeed * 5.0;
        gl_PointSize = (base + vCoC * 40.0) * (22.0 / max(d, 1.0));
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform vec3 uColor; uniform float uAmount;
      varying float vCoC, vSeed;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c) * 2.0;
        if (d > 1.0) discard;
        // bokeh: sharp dot in focus, soft disc out of focus
        float core = pow(1.0 - d, mix(3.0, 1.1, vCoC));
        float rim = smoothstep(1.0, 0.86, d) * mix(0.0, 0.35, vCoC);
        float a = (core + rim) * mix(0.55, 0.14, vCoC) * (0.35 + vSeed * 0.9) * uAmount;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 1;
  return pts;
}

/* ------------------------------------------------------------------ *
 *  The corridor: a lattice of light lines receding into the dark.
 * ------------------------------------------------------------------ */
export function makeCorridor() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 }, uAmount: { value: 1 }, uZ: { value: 0 },
      uColor: { value: new THREE.Color(0x3d86ff) },
      uFocus: lens.uFocus, uAperture: lens.uAperture,
    },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying float vCoC; varying float vDist;
      uniform float uFocus, uAperture;
      void main(){
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDist = -mv.z;
        vCoC = clamp(abs(vDist - uFocus) * uAperture, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec2 vUv; varying float vCoC; varying float vDist;
      uniform float uTime, uAmount, uZ; uniform vec3 uColor;
      float line(float x, float w){ return smoothstep(w, 0.0, abs(fract(x) - 0.5) - 0.5 + w); }
      void main(){
        // uv.y runs along the corridor
        float along = vUv.y * 120.0 - uZ * 0.5;
        float across = vUv.x * 10.0;
        float soft = 0.06 + vCoC * 0.45;
        float g = line(along, soft * 0.35) * 0.9 + line(across, soft * 0.5) * 0.5;
        // pulse travelling down the corridor
        float pulse = exp(-pow(fract(along * 0.08 - uTime * 0.14) - 0.5, 2.0) * 26.0);
        g += pulse * 0.6 * line(across, soft * 0.5);
        float fade = exp(-vDist * 0.022) * smoothstep(1.0, 0.55, vUv.y);
        float a = g * fade * uAmount * mix(0.55, 0.12, vCoC);
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(11, 170, 1, 1);
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.3;
  const ceil = new THREE.Mesh(geo, mat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 3.8;
  g.add(floor, ceil);
  g.userData.mat = mat;
  g.frustumCulled = false;
  return g;
}

/* ------------------------------------------------------------------ *
 *  Request packets: glowing capsules streaming past the lens.
 * ------------------------------------------------------------------ */
export function makePackets(count = 260) {
  const geo = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;

  const off = new Float32Array(count * 3);
  const rnd = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.75 + Math.pow(Math.random(), 0.65) * 4.6;
    off[i * 3] = Math.cos(a) * r;
    off[i * 3 + 1] = Math.sin(a) * r * 1.55;
    off[i * 3 + 2] = Math.random();
    rnd[i * 3] = Math.random();
    rnd[i * 3 + 1] = 0.5 + Math.random();
    rnd[i * 3 + 2] = Math.random();
  }
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 3));
  geo.instanceCount = count;

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uAmount: { value: 0 }, uSpeed: { value: 26 },
      uSpan: { value: 70 }, uZ: { value: 0 }, uStretch: { value: 1 },
      uColor: { value: new THREE.Color(0x66b4ff) }, uColor2: { value: new THREE.Color(0xffffff) },
      uFocus: lens.uFocus, uAperture: lens.uAperture,
    },
    vertexShader: /* glsl */`
      attribute vec3 aOff; attribute vec3 aRnd;
      uniform float uTime, uSpeed, uSpan, uZ, uStretch, uFocus, uAperture;
      varying vec2 vUv; varying float vCoC; varying float vSeed; varying float vLife;
      void main(){
        vUv = uv; vSeed = aRnd.x;
        float z = mod(aOff.z * uSpan + uTime * uSpeed * aRnd.y, uSpan);
        vec3 c = vec3(aOff.xy, uZ - uSpan + z);
        vLife = 1.0 - abs((z / uSpan) * 2.0 - 1.0);
        vec3 p = position;
        p.x *= 0.045 + aRnd.z * 0.035;
        p.y *= (0.045 + aRnd.z * 0.035);
        vec4 mv = modelViewMatrix * vec4(c, 1.0);
        // stretch along the direction of travel (camera space z) for motion streaks
        mv.xy += p.xy;
        mv.z += position.y * uStretch * (1.4 + aRnd.y * 2.6);
        float d = -mv.z;
        vCoC = clamp(abs(d - uFocus) * uAperture, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec2 vUv; varying float vCoC; varying float vSeed; varying float vLife;
      uniform vec3 uColor, uColor2; uniform float uAmount;
      void main(){
        vec2 c = vUv - 0.5;
        float d = length(c * vec2(2.4, 2.0));
        float core = exp(-d * d * mix(9.0, 2.2, vCoC));
        vec3 col = mix(uColor, uColor2, pow(core, 2.0) * 0.8);
        float a = core * uAmount * vLife * (0.35 + vSeed * 0.8) * mix(1.0, 0.45, vCoC);
        if (a < 0.003) discard;
        gl_FragColor = vec4(col * a, a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  return mesh;
}

/* ------------------------------------------------------------------ *
 *  Handheld: tiny imperfections so the move never feels like a tween.
 * ------------------------------------------------------------------ */
export function handheld(camera, t, amount = 1) {
  camera.position.x += noise1(t * 0.62, 1) * 0.16 * amount;
  camera.position.y += noise1(t * 0.51, 2) * 0.13 * amount;
  camera.rotation.z += noise1(t * 0.44, 3) * 0.0045 * amount;
  camera.rotation.x += noise1(t * 0.58, 4) * 0.0035 * amount;
  camera.rotation.y += noise1(t * 0.49, 5) * 0.0040 * amount;
}
