/**
 * EXACT Character Design & 3-Headed Dragon Model
 * Directly extracted from the approved reference /assets/aistudio/The_Road_to_ALevel__1__7ed07626.html
 */

import * as THREE from 'three';

export const T = THREE;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (x: number, a: number = 0, b: number = 1) => Math.min(b, Math.max(a, x));
export const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeIO = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
export const R = rng(20261024);
export const rr = (a: number, b: number) => a + (b - a) * R();

export const PAL = {
  skyTop: 0x24234f, skyMid: 0x6d3568, skyLow: 0xd9704f, skyHot: 0xf2b45a,
  fog: 0xb86a63,
  teal: 0x2d6a68, tealDark: 0x1d4a50, indigo: 0x3b3f7a, plum: 0x5a2d62,
  sand: 0xd2a15f, mustard: 0xd6a53a, coral: 0xd9694a, cream: 0xe6d8bd,
  ink: 0x15131f, steel: 0x8f98ab, gold: 0xe0b24a,
  skinNovice: 0x8f5f3c, skinCat: 0xa8744c, skinPedro: 0xc8946a, skinNYF: 0xcf9d74,
  dragonRed: 0xb3261e, dragonDark: 0x6a1418, dragonHot: 0xe0502e, dragonBone: 0xe7c9a0
};

/* paper grain texture (subtle fibres) */
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export const grainTex = (() => {
  const c = makeCanvas(256, 256), g = c.getContext('2d')!;
  g.fillStyle = '#ececec';
  g.fillRect(0, 0, 256, 256);
  const r = rng(7);
  for (let i = 0; i < 5000; i++) {
    const v = (205 + (r() * 50)) | 0;
    g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.25 + r() * 0.4) + ')';
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1);
  }
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = 'rgba(255,255,255,' + (0.1 + r() * 0.15) + ')';
    g.beginPath();
    const x = r() * 256, y = r() * 256;
    g.moveTo(x, y);
    g.lineTo(x + (r() - .5) * 18, y + (r() - .5) * 18);
    g.stroke();
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
})();

const matCache: Record<string, THREE.MeshStandardMaterial> = {};
export function mat(color: number, o: Record<string, unknown> = {}): THREE.MeshStandardMaterial {
  const key = color + JSON.stringify(o);
  if (matCache[key]) return matCache[key];
  const m = new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.95, metalness: 0, flatShading: true, map: grainTex }, o));
  matCache[key] = m;
  return m;
}
export const basic = (color: number, o: Record<string, unknown> = {}) => new T.MeshBasicMaterial(Object.assign({ color }, o));

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material, shadow: boolean = true): THREE.Mesh {
  const me = new T.Mesh(geo, m);
  me.castShadow = shadow;
  me.receiveShadow = true;
  return me;
}
export function box(w: number, h: number, d: number, m: THREE.Material): THREE.Mesh {
  return mesh(new T.BoxGeometry(w, h, d), m);
}

/* merge many shards into one flat-shaded vertex-coloured mesh */
export class Shards {
  pos: number[] = [];
  col: number[] = [];
  _c: THREE.Color = new T.Color();

  add(geo: THREE.BufferGeometry, matrix: THREE.Matrix4, color: number) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    const p = g.attributes.position.array as Float32Array;
    this._c.set(color);
    for (let i = 0; i < p.length; i += 3) {
      this.pos.push(p[i], p[i + 1], p[i + 2]);
      this.col.push(this._c.r, this._c.g, this._c.b);
    }
    g.dispose();
  }

  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, col: number) {
    this.pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    this._c.set(col);
    for (let i = 0; i < 3; i++) this.col.push(this._c.r, this._c.g, this._c.b);
  }

  build(extra: Record<string, unknown> = {}): THREE.Mesh {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    const m = new T.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true }, extra));
    const me = new T.Mesh(g, m);
    me.castShadow = true;
    me.receiveShadow = true;
    return me;
  }
}

const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3();
export function mtx(px: number, py: number, pz: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _v.set(px, py, pz);
  _s.set(sx, sy, sz);
  return _m4.clone().compose(_v, _q, _s);
}

export function jitter(hex: number, amt: number) {
  const c = new T.Color(hex);
  const k = 1 + (R() - .5) * amt;
  c.r = clamp(c.r * k);
  c.g = clamp(c.g * k);
  c.b = clamp(c.b * k);
  return c.getHex();
}

/* shared shard geometries */
export const G = {
  tet: new T.TetrahedronGeometry(1, 0),
  oct: new T.OctahedronGeometry(1, 0),
  ico: new T.IcosahedronGeometry(1, 0),
  cone4: new T.ConeGeometry(1, 2, 4, 1),
  cone5: new T.ConeGeometry(1, 2, 5, 1),
  box: new T.BoxGeometry(1, 1, 1)
};

/* ===== HEROES: chibi paper-craft rigs (no mouths) ===== */
const skinMat = (c: number) => new T.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: false });
const eyeWhite = new T.MeshBasicMaterial({ color: 0xf4ecd8 });
const eyeDark = new T.MeshBasicMaterial({ color: 0x14111c });
const hairMat = new T.MeshStandardMaterial({ color: 0x14121a, roughness: 0.85, flatShading: true, map: grainTex });

export interface EyeOptions {
  px: number;
  py: number;
  gx?: number;
  lid: number;
  browY: number;
  browTilt: number;
  browYS?: [number, number];
  browExtra?: [number, number];
  lidColor: number;
}

