/**
 * Stage Environment: EXACT Implementation from user attachment
 * Includes curving paper road, extruded ridges, splitting mountain with glowing crater,
 * 3-tier paper trees, swaying grass, floating motes, paper-cut sun discs, and sky shader.
 */

import * as THREE from 'three';
import {
  T,
  PAL,
  grainTex,
  mat,
  basic,
  mesh,
  box,
  rng,
  R,
  rr,
  clamp,
  sm,
  easeOut,
} from './characterModels';

export const SUN_POS = new T.Vector3(-110, 85, -300);
export const SUN_DIR = SUN_POS.clone().normalize();
export const roadX = (z: number) => Math.sin(z * 0.035) * 7 + Math.sin(z * 0.011 + 1) * 5;
export const roadDX = (z: number) => Math.cos(z * 0.035) * 0.245 + Math.cos(z * 0.011 + 1) * 0.055;
export const MOUNT = new T.Vector3(roadX(-112) * 0.6, 0, -112);

export interface MountainBundle {
  root: THREE.Group;
  left: THREE.Group;
  right: THREE.Group;
  pieces: Array<{
    m: THREE.Mesh;
    p0: THREE.Vector3;
    v: THREE.Vector3;
    spin: THREE.Vector3;
    r: number;
  }>;
  crater: THREE.Mesh;
  glow: THREE.PointLight;
}

export interface StageEnvironmentBundle {
  sceneGroup: THREE.Group;
  skyGroup: THREE.Group;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  fill: THREE.DirectionalLight;
  mountain: MountainBundle;
  motes: { im: THREE.InstancedMesh; seeds: number[][]; dummy: THREE.Object3D };
  clouds: THREE.Group[];
  grassUni: { uTime: { value: number } };
  update: (t: number, camPos: THREE.Vector3, focus: THREE.Vector3) => void;
  updateSun: (cx: number, cz: number) => void;
  updateMountain: (t: number) => void;
}

export function jaggedFrustum(rb: number, rt: number, h: number, seg: number, color: number, seed: number): THREE.Mesh {
  const g = new T.CylinderGeometry(rt, rb, h, seg, 2, false);
  const p = g.attributes.position;
  const r = rng(seed);
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (r() - .5) * 0.3;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) + (r() - .5) * h * 0.08, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return mesh(g, mat(color));
}

export function silhouette(len: number, base: number, amp: number, seed: number, jag: number) {
  const pts: [number, number][] = [], r = rng(seed);
  const ph = [r() * 6, r() * 6, r() * 6];
  for (let u = 0; u <= len; u += jag) {
    const h = base + amp * (0.55 * Math.sin(u * 0.03 + ph[0]) + 0.3 * Math.sin(u * 0.071 + ph[1]) + 0.15 * Math.sin(u * 0.19 + ph[2])) + (r() - .5) * amp * 0.35;
    pts.push([u, Math.max(1, h)]);
  }
  return pts;
}

export function extrudeSil(pts: [number, number][], depth: number, color: number, bottom = -6): THREE.Mesh {
  const sh = new T.Shape();
  sh.moveTo(pts[0][0], bottom);
  pts.forEach(p => sh.lineTo(p[0], p[1]));
  sh.lineTo(pts[pts.length - 1][0], bottom);
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: false, steps: 1 });
  return mesh(g, mat(color));
}

