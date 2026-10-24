/**
 * SceneManager: Implements the exact 3D models, world choreography, camera paths,
 * dragon behavior, fire particles, and folding title sequence from the reference attachment.
 */

import * as THREE from 'three';
import {
  T,
  PAL,
  grainTex,
  basic,
  mesh,
  R,
  clamp,
  sm,
  easeIO,
  easeOut,
  lerp,
  makeHero,
  animHero,
  CAST,
  buildExactDragon,
  DragonBundle,
  POSE_COIL,
  POSE_FWD,
  POSE_UP,
  POSE_LOW,
} from './characterModels';
import {
  createStageEnvironment,
  StageEnvironmentBundle,
  MOUNT,
  roadX,
  roadDX,
} from './stageEnvironment';
import { soundManager } from '../audio/soundEngine';
import { EpisodeOutcome } from '../types/progress';

export type CameraPreset =
  | 'cinematic_run'
  | 'hero_novice'
  | 'hero_cat'
  | 'hero_pedro'
  | 'hero_nyf'
  | 'dragon_menace'
  | 'battle_clash'
  | 'free_orbit';

export interface CardState {
  id: string;
  name: string;
  actor: string;
  role: string;
  on: boolean;
}

export interface SceneManagerOptions {
  container: HTMLDivElement;
  onCameraChange?: (preset: CameraPreset) => void;
  onTimelineTime?: (t: number, duration: number) => void;
  onCardChange?: (cardId: string | null) => void;
}

export const DURATION = 60.0;
export const TITLE_AT = 56.3;

export class SceneManager {
  private container: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isDisposed = false;
  private frameId = 0;

  /* State */
  private stage!: StageEnvironmentBundle;
  public heroes: Record<string, THREE.Group> = {};
  public dragon!: DragonBundle;

  /* Fire particle system */
  private fireSystem!: {
    im: THREE.InstancedMesh;
    P: Array<{
      life: number;
      max: number;
      p: THREE.Vector3;
      v: THREE.Vector3;
      s: number;
      rot: THREE.Vector3;
    }>;
    N: number;
    cursor: number;
    col: THREE.Color;
    dummy: THREE.Object3D;
  };

  /* Title Scene */
  private titleScene!: THREE.Scene;
  private titleCam!: THREE.PerspectiveCamera;
  private titleLetters: Array<{ pivot: THREE.Group; delay: number; y: number; z0: number }> = [];

  /* Mode: 'cinematic_timeline' | 'interactive' */
  private mode: 'cinematic_timeline' | 'interactive' = 'cinematic_timeline';
  private clockT = 0;
  private isPlayingCinematic = false;
  private lastTime = 0;

  /* Interactive Camera Orbit */
  private activePreset: CameraPreset = 'cinematic_run';
  private targetCameraPos = new THREE.Vector3(0, 3.2, 9.5);
  private targetLookAt = new THREE.Vector3(0, 1.8, 0);
  private currentLookAt = new THREE.Vector3(0, 1.8, 0);
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private orbitTheta = 0;
  private orbitPhi = Math.PI * 0.42;
  private orbitRadius = 14;

  /* Lighting & Blade flares */
  private heroFireLight!: THREE.PointLight;
  private flares: THREE.Sprite[] = [];
  private lensMats: THREE.Material[] = [];

  /* Callbacks */
  private onTimelineTime?: (t: number, duration: number) => void;
  private onCardChange?: (cardId: string | null) => void;

  /* Road travel table */
  private Z_START = 54;
  private DT_TAB = 0.01;
  private ZTAB: number[] = [];

  /* Scheduled audio events */
  private scheduledEvents: Array<{ t: number; fn: () => void; done: boolean }> = [];

  constructor(options: SceneManagerOptions) {
    this.container = options.container;
    this.onTimelineTime = options.onTimelineTime;
    this.onCardChange = options.onCardChange;
    this.init();
  }