export function makeEye(side: number, o: EyeOptions): THREE.Group {
  const g = new T.Group();
  const w = new T.Mesh(new T.CircleGeometry(0.2, 18), eyeWhite);
  w.scale.set(1, 1.15, 1);
  g.add(w);

  const pu = new T.Mesh(new T.CircleGeometry(0.11, 14), eyeDark);
  pu.position.set(o.px * side + (o.gx || 0), o.py, 0.01);
  pu.scale.set(1, 1.15, 1);
  g.add(pu);

  const hl = new T.Mesh(new T.CircleGeometry(0.03, 8), eyeWhite);
  hl.position.set(o.px * side + (o.gx || 0) + 0.04, o.py + 0.05, 0.02);
  g.add(hl);

  /* upper lid: skin-coloured paper strip that slides down over the eye */
  const lid = new T.Mesh(new T.PlaneGeometry(0.44, 1), new T.MeshBasicMaterial({ color: o.lidColor }));
  lid.position.set(0, 0.23, 0.03);
  lid.scale.y = 0.001;
  g.add(lid);
  g.userData.lid = lid;
  g.userData.base = o.lid;

  /* brow */
  const brow = new T.Mesh(new T.BoxGeometry(0.42, 0.075, 0.06), hairMat);
  const by = 0.34 + o.browY + (o.browYS ? o.browYS[side > 0 ? 1 : 0] : 0);
  brow.position.set(0, by, 0.04);
  g.userData.by = by;
  brow.rotation.z = o.browTilt * side * -1 + (o.browExtra ? o.browExtra[side > 0 ? 1 : 0] : 0);
  g.add(brow);
  g.userData.brow = brow;
  g.userData.pu = pu;
  g.userData.hl = hl;
  g.userData.o = o;
  return g;
}

export interface HeroConfig {
  skin: number;
  shirt: number;
  trim: number;
  pants: number;
  grip?: number;
  eye: EyeOptions;
  hair: (h: THREE.Group, m: THREE.Material, parts: Record<string, unknown>) => void;
  glasses?: (head: THREE.Group, parts?: Record<string, unknown>) => void;
  extra?: (hero: THREE.Group, body: THREE.Group, parts: Record<string, any>) => void;
  tick?: (h: THREE.Group, t: number, sp: number, ph: number) => void;
}

export function makeHero(cfg: HeroConfig): THREE.Group {
  const hero = new T.Group();
  const parts: Record<string, any> = {};
  const sk = skinMat(cfg.skin);

  /* torso */
  const bodyG = new T.Group();
  bodyG.position.y = 1.0;
  hero.add(bodyG);
  parts.body = bodyG;

  const torso = mesh(new T.BoxGeometry(1.0, 1.05, 0.68), mat(cfg.shirt));
  torso.position.y = 0.5;
  bodyG.add(torso);

  const belt = box(1.04, 0.14, 0.72, mat(0x2a2030));
  belt.position.y = 0.08;
  bodyG.add(belt);

  const trim = box(1.02, 0.1, 0.7, mat(cfg.trim));
  trim.position.y = 0.95;
  bodyG.add(trim);

  /* legs */
  parts.legs = [-1, 1].map(s => {
    const lg = new T.Group();
    lg.position.set(s * 0.26, 1.0, 0);
    hero.add(lg);
    const l = box(0.38, 0.8, 0.4, mat(cfg.pants));
    l.position.y = -0.4;
    lg.add(l);
    const f = box(0.42, 0.22, 0.62, mat(0x2b2230));
    f.position.set(0, -0.86, 0.08);
    lg.add(f);
    return lg;
  });

  /* arms */
  parts.arms = [-1, 1].map(s => {
    const a = new T.Group();
    a.position.set(s * 0.64, 1.0 + 0.92, 0);
    hero.add(a);
    const u = box(0.3, 0.78, 0.32, mat(cfg.shirt));
    u.position.y = -0.38;
    a.add(u);
    const h = mesh(new T.SphereGeometry(0.19, 8, 6), sk);
    h.position.y = -0.84;
    a.add(h);
    a.userData.hand = h;
    return a;
  });

  /* head */
  const head = new T.Group();
  head.position.y = 1.0 + 1.05 + 0.82;
  hero.add(head);
  parts.head = head;

  const skull = mesh(new T.SphereGeometry(1, 20, 14), sk);
  skull.scale.set(1.0, 0.92, 0.96);
  head.add(skull);

  [-1, 1].forEach(s => {
    const e = mesh(new T.SphereGeometry(0.16, 8, 6), sk);
    e.position.set(s * 0.97, -0.05, 0);
    head.add(e);
  });

  /* eyes */
  parts.eyes = [-1, 1].map(s => {
    const e = makeEye(s, cfg.eye);
    e.position.set(s * 0.38, 0.02, 0.89);
    e.rotation.y = s * 0.42;
    head.add(e);
    return e;
  });

  /* nose bump only (no mouth) */
  const nose = mesh(new T.SphereGeometry(0.09, 6, 5), sk);
  nose.position.set(0, -0.2, 0.97);
  head.add(nose);

  cfg.hair(head, hairMat, parts);
  if (cfg.glasses) cfg.glasses(head, parts);

  /* sword on back */
  const sword = new T.Group();
  parts.sword = sword;
  bodyG.add(sword);

  const blade = mesh(new T.BoxGeometry(0.1, 1.9, 0.03), mat(0xc9d2e6, { roughness: 0.4, metalness: 0.4, map: null }));
  blade.position.y = 1.2;
  sword.add(blade);

  const tip = mesh(new T.ConeGeometry(0.07, 0.25, 4), mat(0xc9d2e6, { roughness: 0.4, metalness: 0.4, map: null }));
  tip.position.y = 2.28;
  tip.rotation.y = Math.PI / 4;
  sword.add(tip);

  const guard = box(0.55, 0.1, 0.12, mat(PAL.gold, { map: null }));
  guard.position.y = 0.2;
  sword.add(guard);

  const grip = box(0.12, 0.42, 0.12, mat(cfg.grip || 0x4a2a35));
  grip.position.y = -0.05;
  sword.add(grip);

  const pommel = mesh(new T.OctahedronGeometry(0.12, 0), mat(PAL.gold, { map: null }));
  pommel.position.y = -0.3;
  sword.add(pommel);

  const strap = box(1.06, 0.1, 0.74, mat(0x2a2030));
  strap.position.set(0, 0.6, 0);
  strap.rotation.z = 0.62;
  bodyG.add(strap);

  sword.userData.back = { p: new T.Vector3(0.08, 0.28, -0.55), r: new T.Euler(0.05, 0, 0.78) };
  sword.userData.drawn = { p: new T.Vector3(0.88, 0.95, 0.5), r: new T.Euler(0.45, 0, -0.1) };
  sword.position.copy(sword.userData.back.p);
  sword.rotation.copy(sword.userData.back.r);

  if (cfg.extra) cfg.extra(hero, bodyG, parts);
  hero.userData = { parts, cfg, walk: 0, draw: 0, arm: [0, 0], look: new T.Vector2(), blink: 0 };
  return hero;
}