export function createStageEnvironment(): StageEnvironmentBundle {
  const sceneGroup = new T.Group();
  sceneGroup.name = 'WorldStage';

  /* Sky */
  const skyGroup = new T.Group();
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new T.Color(PAL.skyTop) },
      mid: { value: new T.Color(PAL.skyMid) },
      low: { value: new T.Color(PAL.skyLow) },
      hot: { value: new T.Color(PAL.skyHot) },
      sunDir: { value: SUN_DIR }
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vDir; uniform vec3 top,mid,low,hot,sunDir; void main(){ float h = vDir.y; vec3 c = mix(low, mid, smoothstep(0.0,0.26,h)); c = mix(c, top, smoothstep(0.2,0.8,h)); float s = max(dot(vDir,sunDir),0.0); c += hot*pow(s,9.0)*0.5 + hot*pow(s,70.0)*0.45; c = mix(c, low*0.85, smoothstep(0.0,-0.25,h)); gl_FragColor = vec4(c,1.0); }'
  });
  const skySphere = new T.Mesh(new T.SphereGeometry(800, 24, 16), skyMat);
  skySphere.renderOrder = -10;
  skySphere.frustumCulled = false;
  skyGroup.add(skySphere);

  /* Paper-cut Sun discs */
  const sunCols = [0xd9704f, 0xe8895a, 0xf2a35a, 0xf6c46c, 0xfbe3a0], rad = [34, 27, 20, 14, 8];
  const sunDiscGroup = new T.Group();
  sunDiscGroup.position.copy(SUN_POS);
  sunDiscGroup.lookAt(0, 0, 0);
  sunCols.forEach((c, i) => {
    const d = new T.Mesh(new T.CircleGeometry(rad[i], 40), basic(c, { fog: false }));
    d.position.z = i * 0.6;
    sunDiscGroup.add(d);
  });
  skyGroup.add(sunDiscGroup);

  /* Paper Clouds */
  const clouds: THREE.Group[] = [];
  const rc = rng(99);
  for (let i = 0; i < 9; i++) {
    const cg = new T.Group();
    const n = 3 + ((rc() * 2) | 0);
    for (let k = 0; k < n; k++) {
      const geo = new T.CylinderGeometry(1, 1, 0.5, 7);
      const me = new T.Mesh(geo, basic(k % 2 ? 0xe58a6c : 0xc9667a, { fog: false }));
      me.scale.set(9 + rc() * 8, 1, 3 + rc() * 2.5);
      me.position.set(k * 7 - n * 3, k * 0.5, rc() * 3);
      cg.add(me);
    }
    const a = -2.6 + rc() * 1.9;
    cg.position.set(Math.sin(a) * 420, 60 + rc() * 70, -Math.cos(a) * 420 - 80);
    cg.lookAt(0, cg.position.y, 0);
    cg.userData.drift = 0.4 + rc() * 0.6;
    cg.userData.base = cg.position.clone();
    skyGroup.add(cg);
    clouds.push(cg);
  }
  sceneGroup.add(skyGroup);

  /* Lights */
  const sun = new T.DirectionalLight(0xffb774, 2.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 520;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.06;
  sun.shadow.radius = 1.2;
  sceneGroup.add(sun);
  sceneGroup.add(sun.target);

  const hemi = new T.HemisphereLight(0x8d7fc4, 0x3a2b4b, 0.75);
  sceneGroup.add(hemi);

  const fill = new T.DirectionalLight(0x6a8cc8, 0.35);
  fill.position.set(40, 30, 120);
  sceneGroup.add(fill);

  const updateSun = (cx: number, cz: number) => {
    sun.target.position.set(cx, 0, cz);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 260);
    sun.target.updateMatrixWorld();
  };

  /* Ground */
  const groundGrain = grainTex.clone();
  groundGrain.needsUpdate = true;
  groundGrain.repeat.set(160, 160);
  const ground = mesh(new T.PlaneGeometry(900, 900), new T.MeshStandardMaterial({ color: PAL.teal, roughness: 1, flatShading: true, map: groundGrain }), false);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, -120);
  sceneGroup.add(ground);

  /* Curving Paper Road */
  const N = 150, z0 = 70, z1 = -215, step = (z1 - z0) / N;
  const roadGeo = new T.BoxGeometry(1, 0.3, 1);
  const rm = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, map: grainTex });
  const roadIm = new T.InstancedMesh(roadGeo, rm, N * 3);
  roadIm.receiveShadow = true;
  const dummy = new T.Object3D(), col = new T.Color();
  const roadR = rng(5);
  let k = 0;
  for (let i = 0; i < N; i++) {
    const z = z0 + i * step, x = roadX(z), yaw = Math.atan2(roadDX(z), 1);
    for (let s = -1; s <= 1; s++) {
      const wide = s === 0 ? 5.4 : 0.9, off = s * 3.1;
      dummy.position.set(x + Math.cos(yaw) * off, s === 0 ? 0.15 : 0.08, z - Math.sin(yaw) * off);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(wide, 1, Math.abs(step) * 1.25);
      dummy.updateMatrix();
      roadIm.setMatrixAt(k, dummy.matrix);
      col.set(s === 0 ? 0xd2a15f : 0x9a6a46);
      col.multiplyScalar(0.92 + roadR() * 0.16);
      roadIm.setColorAt(k, col);
      k++;
    }
  }
  sceneGroup.add(roadIm);

  /* Ridges */
  const ridgeCols = [0x2d6a68, 0x2f6277, 0x35588a, 0x40508f, 0x4a4a92, 0x56468f];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 6; i++) {
      const pts = silhouette(360, 5 + i * 3.6, 7 + i * 1.6, 40 + i * 7 + (side > 0 ? 100 : 0), 4.5);
      const me = extrudeSil(pts, 7, ridgeCols[i]);
      me.rotation.y = Math.PI / 2;
      me.position.set(side * (24 + i * 15) - (side < 0 ? 7 : 0), 0, 90);
      sceneGroup.add(me);
    }
  }

  const bc = [0x4a3f86, 0x5b3f86, 0x6e4388, 0x86497f, 0xa4586f];
  for (let j = 0; j < 5; j++) {
    const pts = silhouette(520, 22 + j * 3, 22 - j * 1.5, 300 + j * 11, 7).map(p => [p[0] - 260, p[1]] as [number, number]);
    const me = extrudeSil(pts, 4, bc[j], -10);
    me.position.set(0, 0, -165 - j * 22);
    sceneGroup.add(me);
  }

  /* The Mountain */
  const mountain: MountainBundle = {
    root: new T.Group(),
    left: new T.Group(),
    right: new T.Group(),
    pieces: [],
    crater: null as unknown as THREE.Mesh,
    glow: null as unknown as THREE.PointLight,
  };
  mountain.root.position.copy(MOUNT);
  sceneGroup.add(mountain.root);

  const mountCols = [0x2b2250, 0x37285e, 0x2a2a5a, 0x41306a];
  const L = [[-17, 0, 3, 15, 27], [-33, 0, 8, 17, 20], [-10, 0, 8, 10, 15]];
  const Rr = [[18, 0, 1, 14, 25], [34, 0, 7, 16, 18], [11, 0, 8, 10, 14]];
  L.forEach((a, i) => {
    const c = jaggedFrustum(a[3], 0.6, a[4], 6, mountCols[i], 11 + i);
    c.position.set(a[0], a[4] / 2, a[2]);
    mountain.left.add(c);
  });
  Rr.forEach((a, i) => {
    const c = jaggedFrustum(a[3], 0.6, a[4], 6, mountCols[(i + 1) % 4], 21 + i);
    c.position.set(a[0], a[4] / 2, a[2]);
    mountain.right.add(c);
  });
  mountain.root.add(mountain.left);
  mountain.root.add(mountain.right);

  const slabs = [[0, 7, 14, 15, 11, 0x35285c], [0, 21, 14, 11, 7, 0x2e2552], [0, 33, 12, 7, 0.5, 0x3d2d66]];
  slabs.forEach((s, i) => {
    const m = jaggedFrustum(s[3], s[4], s[2], 7, s[5], 31 + i);
    m.position.set(s[0], s[1], 0);
    mountain.root.add(m);
    mountain.pieces.push({
      m,
      p0: m.position.clone(),
      v: new T.Vector3((i - 1) * 3, 6 + i * 3, -2 + i),
      spin: new T.Vector3(rr(-.6, .6), rr(-.5, .5), rr(-.6, .6)),
      r: 5,
    });
  });

  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, rad = 9 + R() * 4;
    const sp = mesh(new T.ConeGeometry(2.4 + R() * 2, 10 + R() * 12, 5), mat(mountCols[i % 4]));
    sp.position.set(Math.cos(a) * rad, 5 + R() * 6, Math.sin(a) * rad * 0.6);
    sp.rotation.set((R() - .5) * 0.3, R() * 6, (R() - .5) * 0.3);
    mountain.root.add(sp);
    mountain.pieces.push({
      m: sp,
      p0: sp.position.clone(),
      v: new T.Vector3(Math.cos(a) * 9, 10 + R() * 8, Math.sin(a) * 6 - 2),
      spin: new T.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)),
      r: 2,
    });
  }

  /* glowing crater */
  const cr = new T.Mesh(new T.CircleGeometry(15, 8), basic(0xff6a2a, { fog: false, transparent: true, opacity: 0 }));
  cr.rotation.x = -Math.PI / 2;
  cr.position.y = 0.4;
  mountain.root.add(cr);
  mountain.crater = cr;

  const glow = new T.PointLight(0xff6a2a, 0, 120, 2);
  glow.position.set(0, 6, 4);
  mountain.root.add(glow);
  mountain.glow = glow;

  const T_CRACK = 35.0;
  const updateMountain = (t: number) => {
    const tau = Math.max(0, t - T_CRACK), g = 14;
    const open = easeOut(clamp(tau / 4.5));
    mountain.left.position.set(-open * 13, -open * 2.2, -open * 1.5);
    mountain.left.rotation.z = open * 0.11;
    mountain.right.position.set(open * 13, -open * 2.2, -open * 1.5);
    mountain.right.rotation.z = -open * 0.11;
    mountain.pieces.forEach(pc => {
      const x = pc.p0.x + pc.v.x * tau, z = pc.p0.z + pc.v.z * tau;
      let y = pc.p0.y + pc.v.y * tau - 0.5 * g * tau * tau;
      const floor = pc.r * 0.3 - 1;
      if (y < floor) y = floor;
      pc.m.position.set(x, y, z);
      const ts = Math.min(tau, 3.2);
      pc.m.rotation.set(pc.spin.x * ts, pc.spin.y * ts, pc.spin.z * ts);
    });
    (mountain.crater.material as THREE.MeshBasicMaterial).opacity = sm(T_CRACK, T_CRACK + 2.5, t) * 0.85;
    mountain.glow.intensity = sm(T_CRACK, T_CRACK + 3, t) * (2.6 + Math.sin(t * 13) * 0.5);
  };

  /* Trees, grass, rocks */
  const r = rng(77);
  const treeMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, map: grainTex });
  const levels = [[1.5, 2.4, 1.0], [1.15, 2.1, 2.1], [0.8, 1.8, 3.1]];
  const TN = 260;
  const ims = levels.map(l => {
    const im = new T.InstancedMesh(new T.ConeGeometry(l[0], l[1], 5), treeMat, TN);
    im.castShadow = true;
    im.receiveShadow = true;
    return im;
  });
  let tn = 0;
  while (tn < TN) {
    const z = 50 - r() * 210, side = r() < .5 ? -1 : 1, off = 7.5 + Math.pow(r(), 1.3) * 34;
    const x = roadX(z) + side * off, s = 0.8 + r() * 1.1, yaw = r() * 6;
    const c = [0x1f5a58, 0x24655f, 0x2b5a72, 0x3b4f86, 0x2a6a50][((r() * 5) | 0)];
    col.set(c).multiplyScalar(0.9 + r() * 0.2);
    levels.forEach((l, i) => {
      dummy.position.set(x, l[2] * s + l[1] * s * 0.5 - 0.2, z);
      dummy.rotation.set(0, yaw + i, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      ims[i].setMatrixAt(tn, dummy.matrix);
      ims[i].setColorAt(tn, col);
    });
    tn++;
  }
  ims.forEach(im => sceneGroup.add(im));

  /* Rocks */
  const rk = new T.InstancedMesh(new T.OctahedronGeometry(1, 0), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, map: grainTex }), 90);
  rk.castShadow = rk.receiveShadow = true;
  for (let i = 0; i < 90; i++) {
    const z = 40 - r() * 200, side = r() < .5 ? -1 : 1, x = roadX(z) + side * (4.2 + r() * 12), s = 0.3 + r() * 0.9;
    dummy.position.set(x, s * 0.4, z);
    dummy.rotation.set(r() * 3, r() * 3, r() * 3);
    dummy.scale.set(s * 1.4, s, s * 1.1);
    dummy.updateMatrix();
    rk.setMatrixAt(i, dummy.matrix);
    rk.setColorAt(i, col.set([0x6b6a8c, 0x7d6a88, 0x59597f][i % 3]));
  }
  sceneGroup.add(rk);

  /* Swaying grass */
  const gg = new T.ConeGeometry(0.14, 1, 3);
  gg.translate(0, 0.5, 0);
  const gm = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const grassUni = { uTime: { value: 0 } };
  gm.onBeforeCompile = sh => {
    sh.uniforms.uTime = grassUni.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n#ifdef USE_INSTANCING\n transformed.x += sin(uTime*2.2 + instanceMatrix[3].x*0.6 + instanceMatrix[3].z*0.35)*0.28*position.y;\n transformed.z += cos(uTime*1.7 + instanceMatrix[3].z*0.5)*0.12*position.y;\n#endif'
    );
  };
  const GN = 1100, gi = new T.InstancedMesh(gg, gm, GN);
  gi.receiveShadow = true;
  gi.castShadow = true;
  for (let i = 0; i < GN; i++) {
    const z = 55 - r() * 190, side = r() < .5 ? -1 : 1, x = roadX(z) + side * (3.4 + Math.pow(r(), 1.5) * 20), s = 0.7 + r() * 1.1;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, r() * 6, 0);
    dummy.scale.set(s, s * (0.8 + r() * 0.8), s);
    dummy.updateMatrix();
    gi.setMatrixAt(i, dummy.matrix);
    gi.setColorAt(i, col.set([0x3f8a6a, 0x4f9a68, 0x6aa05c, 0x358074][i % 4]).multiplyScalar(0.85 + r() * 0.3));
  }
  sceneGroup.add(gi);

  /* Floating paper motes */
  const MN = 160;
  const moteIm = new T.InstancedMesh(new T.OctahedronGeometry(0.07, 0), basic(0xffe0a6, { fog: false }), MN);
  const moteSeeds: number[][] = [];
  const mr = rng(31);
  for (let i = 0; i < MN; i++) moteSeeds.push([mr(), mr(), mr(), mr() * 6]);
  sceneGroup.add(moteIm);
  const motes = { im: moteIm, seeds: moteSeeds, dummy: new T.Object3D() };

  const updateMotes = (t: number, cx: number, cz: number) => {
    const { im, seeds, dummy: d } = motes;
    seeds.forEach((s, i) => {
      d.position.set(
        cx + (s[0] - .5) * 40 + Math.sin(t * 0.4 + s[3]) * 1.5,
        0.6 + s[1] * 9 + Math.sin(t * 0.7 + s[3] * 2) * 0.4,
        cz + (s[2] - .5) * 40 - Math.cos(t * 0.3 + s[3]) * 1.5
      );
      d.rotation.set(t * 0.6 + s[3], t * 0.5, 0);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  };

  const update = (t: number, camPos: THREE.Vector3, focus: THREE.Vector3) => {
    skyGroup.position.copy(camPos);
    clouds.forEach(c => {
      c.position.x = c.userData.base.x + Math.sin(t * 0.05 * c.userData.drift) * 10;
    });
    grassUni.uTime.value = t;
    updateMountain(t);
    updateMotes(t, focus.x, focus.z);
    updateSun(focus.x, focus.z - 22);
  };

  return {
    sceneGroup,
    skyGroup,
    sun,
    hemi,
    fill,
    mountain,
    motes,
    clouds,
    grassUni,
    update,
    updateSun,
    updateMountain,
  };
}
