import * as THREE from 'three';

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.id = 'game-canvas';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1626);
  scene.fog = new THREE.Fog(0x2a2030, 9, 26);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 140);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  return { renderer, scene, camera, onResize };
}

// A fixed pool of lights that is re-dressed for whichever room the player is
// in. Keeping the light count constant means shaders never recompile, and the
// GPU only ever pays for 3 point lights + 1 shadowed spot + 1 hemisphere.
export class LightPool {
  constructor(scene) {
    this.scene = scene;
    this.hemi = new THREE.HemisphereLight(0xffe6cc, 0x3a2a30, 0.6);
    scene.add(this.hemi);
    this.points = [0, 1, 2].map(() => {
      const l = new THREE.PointLight(0xffd38a, 0, 0, 2);
      scene.add(l);
      return l;
    });
    this.spot = new THREE.SpotLight(0xffe0b0, 0, 0, Math.PI / 3, 0.6, 2);
    this.spot.castShadow = true;
    this.spot.shadow.mapSize.set(1024, 1024);
    this.spot.shadow.bias = -0.0006;
    this.spot.shadow.normalBias = 0.02;
    this.spot.shadow.radius = 4;
    this.spot.shadow.camera.near = 0.3;
    this.spot.shadow.camera.far = 30;
    scene.add(this.spot);
    scene.add(this.spot.target);
    this.rig = null;
    this.fade = 1; // 0..1 brightness multiplier used for crossfades
    this.pending = null;
  }

  // Applies a rig immediately.
  apply(rig) {
    this.rig = rig;
    const s = this.scene;
    this.hemi.color.set(rig.hemi.sky);
    this.hemi.groundColor.set(rig.hemi.ground);
    rig.points.forEach((p, i) => {
      const l = this.points[i];
      l.position.set(...p.pos);
      l.color.set(p.color);
      l.distance = p.distance ?? 0;
    });
    const sp = rig.spot;
    this.spot.position.set(...sp.pos);
    this.spot.target.position.set(...sp.target);
    this.spot.color.set(sp.color);
    this.spot.angle = sp.angle ?? Math.PI / 3;
    this.spot.penumbra = sp.penumbra ?? 0.6;
    this.spot.shadow.camera.far = sp.far ?? 30;
    this.spot.shadow.needsUpdate = true;
    s.fog.color.set(rig.fog.color);
    s.fog.near = rig.fog.near;
    s.fog.far = rig.fog.far;
    s.background.set(rig.background ?? rig.fog.color);
    this.updateIntensity();
  }

  updateIntensity() {
    const r = this.rig;
    if (!r) return;
    const f = this.fade;
    this.hemi.intensity = r.hemi.intensity * (0.55 + 0.45 * f);
    r.points.forEach((p, i) => (this.points[i].intensity = p.intensity * f * (p.flicker ?? 1)));
    this.spot.intensity = r.spot.intensity * f;
  }

  // Fades out, swaps, fades in.
  transition(rig) {
    if (!this.rig) return this.apply(rig);
    if (this.rig === rig && !this.pending) return;
    this.pending = rig;
  }

  update(dt) {
    if (this.pending) {
      this.fade = Math.max(0, this.fade - dt * 4);
      if (this.fade === 0) {
        this.apply(this.pending);
        this.pending = null;
      }
    } else if (this.fade < 1) {
      this.fade = Math.min(1, this.fade + dt * 3);
    }
    this.updateIntensity();
  }
}