export function hairCap(head: THREE.Group, m: THREE.Material, o: { cover?: number; y?: number; z?: number; tilt?: number } = {}) {
  const cap = mesh(new T.SphereGeometry(1.06, 16, 10, 0, Math.PI * 2, 0, Math.PI * (o.cover || 0.52)), m);
  cap.scale.set(1, 0.94, 1.0);
  cap.position.set(0, o.y || 0.05, o.z === undefined ? -0.06 : o.z);
  cap.rotation.x = o.tilt || -0.12;
  head.add(cap);

  const back = mesh(new T.SphereGeometry(1.05, 16, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.35), m);
  back.scale.set(1, 0.94, 0.96);
  back.position.set(0, 0.0, -0.1);
  head.add(back);
}

export function rectGlasses(head: THREE.Group) {
  const fm = mat(0x0d0c12, { map: null, flatShading: false });
  [-1, 1].forEach(s => {
    const w = 0.62, h = 0.46, t = 0.06, g = new T.Group();
    g.position.set(s * 0.38, 0.0, 0.99);
    g.rotation.y = s * 0.42;
    [[0, h / 2, w, t], [0, -h / 2, w, t], [-w / 2, 0, t, h], [w / 2, 0, t, h]].forEach(p => {
      const b = box(p[2], p[3], 0.07, fm);
      b.position.set(p[0], p[1], 0);
      g.add(b);
    });
    const gl = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.12, depthWrite: false }));
    gl.position.z = 0.01;
    g.add(gl);
    head.add(g);
  });
  const br = box(0.24, 0.06, 0.07, fm);
  br.position.set(0, 0.1, 1.02);
  head.add(br);
  [-1, 1].forEach(s => {
    const a = box(0.06, 0.06, 0.8, fm);
    a.position.set(s * 0.98, 0.08, 0.55);
    a.rotation.y = s * -0.1;
    head.add(a);
  });
}

export function roundGlasses(head: THREE.Group) {
  const fm = mat(0x2a2f3f, { map: null, flatShading: false });
  [-1, 1].forEach(s => {
    const g = new T.Group();
    g.position.set(s * 0.4, 0.0, 0.99);
    g.rotation.y = s * 0.42;
    const ring = mesh(new T.TorusGeometry(0.34, 0.035, 6, 20), fm);
    g.add(ring);
    const gl = new T.Mesh(new T.CircleGeometry(0.34, 20), new T.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.13, depthWrite: false }));
    gl.position.z = 0.01;
    g.add(gl);
    head.add(g);
  });
  const br = box(0.2, 0.05, 0.06, fm);
  br.position.set(0, 0.07, 1.02);
  head.add(br);
  [-1, 1].forEach(s => {
    const a = box(0.05, 0.05, 0.8, fm);
    a.position.set(s * 0.98, 0.08, 0.55);
    head.add(a);
  });
}