  private init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    /* 1. Renderer */
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000);
    this.container.appendChild(this.renderer.domElement);

    /* 2. Main Scene & Camera */
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(PAL.fog, 80, 430);
    this.scene.background = new THREE.Color(PAL.skyLow);

    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.3, 1600);
    this.camera.position.set(-30, 40, 104);
    this.camera.lookAt(8, 10, 20);

    /* 3. Stage & Lighting */
    this.stage = createStageEnvironment();
    this.scene.add(this.stage.sceneGroup);

    /* 4. Build Heroes with exact CAST rigs */
    (['novice', 'cat', 'pedro', 'nyf'] as const).forEach(key => {
      const h = makeHero(CAST[key]);
      h.name = key;
      this.scene.add(h);
      this.heroes[key] = h;

      h.traverse(o => {
        const m = (o as THREE.Mesh).material as THREE.Material & { transparent?: boolean; depthWrite?: boolean };
        if ((o as THREE.Mesh).isMesh && m && m.transparent && m.depthWrite === false) {
          this.lensMats.push(m);
        }
      });
    });

    /* 5. Build Dragon with exact Shard lofting */
    this.dragon = buildExactDragon();
    this.dragon.root.position.copy(MOUNT);
    this.dragon.root.position.y = -40;
    this.scene.add(this.dragon.root);

    /* 6. Fire Particle System */
    this.initFireSystem();

    /* 7. Blade flares & Hero Fire Light */
    this.heroFireLight = new THREE.PointLight(0xff7a2a, 0, 46, 1.6);
    this.scene.add(this.heroFireLight);

    const flareTex = (() => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const g = c.getContext('2d')!;
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,244,214,1)');
      gr.addColorStop(0.25, 'rgba(255,200,120,.6)');
      gr.addColorStop(1, 'rgba(255,160,60,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    this.flares = Object.keys(this.heroes).map(() => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: flareTex,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          fog: false,
        })
      );
      s.visible = false;
      this.scene.add(s);
      return s;
    });

    /* 8. Title Scene (Folding paper letters) */
    this.initTitleScene();

    /* 9. Pre-calculate Road Progression Table */
    this.initRoadTable();

    /* 10. Schedule Audio Beats */
    this.initAudioSchedule();

    /* 11. Bind Event Listeners */
    this.bindEvents();

    /* 12. Start Render Loop */
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  private initFireSystem() {
    const N = 1600;
    const im = new T.InstancedMesh(
      new T.TetrahedronGeometry(1, 0),
      new T.MeshBasicMaterial({ color: 0xffffff, fog: false }),
      N
    );
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(T.DynamicDrawUsage);

    const P: Array<{
      life: number;
      max: number;
      p: THREE.Vector3;
      v: THREE.Vector3;
      s: number;
      rot: THREE.Vector3;
    }> = [];
    const d = new T.Object3D();
    d.scale.set(0, 0, 0);
    d.updateMatrix();

    for (let i = 0; i < N; i++) {
      P.push({
        life: 1,
        max: 1,
        p: new T.Vector3(),
        v: new T.Vector3(),
        s: 1,
        rot: new T.Vector3(),
      });
      im.setMatrixAt(i, d.matrix);
      im.setColorAt(i, new T.Color(0xffffff));
    }

    this.scene.add(im);
    this.fireSystem = {
      im,
      P,
      N,
      cursor: 0,
      col: new T.Color(),
      dummy: new T.Object3D(),
    };
  }

  private emitFire(head: { g: THREE.Group }, n: number, spread: number, speed: number) {
    const o = new T.Vector3(0, 4.0, 0.6);
    head.g.localToWorld(o);
    const dir = new T.Vector3(0, 1, 0.12).transformDirection(head.g.matrixWorld);

    for (let i = 0; i < n; i++) {
      const p = this.fireSystem.P[this.fireSystem.cursor];
      this.fireSystem.cursor = (this.fireSystem.cursor + 1) % this.fireSystem.N;
      p.life = 0;
      p.max = 1.0 + R() * 0.9;
      p.p.copy(o).addScaledVector(dir, R() * 1.2);
      p.v.copy(dir).multiplyScalar(speed * (0.75 + R() * 0.5));
      p.v.x += (R() - 0.5) * spread;
      p.v.y += (R() - 0.5) * spread;
      p.v.z += (R() - 0.5) * spread;
      p.s = 0.55 + R() * 1.0;
      p.rot.set(R() * 6, R() * 6, R() * 6);
    }
  }

  private updateFire(dt: number) {
    const { im, P, dummy, col } = this.fireSystem;
    const fireRamp = [
      new T.Color(0xfff2b0),
      new T.Color(0xffc23a),
      new T.Color(0xf2692a),
      new T.Color(0xc2281f),
      new T.Color(0x4a1220),
    ];

    for (let i = 0; i < this.fireSystem.N; i++) {
      const p = P[i];
      if (p.life >= p.max) {
        if (p.s !== 0) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
          p.s = 0;
        }
        continue;
      }
      p.life += dt;
      const k = p.life / p.max;
      p.p.addScaledVector(p.v, dt);
      p.v.y += dt * 4.5;
      p.v.multiplyScalar(1 - dt * 0.35);
      const sc = p.s * (0.5 + Math.sin(Math.min(1, k * 1.2) * Math.PI) * 1.3) * (1 + k * 1.6);
      dummy.position.copy(p.p);
      dummy.rotation.set(p.rot.x + k * 5, p.rot.y + k * 4, p.rot.z);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);

      const f = Math.min(0.999, k) * (fireRamp.length - 1);
      const a = Math.floor(f);
      col.copy(fireRamp[a]).lerp(fireRamp[a + 1], f - a);
      im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }

  private initTitleScene() {
    this.titleScene = new T.Scene();
    this.titleScene.background = new T.Color(0x07060d);
    this.titleScene.fog = new T.Fog(0x07060d, 26, 70);

    const aspect = (this.container.clientWidth || window.innerWidth) / (this.container.clientHeight || window.innerHeight);
    this.titleCam = new T.PerspectiveCamera(30, aspect, 0.1, 200);

    const GLYPH: Record<string, Array<[number, number, number, number, number]>> = {
      T: [[1.5, 4.5, 3, 1, 0], [1.5, 2, 1, 4, 0]],
      H: [[0.5, 2.5, 1, 5, 0], [2.5, 2.5, 1, 5, 0], [1.5, 2.5, 1.2, 1, 0]],
      E: [[0.5, 2.5, 1, 5, 0], [2, 4.5, 2, 1, 0], [1.9, 2.5, 1.8, 1, 0], [2, 0.5, 2, 1, 0]],
      R: [[0.5, 2.5, 1, 5, 0], [1.9, 4.5, 2.2, 1, 0], [2.5, 3.5, 1, 1.6, 0], [1.9, 2.4, 2.2, 1, 0], [2.1, 1.0, 1, 2.3, -0.38]],
      O: [[0.5, 2.5, 1, 5, 0], [2.5, 2.5, 1, 5, 0], [1.5, 4.5, 1.2, 1, 0], [1.5, 0.5, 1.2, 1, 0]],
      A: [[0.85, 2.4, 1, 5.3, -0.3], [2.15, 2.4, 1, 5.3, 0.3], [1.5, 1.6, 1.5, 0.9, 0]],
      D: [[0.5, 2.5, 1, 5, 0], [1.6, 4.5, 1.6, 1, 0], [1.6, 0.5, 1.6, 1, 0], [2.5, 2.5, 1, 3.2, 0], [2.3, 4.1, 1, 1, 0.78], [2.3, 0.9, 1, 1, -0.78]],
      L: [[0.5, 2.5, 1, 5, 0], [2, 0.5, 2, 1, 0]],
      V: [[0.85, 2.5, 1, 5.4, 0.3], [2.15, 2.5, 1, 5.4, -0.3]],
    };

    const letterMats = {
      cream: new T.MeshStandardMaterial({ color: 0xe6d8bd, roughness: 0.95, flatShading: true, map: grainTex }),
      red: new T.MeshStandardMaterial({ color: 0xc2301f, roughness: 0.95, flatShading: true, map: grainTex }),
    };

    const buildWord = (word: string, scale: number, y: number, matKey: 'cream' | 'red', delay0: number, z0: number) => {
      const adv = 3.9 * scale;
      const total = word.length * adv - 0.9 * scale;
      let x = -total / 2;
      word.split('').forEach((ch, i) => {
        if (ch === ' ') {
          x += adv * 0.7;
          return;
        }
        const pivot = new T.Group();
        pivot.position.set(x, 0, 0);
        pivot.rotation.x = -Math.PI / 2 + 0.02;
        const g = new T.Group();
        g.position.y = 0;
        pivot.add(g);
        (GLYPH[ch] || []).forEach(p => {
          const b = mesh(new T.BoxGeometry(p[2] * scale, p[3] * scale, 0.9 * scale), letterMats[matKey]);
          b.position.set(p[0] * scale, p[1] * scale, 0);
          b.rotation.z = p[4];
          g.add(b);
        });
        pivot.position.y = 0.05;
        pivot.position.z = z0;
        this.titleScene.add(pivot);
        this.titleLetters.push({ pivot, delay: delay0 + i * 0.16, y, z0 });
        x += adv;
      });
    };

    buildWord('THE ROAD TO', 0.42, 6.4, 'cream', 0.0, -8);
    buildWord('ALEVEL', 1.0, 0.0, 'red', 0.95, 0);

    const fl = new T.Mesh(
      new T.PlaneGeometry(220, 220),
      new T.MeshStandardMaterial({ color: 0x1a1830, roughness: 1, map: grainTex, flatShading: true })
    );
    fl.rotation.x = -Math.PI / 2;
    fl.position.y = -0.01;
    fl.receiveShadow = true;
    this.titleScene.add(fl);

    const sunL = new T.DirectionalLight(0xffb36a, 2.6);
    sunL.position.set(-26, 7, -9);
    sunL.target.position.set(0, 3, 0);
    sunL.castShadow = true;
    this.titleScene.add(sunL);
    this.titleScene.add(sunL.target);
    this.titleScene.add(new T.HemisphereLight(0x39336b, 0x120f20, 0.5));

    const rim = new T.DirectionalLight(0x6a5cc8, 0.5);
    rim.position.set(20, 12, 25);
    this.titleScene.add(rim);
  }

  private updateTitle(tt: number) {
    this.titleLetters.forEach(L => {
      const k = clamp((tt - L.delay) / 0.9);
      const e = easeOut(k);
      const over = Math.sin(k * Math.PI) * 0.12 * (1 - k);
      L.pivot.rotation.x = lerp(-Math.PI / 2 + 0.02, 0, e) - over;
      L.pivot.position.y = lerp(0.05, L.y, e);
      L.pivot.position.z = lerp(L.z0, 0, e);
    });

    const cx = Math.sin(tt * 0.25) * 0.8;
    this.titleCam.position.set(cx - 1.0 + tt * -0.08, 3.3 + tt * 0.02, 29 - tt * 0.35);
    this.titleCam.lookAt(0, 4.7, 0);
  }

  private initRoadTable() {
    let z = this.Z_START;
    for (let i = 0; i <= DURATION / this.DT_TAB + 2; i++) {
      const t = i * this.DT_TAB;
      this.ZTAB.push(z);
      let v = 2.7;
      v *= 1 - sm(32.5, 35.5, t);
      v += 8.8 * sm(51.9, 53.3, t) * (1 - sm(55.6, 56.2, t));
      z -= v * this.DT_TAB;
    }
  }

  private Zc(t: number): number {
    const f = clamp(t, 0, DURATION) / this.DT_TAB;
    const i = Math.floor(f);
    return lerp(this.ZTAB[i], this.ZTAB[i + 1], f - i);
  }

  private heroPose(name: 'novice' | 'cat' | 'pedro' | 'nyf', t: number) {
    const LANE = { novice: -2.7, cat: -0.95, pedro: 0.95, nyf: 2.7 };
    const z = this.Zc(t);
    const x = roadX(z) + LANE[name];
    const roadYaw = Math.PI + Math.atan(roadDX(z));
    const faceYaw = Math.PI - Math.atan((MOUNT.x - x) / Math.max(1, z - MOUNT.z));
    const yaw = lerp(roadYaw, faceYaw, sm(32.5, 36, t));
    return { x, z, yaw };
  }

  private initAudioSchedule() {
    const addEv = (t: number, fn: () => void) => this.scheduledEvents.push({ t, fn, done: false });

    for (let i = 0; i < 40; i++) {
      const tt = 3.2 + i * 0.74;
      if (tt < 33) addEv(tt, () => soundManager.step(0.12 + 0.08 * sm(5, 25, tt)));
    }
    [220, 261.6, 329.6, 392, 329.6, 261.6, 220, 196].forEach((f, i) => {
      for (let r = 0; r < 4; r++) {
        const tt = 4.5 + r * 6 + i * 0.75;
        if (tt < 34) addEv(tt, () => soundManager.note(f, 1.8, 0.05 + 0.03 * sm(6, 24, tt)));
      }
    });

    addEv(29.0, () => soundManager.chord(110, 6, 0.1));
    for (let i = 0; i < 8; i++) addEv(29.3 + i * 0.75, () => soundManager.drum(0.35 + i * 0.05, 100));
    addEv(35.0, () => {
      soundManager.crack();
      soundManager.rumble(6.5, 0.9);
      soundManager.drum(1, 55);
    });
    for (let i = 0; i < 4; i++) addEv(36.6 + i * 1.1, () => soundManager.drum(0.55 + i * 0.1, 62));
    addEv(40.4, () => soundManager.roar(3.6));
    addEv(40.5, () => soundManager.hit(1));
    addEv(42.5, () => soundManager.fire(3.2, 0.7));
    addEv(42.6, () => soundManager.chord(82.4, 4, 0.12));

    [44.5, 45.5, 46.5, 47.5].forEach((tt, i) =>
      addEv(tt, () => {
        soundManager.drum(0.7, 70 + i * 6);
        soundManager.note([440, 392, 523.3, 330][i], 1.2, 0.07);
      })
    );

    [48.6, 49.2, 49.8, 50.4].forEach(tt => addEv(tt, () => soundManager.shing()));
    for (let i = 0; i < 10; i++) addEv(48.6 + i * 0.4, () => soundManager.drum(0.3 + i * 0.04, 90));
    addEv(51.5, () => soundManager.roar(4));
    addEv(51.8, () => soundManager.fire(4.0, 0.8));
    for (let i = 0; i < 12; i++)
      addEv(52.0 + i * 0.33, () => {
        soundManager.drum(0.8, 80);
        if (i % 2 === 0) soundManager.step(0.3);
      });
    addEv(56.35, () => {
      soundManager.hit(1.1);
      soundManager.chord(110, 6, 0.16);
      soundManager.note(55, 6, 0.2, 'sine');
    });
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd);
  }

  private onResize = () => {
    if (this.isDisposed || !this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.titleCam.aspect = w / h;
    this.titleCam.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      this.mode = 'interactive';
      this.activePreset = 'free_orbit';
    }

    this.orbitTheta -= deltaX * 0.005;
    this.orbitPhi = Math.max(0.15, Math.min(Math.PI * 0.48, this.orbitPhi + deltaY * 0.005));
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  };

  private onMouseUp = () => {
    this.isDragging = false;
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (!this.isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
    const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      this.mode = 'interactive';
      this.activePreset = 'free_orbit';
    }

    this.orbitTheta -= deltaX * 0.006;
    this.orbitPhi = Math.max(0.15, Math.min(Math.PI * 0.48, this.orbitPhi + deltaY * 0.006));
    this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  private onTouchEnd = () => {
    this.isDragging = false;
  };

  /* Camera Preset Selector */
  public setCameraPreset(preset: CameraPreset) {
    this.activePreset = preset;
    if (preset === 'cinematic_run') {
      this.mode = 'cinematic_timeline';
      this.isPlayingCinematic = true;
      soundManager.startAmbient();
      return;
    }

    this.mode = 'interactive';
    const novHead = this.heroes.novice?.position || new THREE.Vector3();
    const catHead = this.heroes.cat?.position || new THREE.Vector3();
    const pedroHead = this.heroes.pedro?.position || new THREE.Vector3();
    const nyfHead = this.heroes.nyf?.position || new THREE.Vector3();

    switch (preset) {
      case 'hero_novice':
        this.targetCameraPos.set(novHead.x - 2.5, 3.2, novHead.z + 5.5);
        this.targetLookAt.set(novHead.x, 2.5, novHead.z);
        break;
      case 'hero_cat':
        this.targetCameraPos.set(catHead.x - 2.2, 3.2, catHead.z + 5.5);
        this.targetLookAt.set(catHead.x, 2.5, catHead.z);
        break;
      case 'hero_pedro':
        this.targetCameraPos.set(pedroHead.x + 2.2, 3.2, pedroHead.z + 5.5);
        this.targetLookAt.set(pedroHead.x, 2.5, pedroHead.z);
        break;
      case 'hero_nyf':
        this.targetCameraPos.set(nyfHead.x + 2.5, 3.2, nyfHead.z + 5.5);
        this.targetLookAt.set(nyfHead.x, 2.5, nyfHead.z);
        break;
      case 'dragon_menace':
        this.targetCameraPos.set(MOUNT.x, 6.0, MOUNT.z + 24);
        this.targetLookAt.set(MOUNT.x, 16.0, MOUNT.z);
        break;
      case 'battle_clash':
        this.targetCameraPos.set(0, 5.0, 15);
        this.targetLookAt.set(0, 6.0, -15);
        break;
      case 'free_orbit':
        break;
    }
  }

  public playCinematic() {
    this.mode = 'cinematic_timeline';
    this.isPlayingCinematic = true;
    this.clockT = 0;
    this.scheduledEvents.forEach(e => (e.done = false));
    soundManager.startAmbient();
  }

  public playEpisodeBattle(_outcome: EpisodeOutcome) {
    this.mode = 'interactive';
    this.setCameraPreset('battle_clash');

    // Trigger dragon heads to snap and roar
    const now = performance.now() * 0.001;
    this.dragon.necks.forEach((nk) => {
      nk.head.jaw.rotation.x = 0.85;
      this.emitFire(nk.head, 35, 3.5, 30);
    });

    // Animate heroes raising swords
    ['novice', 'cat', 'pedro', 'nyf'].forEach((key) => {
      const h = this.heroes[key];
      if (h) {
        animHero(h, now, 0, { draw: 1, squint: 0.1 });
      }
    });
  }

  private updateHeroesTimeline(t: number) {
    const names = ['novice', 'cat', 'pedro', 'nyf'] as const;
    names.forEach((n, idx) => {
      const h = this.heroes[n];
      if (!h) return;
      const p = this.heroPose(n, t);
      const pp = this.heroPose(n, t - 0.06);
      const spd = Math.hypot(p.x - pp.x, p.z - pp.z) / 0.06 / 2.7;
      h.position.set(p.x, 0, p.z);
      h.rotation.y = p.yaw;

      const o: Record<string, any> = {
        phase: idx * 1.7,
        draw: 0,
        lookY: 0,
        lookX: 0,
        gazeX: 0,
        squint: 0,
        browLift: 0,
      };

      const awe = sm(39.6, 41.2, t) * (1 - sm(48.4, 49.4, t));
      o.lookX = -0.26 * awe;
      o.browLift = awe * (n === 'cat' ? 1.3 : n === 'nyf' ? 0.2 : 0.7);

      const drawT = [48.6, 49.2, 49.8, 50.4][idx];
      o.draw = clamp((t - drawT) / 0.9);

      const resolve = sm(48.4, 50.5, t);
      o.squint = n === 'pedro' ? 0.1 * resolve : 0.08 * resolve;
      o.browLift -= resolve * 0.4;

      if (n === 'novice') {
        o.lookY = -0.25 * sm(9.6, 10.6, t) * (1 - sm(10.8, 11, t));
      }
      if (n === 'cat') {
        o.lookX += -0.3 * (sm(12.2, 12.7, t) * (1 - sm(13.5, 14.0, t)));
        o.lookY = 0.55 * (sm(14.6, 15.2, t) * (1 - sm(16.3, 16.9, t)));
        o.gazeX = 1.0 * (sm(14.4, 14.8, t) * (1 - sm(16.4, 16.9, t)));
      }
      if (n === 'pedro') {
        o.lookY = 1.15 * (sm(20.0, 21.0, t) * (1 - sm(22.0, 22.8, t)));
        o.gazeX = -1.0 * (sm(20.2, 21, t) * (1 - sm(22, 22.8, t)));
        o.squint += 0.12 * (sm(20.2, 21, t) * (1 - sm(22, 22.8, t)));
      }
      if (n === 'nyf') {
        o.lookX += -0.42 * (sm(24.8, 26.0, t) * (1 - sm(27.6, 28.8, t)));
      }

      animHero(h, t, clamp(spd, 0, 1.7), o);

      // Visibility in intro close-ups
      if (t < 4.6) h.visible = n === 'novice';
      else if (t < 11) h.visible = n === 'novice';
      else if (t < 17) h.visible = n === 'cat';
      else if (t < 23) h.visible = n === 'pedro';
      else if (t < 29) h.visible = n === 'nyf';
      else h.visible = true;
    });
  }

  private updateDragonTimeline(t: number, dt: number) {
    const rise = easeOut(clamp((t - 35.0) / 6.0));
    this.dragon.root.position.set(MOUNT.x, lerp(-36, 0, rise), MOUNT.z - lerp(6, 0, rise));

    const coil = 1 - easeIO(clamp((t - 36.2) / 4.2));
    const roar = sm(40.2, 41.2, t) * (1 - 0.55 * sm(46.4, 47.6, t));
    const fireEnv = Math.max(
      sm(42.5, 43.0, t) * (1 - sm(45.4, 46.0, t)),
      sm(51.7, 52.0, t) * (1 - sm(55.5, 55.9, t))
    );
    const lunge = sm(51.5, 52.6, t) * (1 - sm(55.7, 56, t));
    const jawBase = Math.max(roar * (t < 43 ? 0.9 : 0.35), fireEnv * 0.85);
    const w = 0.12 + 0.08 * Math.sin(t * 3);

    this.dragon.necks.forEach((nk, n) => {
      const wave = Math.sin(t * 1.4 + nk.phase) * 0.06;
      const wave2 = Math.sin(t * 2.1 + nk.phase * 1.7) * 0.05;
      const pose = POSE_COIL.map((c, i) => {
        const up = lerp(POSE_FWD[i], POSE_UP[i], roar);
        const low = lerp(up, POSE_LOW[i], lunge);
        return lerp(low, c, coil);
      });

      nk.root.rotation.y = nk.yaw * lerp(0.35, 1.0, 1 - coil) + wave * 0.6;
      nk.root.rotation.x = pose[0] + wave2;

      nk.segs.forEach((sg, i) => {
        sg.rotation.x =
          pose[Math.min(i + 1, 5)] * (i === 0 ? 0.0 : 1) * 0.78 +
          (i > 0 ? Math.sin(t * 1.7 + i * 0.7 + nk.phase) * 0.045 : 0);
        sg.rotation.z = nk.yaw * 0.06 * i * (1 - coil);
      });

      nk.head.g.rotation.x = pose[6] * 0.5;
      const open = Math.max(jawBase, t > 38.5 ? w * 0.6 : 0);
      nk.head.jaw.rotation.x = 0.08 + open * 0.95 + Math.sin(t * 11 + n) * 0.03 * open;

      const pul = 0.75 + Math.sin(t * 6 + n * 1.9) * 0.25 + roar * 0.4;
      nk.head.eyes.forEach(e => {
        (e.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.65 + pul * 0.3, 0.1 + pul * 0.1);
        e.scale.set(1.35 + roar * 0.3, 0.55 * (0.8 + pul * 0.3), 1);
      });

      nk.head.light.intensity = fireEnv * 3.2;

      if (fireEnv > 0.01) {
        nk.root.updateWorldMatrix(true, true);
        this.emitFire(nk.head, Math.round(fireEnv * 22), 3.2, 34);
      }
    });

    const flap = sm(40.5, 41.5, t);
    this.dragon.wings.forEach(wing => {
      const spread = easeOut(clamp((t - 38.0) / 3.0));
      const beat = Math.sin(t * 3.6) * 0.22 * flap;
      wing.g.rotation.z = wing.s * lerp(1.45, -0.05 + beat, spread);
      wing.g.rotation.y = wing.s * lerp(0.7, -0.12, spread);
      wing.g.rotation.x = lerp(0.25, 0.0, spread);
    });

    this.dragon.tail.forEach((g, i) => {
      g.rotation.y = Math.sin(t * 1.5 - i * 0.55) * 0.13;
      g.rotation.x = Math.sin(t * 1.1 - i * 0.4) * 0.04 + 0.03;
    });

    this.updateFire(dt);
  }

  private shot(t: number) {
    let P = new THREE.Vector3();
    let L = new THREE.Vector3();
    let shake = 0;

    const hp = (n: 'novice' | 'cat' | 'pedro' | 'nyf') => {
      const p = this.heroPose(n, t);
      return new THREE.Vector3(p.x, 0, p.z);
    };

    if (t < 5) {
      const k = easeIO(t / 5);
      P.lerpVectors(new THREE.Vector3(-30, 40, 104), new THREE.Vector3(-15, 17, 82), k);
      L.lerpVectors(new THREE.Vector3(8, 10, 20), new THREE.Vector3(-2, 15, -60), k);
    } else if (t < 11) {
      const k = (t - 5) / 6, h = hp('novice'), lead = lerp(7.5, 0, easeOut(clamp(k * 1.5)));
      P = h.clone().add(new THREE.Vector3(5.4 - 1.4 * k, 2.1 + 0.4 * k, -7.2 + 1.6 * k));
      L = h.clone().add(new THREE.Vector3(lead, 2.55, 0));
    } else if (t < 17) {
      const k = (t - 11) / 6, h = hp('cat');
      P = h.clone().add(new THREE.Vector3(-3.9 + 0.8 * k, 0.5 + 0.5 * k, -6.2 + 0.6 * k));
      L = h.clone().add(new THREE.Vector3(0, 2.9 + 0.2 * k, 0));
    } else if (t < 23) {
      const k = (t - 17) / 6, h = hp('pedro'), a = lerp(-1.25, 0.55, easeIO(k)), r = 7.0 - 0.8 * k;
      P = h.clone().add(new THREE.Vector3(Math.sin(a) * r, 2.4 + 0.3 * Math.sin(k * 3), -Math.cos(a) * r));
      L = h.clone().add(new THREE.Vector3(0, 2.7, 0));
    } else if (t < 29) {
      const k = easeIO((t - 23) / 6), h = hp('nyf');
      P = h.clone().add(new THREE.Vector3(-8.2, 1.2, -1.2).lerp(new THREE.Vector3(-4.4, 1.9, -3.6), k));
      L = h.clone().add(new THREE.Vector3(0, 2.5, 0));
    } else if (t < 35) {
      const k = (t - 29) / 6;
      P = new THREE.Vector3(3.2 - 1.8 * k, 3.0 + 0.5 * k, 17.5 - 3.5 * k);
      L = new THREE.Vector3(MOUNT.x * 0.3, 9.5 + 3 * k, -70);
    } else if (t < 41) {
      const k = (t - 35) / 6;
      P = new THREE.Vector3(4.2 - 0.8 * k, 0.75, 9.5);
      L.lerpVectors(new THREE.Vector3(MOUNT.x, 7, MOUNT.z + 5), new THREE.Vector3(MOUNT.x, 21, MOUNT.z + 8), easeIO(k));
      shake = 0.12 * (1 - sm(36.5, 40, t)) + 0.04;
    } else if (t < 42.7) {
      const k = (t - 41) / 1.7;
      const hd = new THREE.Vector3();
      this.dragon.necks[1].head.g.getWorldPosition(hd);
      P = hd.clone().add(new THREE.Vector3(-12, -9, 16).lerp(new THREE.Vector3(-8, -5, 12), k));
      L = hd.clone().add(new THREE.Vector3(0, 1.0, 1));
      shake = 0.25;
    } else if (t < 44.5) {
      const k = (t - 42.7) / 1.8;
      P = new THREE.Vector3(13 - 3 * k, 3.2, 8);
      L = new THREE.Vector3(MOUNT.x, 17 + 2 * k, MOUNT.z + 11);
      shake = 0.15;
    } else if (t < 48.5) {
      const names = ['novice', 'cat', 'pedro', 'nyf'] as const;
      const i = Math.min(3, Math.floor(t - 44.5));
      const k = (t - 44.5) - i;
      const n = names[i];
      const h = this.heroes[n];
      const hd = new THREE.Vector3();
      h.userData.parts.head.getWorldPosition(hd);
      P = hd.clone().add(new THREE.Vector3(0, 0.05, lerp(3.4, 2.7, k)));
      L = hd.clone().add(new THREE.Vector3(0, 0.05, 0));
    } else if (t < 52) {
      const k = (t - 48.5) / 3.5;
      P = new THREE.Vector3(lerp(9, 4.2, easeIO(k)), lerp(1.2, 1.5, k), -lerp(9.5, 8.5, k));
      L = new THREE.Vector3(0, 3.0, 0);
    } else if (t < TITLE_AT) {
      const k = (t - 52) / 4;
      P = new THREE.Vector3(-lerp(11, 6, k), lerp(3.4, 2.2, k), lerp(8, 5, k));
      L = new THREE.Vector3(1.2, 3.8 + 1.2 * k, -16);
      shake = 0.12;
    }

    const nx = Math.sin(t * 11.3) * shake + Math.sin(t * 2.1) * 0.02;
    const ny = Math.sin(t * 13.7 + 1) * shake * 0.7 + Math.sin(t * 1.7) * 0.02;

    this.camera.position.copy(P).add(new THREE.Vector3(nx, ny, 0));
    this.camera.lookAt(L.clone().add(new THREE.Vector3(ny * 0.4, nx * 0.4, 0)));
  }

  private updateCardOverlays(t: number) {
    if (!this.onCardChange) return;

    if (t >= 5.7 && t < 10.3) this.onCardChange('novice');
    else if (t >= 11.7 && t < 16.3) this.onCardChange('cat');
    else if (t >= 17.7 && t < 22.3) this.onCardChange('pedro');
    else if (t >= 23.7 && t < 28.3) this.onCardChange('nyf');
    else if (t >= 41.15 && t < 44.4) this.onCardChange('dragon');
    else this.onCardChange(null);
  }

  private tick = (now: number) => {
    if (this.isDisposed) return;

    const dt = Math.min(0.05, (now - this.lastTime) * 0.001 || 0.016);
    this.lastTime = now;

    if (this.mode === 'cinematic_timeline') {
      const prev = this.clockT;
      this.clockT = Math.min(DURATION, this.clockT + dt);

      // Fire audio cues
      this.scheduledEvents.forEach(e => {
        if (!e.done && e.t <= this.clockT && e.t > prev - 0.0001) {
          e.done = true;
          if (this.clockT - e.t < 0.4) e.fn();
        }
      });

      this.updateCardOverlays(this.clockT);
      this.updateHeroesTimeline(this.clockT);
      this.updateDragonTimeline(this.clockT, dt);
      this.shot(this.clockT);

      // World update
      const pc = new THREE.Vector3(0, 0, this.Zc(this.clockT));
      this.stage.update(this.clockT, this.camera.position, pc);

      // Sound parameters
      soundManager.set(this.clockT);

      if (this.onTimelineTime) {
        this.onTimelineTime(this.clockT, DURATION);
      }

      // Title sequence transition
      if (this.clockT >= TITLE_AT) {
        const tt = this.clockT - TITLE_AT;
        this.updateTitle(tt);
        this.renderer.render(this.titleScene, this.titleCam);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    } else {
      // Interactive mode
      const time = now * 0.001;
      this.stage.update(time, this.camera.position, new THREE.Vector3(0, 0, 0));

      // Gentle dragon breathing
      this.dragon.necks.forEach((nk) => {
        nk.head.jaw.rotation.x = 0.08 + Math.max(0, Math.sin(time * 2)) * 0.3;
      });
      this.updateFire(dt);

      // Camera lerp
      if (this.activePreset === 'free_orbit') {
        const x = this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
        const y = this.orbitRadius * Math.cos(this.orbitPhi);
        const z = this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);
        this.targetCameraPos.set(x, y + 2, z);
      }

      this.camera.position.lerp(this.targetCameraPos, 0.08);
      this.currentLookAt.lerp(this.targetLookAt, 0.08);
      this.camera.lookAt(this.currentLookAt);

      this.renderer.render(this.scene, this.camera);
    }

    this.frameId = requestAnimationFrame(this.tick);
  };

  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