export const CAST: Record<string, HeroConfig> = {
  novice: {
    skin: 0x8f5f3c, shirt: 0x2d6a8a, trim: 0xd6a53a, pants: 0x30284f, grip: 0x7a3b3b,
    eye: { px: 0.0, py: -0.02, lid: 0.2, browY: -0.05, browTilt: -0.42, lidColor: 0x8f5f3c },
    hair: (h, m) => {
      hairCap(h, m, { cover: 0.56 });
      const q = box(0.9, 0.18, 0.12, m);
      q.position.set(0, 0.68, 0.78);
      q.rotation.x = -0.35;
      h.add(q);
    },
    glasses: rectGlasses,
    extra: (_hero, body) => {
      const lp = new T.Group();
      lp.position.set(-0.86, 0.22, 0.08);
      lp.rotation.set(0, 0, 0.16);
      body.add(lp);
      const base = box(0.14, 0.9, 0.66, mat(0xaeb4c6, { map: null, roughness: 0.5, metalness: 0.3 }));
      lp.add(base);
      const scr = box(0.05, 0.82, 0.58, mat(0x15131f, { map: null }));
      scr.position.x = 0.07;
      lp.add(scr);
      const lg = new T.Mesh(new T.CircleGeometry(0.1, 5), basic(0x6fd0c8));
      lg.rotation.y = -Math.PI / 2;
      lg.position.set(-0.075, 0, 0);
      lp.add(lg);
      const st = box(1.02, 0.07, 0.04, mat(0x2a2030));
      st.position.set(-0.3, 0.8, 0.1);
      st.rotation.z = -0.55;
      body.add(st);
    }
  },
  cat: {
    skin: 0xa8744c, shirt: 0x6a3a74, trim: 0xd9694a, pants: 0x2a3552, grip: 0x2d6a68,
    eye: { px: 0.0, py: -0.02, gx: 0.075, lid: 0.0, browY: 0.05, browTilt: 0.5, lidColor: 0xa8744c },
    hair: (h, m) => {
      hairCap(h, m, { cover: 0.5, z: -0.14, tilt: -0.3 });
      for (let i = 0; i < 5; i++) {
        const f = box(0.34, 0.5, 0.1, m);
        f.position.set(-0.64 + i * 0.32, 0.62, 0.74 - Math.abs(i - 2) * 0.07);
        f.rotation.set(-0.42, 0, (i - 2) * -0.1);
        h.add(f);
      }
    },
    extra: (_hero, _body, parts) => {
      const can = new T.Group();
      can.position.set(0, -0.84, 0.0);
      parts.arms[1].add(can);
      parts.can = can;
      const cb = mesh(new T.CylinderGeometry(0.15, 0.15, 0.62, 10), mat(0x101014, { map: null, flatShading: false }));
      can.add(cb);
      for (let i = 0; i < 3; i++) {
        const cl = box(0.07, 0.4, 0.03, basic(0x7ee03a));
        cl.position.set((i - 1) * 0.085, 0.02, 0.15);
        cl.rotation.z = (i - 1) * 0.12;
        can.add(cl);
      }
      const top = mesh(new T.CylinderGeometry(0.12, 0.15, 0.06, 10), mat(0x9a9aa8, { map: null }));
      top.position.y = 0.34;
      can.add(top);
      can.rotation.x = -0.2;
      can.position.z = 0.1;
    }
  },
  pedro: {
    skin: 0xc8946a, shirt: 0x3d8a74, trim: 0xe0b24a, pants: 0x4a2d62, grip: 0xd9694a,
    eye: { px: 0.0, py: -0.01, gx: -0.05, lid: 0.3, browY: 0.0, browTilt: 0.1, browYS: [0, 0.12], browExtra: [-0.1, 0.22], lidColor: 0xc8946a },
    hair: (h, m) => {
      hairCap(h, m, { cover: 0.5 });
      const r = rng(13);
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2, e = r() * 1.15, rad = 1.08;
        const c = mesh(new T.IcosahedronGeometry(0.26 + r() * 0.12, 0), m);
        c.position.set(Math.sin(a) * Math.cos(e) * rad * 1.02, Math.sin(e) * rad * 0.95 * (e > 0.2 ? 1 : 0.9) + 0.1, Math.cos(a) * Math.cos(e) * rad * 0.95 - 0.15);
        if (c.position.z > 0.6 && c.position.y < 0.5) c.position.z -= 0.5;
        h.add(c);
      }
      [-1, 1].forEach(s => {
        for (let k = 0; k < 4; k++) {
          const c = mesh(new T.IcosahedronGeometry(0.25, 0), m);
          c.position.set(s * (1.0 + k * 0.03), -0.2 - k * 0.3, -0.25 + k * 0.05);
          h.add(c);
        }
      });
    },
    glasses: roundGlasses,
    extra: (_hero, body, parts) => {
      const hp = new T.Group();
      hp.position.set(0, 1.0, 0.0);
      body.add(hp);
      const band = mesh(new T.TorusGeometry(0.58, 0.1, 6, 18, Math.PI * 1.3), mat(0x15131f, { map: null }));
      band.rotation.set(Math.PI / 2, 0, Math.PI * 0.35 + Math.PI * 0.0);
      band.position.y = 0.1;
      hp.add(band);
      [-1, 1].forEach(s => {
        const c = mesh(new T.CylinderGeometry(0.27, 0.27, 0.22, 10), mat(0xd9694a, { map: null }));
        c.rotation.z = Math.PI / 2;
        c.position.set(s * 0.56, 0.3, 0.12);
        hp.add(c);
        const p = mesh(new T.CylinderGeometry(0.2, 0.2, 0.05, 10), mat(0x15131f, { map: null }));
        p.rotation.z = Math.PI / 2;
        p.position.set(s * 0.68, 0.3, 0.12);
        hp.add(p);
      });
      parts.hp = hp;
    },
    tick: (h, t, sp) => {
      /* bob head to the beat when standing */
      h.userData.parts.head.rotation.z += Math.sin(t * 7.2) * 0.05 * (1 - clamp(sp));
    }
  },
  nyf: {
    skin: 0xcf9d74, shirt: 0x3a2d4a, trim: 0xb3261e, pants: 0x232036, grip: 0x8f98ab,
    eye: { px: 0.0, py: -0.03, lid: 0.46, browY: -0.02, browTilt: 0.0, lidColor: 0xcf9d74 },
    hair: (h, m) => {
      hairCap(h, m, { cover: 0.52 });
      const s = box(0.95, 0.12, 0.1, m);
      s.position.set(0, 0.62, 0.84);
      s.rotation.x = -0.4;
      h.add(s);
    },
    extra: (hero, body, parts) => {
      const cape = new T.Group();
      cape.position.set(0, 1.0, -0.4);
      body.add(cape);
      parts.cape = cape;
      const rows = 8, sm_ = new Shards();
      for (let y = 0; y < rows; y++) {
        const n = 5 - Math.floor(y * 0.15), w = 1.1 + y * 0.08;
        for (let x = 0; x < n + 1; x++) {
          const px = (x - n / 2) * (w / n) + (y % 2 ? 0.1 : 0), py = -y * 0.34;
          sm_.add(G.oct, mtx(px, py, -y * 0.015, 0.2, 0.22, 0.05), jitter([0x2d6a68, 0x1d4a50, 0x3d7f6a, 0x2a5a74][(x + y) % 4], 0.18));
        }
      }
      const sc = sm_.build();
      cape.add(sc);
      const clo = box(1.0, 0.1, 0.12, mat(PAL.gold, { map: null }));
      clo.position.set(0, 0.06, 0.38);
      body.add(clo);
      [-1, 1].forEach(s => {
        const sp = mesh(new T.ConeGeometry(0.2, 0.5, 4), mat(PAL.dragonRed));
        sp.position.set(s * 0.62, 1.15, 0);
        sp.rotation.z = s * -0.5;
        body.add(sp);
      });
      const scar = box(0.05, 0.4, 0.04, basic(0x8c4a3a));
      scar.position.set(0.28, 0.0, 0.0);
      scar.rotation.z = 0.5;
      const hd = hero.userData;
      hd.scarHolder = scar;
    },
    tick: (h, t, sp) => {
      const c = h.userData.parts.cape;
      c.rotation.x = 0.18 + Math.sin(t * 2.3) * 0.06 + sp * 0.25;
      c.rotation.z = Math.sin(t * 1.7) * 0.04;
    }
  }
};

/* animation: speed 0 idle, ~1 walk, 2 charge; draw 0..1 */
export function animHero(
  h: THREE.Group,
  t: number,
  speed: number,
  o: {
    phase?: number;
    draw?: number;
    lookY?: number;
    lookX?: number;
    gazeX?: number;
    squint?: number;
    browLift?: number;
  } = {}
) {
  const u = h.userData, p = u.parts, ph = t * (5.2 + speed * 2.2) + (o.phase || 0);
  const amp = clamp(speed, 0, 1.6) * 0.62;
  p.legs[0].rotation.x = Math.sin(ph) * amp;
  p.legs[1].rotation.x = -Math.sin(ph) * amp;
  const idle = Math.sin(t * 1.6 + (o.phase || 0)) * 0.03;
  p.arms[0].rotation.x = -Math.sin(ph) * amp * 0.8 + idle;
  p.arms[1].rotation.x = Math.sin(ph) * amp * 0.8 - idle;
  p.arms[0].rotation.z = 0.06;
  p.arms[1].rotation.z = -0.06;
  p.body.position.y = 1.0 + Math.abs(Math.sin(ph)) * 0.09 * clamp(speed, 0, 1.6) + Math.sin(t * 1.6) * 0.012;
  p.body.rotation.z = Math.sin(ph) * 0.03 * speed;
  p.head.position.y = 1.0 + 1.05 + 0.82 + Math.abs(Math.sin(ph)) * 0.09 * clamp(speed, 0, 1.6);
  p.head.rotation.z = Math.sin(ph) * 0.03 * speed;
  p.head.rotation.y = (o.lookY || 0) * 1;
  p.head.rotation.x = (o.lookX || 0);

  /* sword draw */
  const d = o.draw || 0, S = p.sword, B = S.userData.back, D = S.userData.drawn, k = easeIO(d);
  S.position.lerpVectors(B.p, D.p, k);
  S.rotation.set(lerp(B.r.x, D.r.x, k), lerp(B.r.y, D.r.y, k), lerp(B.r.z, D.r.z, k));
  if (d > 0) {
    p.arms[1].rotation.x = lerp(p.arms[1].rotation.x, -2.4, k);
    p.arms[1].rotation.z = lerp(-0.06, -0.25, k);
  }

  /* blink + gaze */
  const bl = (Math.sin(t * 0.9 + (o.phase || 0) * 3) > 0.985 ? 1 : 0);
  p.eyes.forEach((e: THREE.Group) => {
    const eo = e.userData.o, lid = e.userData.lid;
    const cl = clamp(eo.lid + bl * 0.9 + (o.squint || 0), 0, 1);
    lid.scale.y = Math.max(0.001, cl * 0.46);
    lid.position.y = 0.23 - cl * 0.23;
    e.userData.pu.position.x = eo.px * (e.rotation.y > 0 ? 1 : -1) + (eo.gx || 0) + (o.gazeX || 0) * 0.07;
    e.userData.hl.position.x = e.userData.pu.position.x + 0.04;
    e.userData.brow.position.y = e.userData.by + (o.browLift || 0) * 0.06;
  });

  if (u.cfg.tick) u.cfg.tick(h, t, speed, ph);
}

export const POSE_COIL = [-1.2, 0.55, 0.55, 0.55, 0.5, 0.45, 0.9];
export const POSE_UP = [0.35, 0.28, -0.05, -0.28, -0.1, 0.35, 0.95];
export const POSE_FWD = [0.95, 0.1, -0.2, 0.28, 0.25, 0.25, 0.55];
export const POSE_LOW = [1.25, 0.12, -0.05, 0.2, 0.3, 0.35, 0.35];

export interface DragonBundle {
  root: THREE.Group;
  body?: THREE.Mesh;
  necks: Array<{
    root: THREE.Group;
    segs: THREE.Group[];
    head: {
      g: THREE.Group;
      jaw: THREE.Group;
      eyes: THREE.Mesh[];
      light: THREE.PointLight;
    };
    yaw: number;
    phase: number;
  }>;
  wings: Array<{ g: THREE.Group; s: number }>;
  tail: THREE.Group[];
  legs: THREE.Group[];
  lights: THREE.PointLight[];
}

export function spike(sh: Shards, x: number, y: number, z: number, s: number, rx: number, ry: number, rz: number, col: number) {
  sh.add(G.cone4, mtx(x, y, z, s * 0.55, s, s * 0.55, rx, ry, rz), col);
}

export function ringPts(r: { c: [number, number, number]; u: number[]; v: number[]; ru: number; rv: number }, sides: number, off: number) {
  const pts: THREE.Vector3[] = [];
  for (let j = 0; j < sides; j++) {
    const a = (j + off) / sides * Math.PI * 2, ca = Math.cos(a) * r.ru, sa = Math.sin(a) * r.rv;
    pts.push(new T.Vector3(r.c[0] + r.u[0] * ca + r.v[0] * sa, r.c[1] + r.u[1] * ca + r.v[1] * sa, r.c[2] + r.u[2] * ca + r.v[2] * sa));
  }
  return pts;
}

export function loft(
  sh: Shards,
  rings: Array<{ c: [number, number, number]; u: number[]; v: number[]; ru: number; rv: number }>,
  sides: number,
  colorFn: (i: number, j: number, k: number) => number,
  caps: boolean
) {
  const P = rings.map((r, i) => ringPts(r, sides, (i % 2) * 0.5));
  for (let i = 0; i < P.length - 1; i++) {
    const A = P[i], B = P[i + 1];
    for (let j = 0; j < sides; j++) {
      const j1 = (j + 1) % sides;
      if (i % 2 === 0) {
        sh.tri(A[j], A[j1], B[j], colorFn(i, j, 0));
        sh.tri(A[j1], B[j1], B[j], colorFn(i, j, 1));
      } else {
        sh.tri(A[j], A[j1], B[j1], colorFn(i, j, 0));
        sh.tri(A[j], B[j1], B[j], colorFn(i, j, 1));
      }
    }
  }
  if (caps) {
    [0, P.length - 1].forEach(k => {
      const r = rings[k], c = new T.Vector3(r.c[0], r.c[1], r.c[2]);
      for (let j = 0; j < sides; j++) sh.tri(c, P[k][j], P[k][(j + 1) % sides], colorFn(k, j, 0));
    });
  }
}

export const RED_A = 0xb3261e, RED_B = 0x8c1c1c, RED_C = 0xc93a28, BONE = 0xe0c08f;
export const redFn = (sides: number, belly: boolean) => (i: number, j: number, k: number) => {
  if (belly) {
    const a = (j + 0.5) / sides * Math.PI * 2;
    if (Math.sin(a) < -0.5) return (i + j) % 2 ? BONE : 0xcfae7b;
  }
  return (i + j + k) % 3 === 0 ? RED_C : (i + j + k) % 2 ? RED_A : RED_B;
};
export const SOLID = { side: T.DoubleSide };

export function neckSeg(len: number, r0: number, r1: number): THREE.Mesh {
  const sh = new Shards(), U = [1, 0, 0], Vv = [0, 0, 1];
  loft(
    sh,
    [
      { c: [0, -0.05, 0], u: U, v: Vv, ru: r0, rv: r0 },
      { c: [0, len * 0.5, 0], u: U, v: Vv, ru: ((r0 + r1) / 2) * 1.08, rv: ((r0 + r1) / 2) * 1.08 },
      { c: [0, len + 0.05, 0], u: U, v: Vv, ru: r1, rv: r1 },
    ],
    8,
    redFn(8, false),
    false
  );
  sh.add(G.cone4, mtx(0, len * 0.55, -r0 * 0.95, r0 * 0.38, r0 * 0.95, r0 * 0.38, -0.55, 0.78, 0), 0xe0502e);
  return sh.build(SOLID);
}

export function makeDragonHead(lightsList: THREE.PointLight[]) {
  const g = new T.Group(), U = [1, 0, 0], Vv = [0, 0, 1], sh = new Shards();
  const skullRings: Array<[number, number, number, number]> = [
    [-1.3, 1.4, 1.2, 0],
    [0.5, 1.85, 1.5, -0.05],
    [2.2, 1.25, 1.0, -0.15],
    [3.9, 0.78, 0.6, -0.25],
    [5.0, 0.3, 0.28, -0.3],
  ];
  loft(sh, skullRings.map(r => ({ c: [0, r[0], r[3]], u: U, v: Vv, ru: r[1], rv: r[2] })), 8, redFn(8, false), true);

  [-1, 1].forEach(s => {
    sh.add(G.cone4, mtx(s * 1.0, -0.5, -1.0, 0.5, 3.1, 0.5, -2.2, 0, s * 0.45), PAL.dragonBone);
    sh.add(G.cone4, mtx(s * 1.75, 0.5, -0.2, 0.3, 1.5, 0.3, 0, 0, s * -(Math.PI / 2 + 0.35)), PAL.dragonBone);
    sh.add(G.cone4, mtx(s * 1.7, -0.5, 0.2, 0.28, 1.2, 0.28, 0, 0, s * -(Math.PI / 2 + 0.7)), PAL.dragonBone);
    sh.add(G.tet, mtx(s * 0.95, 2.0, -1.0, 0.75, 0.85, 0.5, 0.2, 0.3, s * 0.4), RED_B);
  });
  for (let i = 0; i < 4; i++) spike(sh, 0, 0.1 + i * 1.1, -1.4 + i * 0.12, 0.85 - i * 0.07, -0.25, 0, 0, 0xe0502e);
  g.add(sh.build(SOLID));

  const tt = new Shards();
  for (let i = 0; i < 6; i++) {
    [-1, 1].forEach(s => tt.add(G.cone4, mtx(s * (0.85 - i * 0.09), 1.5 + i * 0.5, 0.45, 0.17, 0.62, 0.17, Math.PI / 2, 0, 0), 0xf3e8d0));
  }
  g.add(tt.build());

  const jaw = new T.Group();
  jaw.position.set(0, -0.2, 0.55);
  g.add(jaw);

  const jsh = new Shards();
  const jawRings: Array<[number, number, number, number]> = [
    [0.3, 1.0, 0.45, 0.2],
    [2.4, 0.85, 0.38, 0.25],
    [4.2, 0.45, 0.25, 0.1],
    [4.7, 0.15, 0.15, 0.05],
  ];
  loft(jsh, jawRings.map(r => ({ c: [0, r[0], r[3]], u: U, v: Vv, ru: r[1], rv: r[2] })), 6, redFn(6, false), true);
  for (let i = 0; i < 5; i++) {
    [-1, 1].forEach(s => jsh.add(G.cone4, mtx(s * (0.7 - i * 0.1), 1.3 + i * 0.6, -0.1, 0.15, 0.55, 0.15, -Math.PI / 2, 0, 0), 0xf3e8d0));
  }
  jaw.add(jsh.build(SOLID));

  const eyes: THREE.Mesh[] = [];
  [-1, 1].forEach(s => {
    const e = new T.Group();
    g.add(e);
    const glow = new T.Mesh(new T.CircleGeometry(0.7, 4), basic(0xffc42a, { fog: false }));
    glow.rotation.z = Math.PI / 4;
    glow.scale.set(1.45, 0.5, 1);
    e.add(glow);
    const slit = new T.Mesh(new T.PlaneGeometry(0.11, 0.7), basic(0x1a0608));
    slit.position.z = 0.02;
    e.add(slit);
    e.position.set(s * 1.52, 1.35, -0.4);
    e.rotation.set(-0.1, s * 1.15, s * -0.35);
    eyes.push(glow);
  });

  const light = new T.PointLight(0xff7a2a, 0, 70, 2);
  light.position.set(0, 4, 0.5);
  g.add(light);
  lightsList.push(light);

  return { g, jaw, eyes, light };
}

export function boneBetween(sh: Shards, a: THREE.Vector3, b: THREE.Vector3, w: number, col: number) {
  const d = b.clone().sub(a), len = d.length(), mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  const m = new T.Matrix4().compose(mid, q, new T.Vector3(w, len, w));
  sh.add(G.box, m, col);
}

export function triGeo(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): THREE.BufferGeometry {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], 3));
  return g;
}

export function buildExactDragon(): DragonBundle {
  const DR: DragonBundle = {
    root: new T.Group(),
    necks: [],
    wings: [],
    tail: [],
    legs: [],
    lights: [],
  };

  /* body: faceted barrel with bone belly, hot-orange spines on top */
  const sh = new Shards(), U = [1, 0, 0], Vv = [0, 1, 0];
  const prof: Array<[number, number, number, number]> = [
    [11.5, 1.4, 1.6, 6.1],
    [8.8, 3.7, 4.2, 6.8],
    [5.2, 5.0, 5.4, 7.2],
    [1.0, 5.5, 5.8, 7.4],
    [-3.0, 5.2, 5.5, 7.2],
    [-7.0, 4.4, 4.8, 6.9],
    [-10.5, 2.6, 3.0, 6.5],
  ];
  loft(sh, prof.map(p => ({ c: [0, p[3], p[0]], u: U, v: Vv, ru: p[1], rv: p[2] })), 12, redFn(12, true), true);
  for (let i = 0; i < 9; i++) {
    const z = 8 - i * 2.1, y = 7.4 + 5.6 - Math.abs(z) * 0.05 - (z > 6 ? 1.2 : 0);
    spike(sh, 0, y - 0.3, z, 2.4 - Math.abs(i - 3) * 0.12, -0.1, 0, 0, 0xe0502e);
  }
  DR.body = sh.build(SOLID);
  DR.root.add(DR.body);

  const pl = new Shards();
  for (let i = 0; i < 5; i++) pl.add(G.box, mtx(0, 2.3 - i * 0.25, 9.0 - i * 1.9, 3.6 - i * 0.25, 0.4, 1.5, 0.2, 0, 0), BONE);
  DR.root.add(pl.build());

  /* 3 Necks */
  const NECK = {
    base: [
      [-3.0, 11.6, 8.2, -0.55],
      [0, 12.8, 8.8, 0],
      [3.0, 11.6, 8.2, 0.55],
    ] as Array<[number, number, number, number]>,
    segs: 6,
    len: 3.7,
  };

  for (let n = 0; n < 3; n++) {
    const b = NECK.base[n], root = new T.Group();
    root.position.set(b[0], b[1], b[2]);
    root.rotation.order = 'YXZ';
    DR.root.add(root);
    const segs: THREE.Group[] = [];
    let parent: THREE.Group = root;
    for (let i = 0; i < NECK.segs; i++) {
      const r0 = 2.2 - i * 0.2, r1 = 2.2 - (i + 1) * 0.2, sg = new T.Group();
      if (i > 0) sg.position.y = NECK.len;
      parent.add(sg);
      sg.add(neckSeg(NECK.len, r0, r1));
      segs.push(sg);
      parent = sg;
    }
    const head = makeDragonHead(DR.lights);
    head.g.position.y = NECK.len;
    parent.add(head.g);
    DR.necks.push({ root, segs, head, yaw: b[3], phase: n * 2.1 });
  }

  /* Tail */
  const tailBase = new T.Group();
  tailBase.position.set(0, 5.8, -9.8);
  DR.root.add(tailBase);
  let parentTail: THREE.Group = tailBase;
  for (let i = 0; i < 9; i++) {
    const r0 = 2.7 - i * 0.28, r1 = 2.7 - (i + 1) * 0.28, g = new T.Group();
    if (i > 0) g.position.z = -3.4;
    parentTail.add(g);
    const tailSh = new Shards(), U_ = [1, 0, 0], Vv_ = [0, 1, 0];
    loft(
      tailSh,
      [
        { c: [0, 0, 0.05], u: U_, v: Vv_, ru: r0, rv: r0 * 1.05 },
        { c: [0, 0, -1.7], u: U_, v: Vv_, ru: ((r0 + r1) / 2) * 1.08, rv: ((r0 + r1) / 2) * 1.1 },
        { c: [0, 0, -3.45], u: U_, v: Vv_, ru: r1, rv: r1 * 1.05 },
      ],
      8,
      redFn(8, false),
      false
    );
    tailSh.add(G.cone4, mtx(0, r0 * 1.05, -1.7, r0 * 0.42, r0 * 1.0, r0 * 0.42, 0.25, 0.78, 0), 0xe0502e);
    g.add(tailSh.build(SOLID));
    DR.tail.push(g);
    parentTail = g;
  }
  const tip = new Shards();
  tip.add(G.cone4, mtx(0, 0, -4.4, 1.3, 3.2, 0.45, -Math.PI / 2, 0.78, 0), BONE);
  parentTail.add(tip.build());

  /* Legs with claws */
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
    const g = new T.Group();
    g.position.set(sx * 4.4, 4.6, sz * 6.2);
    DR.root.add(g);
    const legSh = new Shards();
    legSh.add(G.oct, mtx(sx * 0.6, -1.2, 0, 2.0, 3.0, 2.0, 0.2, 0.5, 0.1), jitter(PAL.dragonRed, 0.2));
    legSh.add(G.ico, mtx(sx * 0.8, -3.6, 0.4, 1.4, 2.0, 1.4, 0.3, 0.5, 0), PAL.dragonDark);
    legSh.add(G.box, mtx(sx * 0.9, -4.5, 1.4, 3.0, 0.8, 3.4, 0, 0.2 * sx, 0), PAL.dragonDark);
    for (let c = -1; c <= 1; c++) {
      legSh.add(G.cone4, mtx(sx * 0.9 + c * 0.9, -4.5, 3.4, 0.35, 1.3, 0.35, Math.PI / 2 + 0.2, 0.78, 0), PAL.dragonBone);
    }
    g.add(legSh.build());
    DR.legs.push(g);
  });

  /* Wings */
  [-1, 1].forEach(s => {
    const w = new T.Group();
    w.position.set(s * 3.6, 11.0, 2.8);
    DR.root.add(w);
    const V = (x: number, y: number, z: number) => new T.Vector3(s * x, y, z);
    const sho = V(0, 0, 0), elb = V(7.5, 6.5, -2.0), wri = V(16, 5.0, -5.5);
    const tips = [V(27, 2.0, -3.5), V(27.5, -4.5, -11), V(22, -9.5, -17.5), V(14, -10.5, -20), V(6.5, -7, -17.5)];
    const bone = new Shards(), mem = new Shards();
    boneBetween(bone, sho, elb, 0.75, PAL.dragonDark);
    boneBetween(bone, elb, wri, 0.6, PAL.dragonDark);
    tips.forEach(t => boneBetween(bone, wri, t, 0.34, PAL.dragonBone));
    bone.add(G.cone4, mtx(wri.x, wri.y + 0.8, wri.z, 0.35, 1.7, 0.35, 0, 0, 0), PAL.dragonBone);

    const anchor = V(1, -3.2, -14);
    for (let i = 0; i < tips.length - 1; i++) {
      const a = tips[i], b = tips[i + 1], inner = a.clone().add(b).add(wri).multiplyScalar(1 / 3).lerp(anchor, 0.18 + i * 0.1);
      const cols = [PAL.dragonRed, PAL.dragonHot, PAL.dragonDark, 0x8f1b1c];
      mem.add(triGeo(wri, a, inner), new T.Matrix4(), jitter(cols[i % 4], 0.05));
      mem.add(triGeo(a, b, inner), new T.Matrix4(), jitter(cols[(i + 1) % 4], 0.05));
      const mid = a.clone().add(b).multiplyScalar(0.5).lerp(inner, 0.35);
      mem.add(triGeo(inner, b, wri), new T.Matrix4(), jitter(cols[(i + 2) % 4], 0.05));
      mem.add(triGeo(a, mid, inner), new T.Matrix4(), jitter(PAL.dragonHot, 0.05));
    }
    const last = tips[tips.length - 1];
    mem.add(triGeo(wri, last, anchor), new T.Matrix4(), PAL.dragonDark);
    mem.add(triGeo(sho, wri, anchor), new T.Matrix4(), jitter(PAL.dragonRed, 0.05));
    mem.add(triGeo(sho, anchor, V(0, -1.5, -8)), new T.Matrix4(), PAL.dragonDark);
    const wm = mem.build({ side: T.DoubleSide, roughness: 0.8 });
    w.add(wm);
    w.add(bone.build());
    DR.wings.push({ g: w, s });
  });

  DR.root.traverse(o => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return DR;
}
