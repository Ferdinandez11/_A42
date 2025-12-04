// --- START OF FILE src/features/editor/engine/managers/SceneManager.ts ---
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// 🔥 YA NO DEPENDE DE useAppStore → definimos aquí el tipo
export type CameraView = "top" | "front" | "side" | "iso";

export class SceneManager {
  public scene: THREE.Scene;
  public perspectiveCamera: THREE.PerspectiveCamera;
  public orthoCamera: THREE.OrthographicCamera;
  public activeCamera: THREE.Camera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public gridHelper: THREE.GridHelper | null = null;
  public dirLight: THREE.DirectionalLight | null = null;
  public sky: Sky | null = null;

  private container: HTMLElement;
  private frameOverlay: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    // SCENE
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    // PERSPECTIVE CAMERA
    this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
    this.perspectiveCamera.position.set(10, 15, 10);

    // ORTHOGRAPHIC CAMERA
    const frustumSize = 20;
    this.orthoCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      10000
    );
    this.orthoCamera.position.set(20, 20, 20);
    this.orthoCamera.lookAt(0, 0, 0);

    this.activeCamera = this.perspectiveCamera;

    // RENDERER
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance"
    });

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    container.appendChild(this.renderer.domElement);

    // ORBIT CONTROLS
    this.controls = new OrbitControls(this.activeCamera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.controls.screenSpacePanning = true;

    this.controls.minDistance = 1;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;

    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.initEnvironment();
    this.initFrameOverlay();

    // SHADOW RECEIVER PLANE
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.ShadowMaterial({ opacity: 0.3, color: 0x000000 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.001;
    shadowPlane.receiveShadow = true;
    shadowPlane.name = "ShadowPlane";
    this.scene.add(shadowPlane);
  }

  // ---------------------------------------------------------------------
  // FRAME MASK FOR PDF AREA
  // ---------------------------------------------------------------------
  private initFrameOverlay() {
    this.frameOverlay = document.createElement('div');

    this.frameOverlay.style.position = 'absolute';
    this.frameOverlay.style.border = '2px dashed rgba(255,255,255,0.9)';
    this.frameOverlay.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.7)';
    this.frameOverlay.style.pointerEvents = 'none';
    this.frameOverlay.style.zIndex = '100';
    this.frameOverlay.style.display = 'none';
    this.frameOverlay.style.left = '50%';
    this.frameOverlay.style.top = '50%';
    this.frameOverlay.style.transform = 'translate(-50%, -50%)';

    const label = document.createElement('div');
    label.innerText = 'ÁREA PDF PORTADA';
    label.style.position = 'absolute';
    label.style.bottom = '-25px';
    label.style.left = '50%';
    label.style.transform = 'translateX(-50%)';
    label.style.color = 'white';
    label.style.fontWeight = 'bold';
    label.style.fontSize = '12px';

    this.frameOverlay.appendChild(label);

    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }

    this.container.appendChild(this.frameOverlay);
  }

  public setFrameVisible(visible: boolean) {
    if (this.frameOverlay) {
      this.frameOverlay.style.display = visible ? 'block' : 'none';
      if (visible) this.updateFrameDimensions();
    }
  }

  public updateFrameDimensions() {
    if (!this.frameOverlay || this.frameOverlay.style.display === 'none') return;

    const containerW = this.container.clientWidth;
    const containerH = this.container.clientHeight;

    const targetAspect = 170 / 120;
    const screenAspect = containerW / containerH;

    let frameW, frameH;

    if (screenAspect > targetAspect) {
      frameH = containerH * 0.85;
      frameW = frameH * targetAspect;
    } else {
      frameW = containerW * 0.85;
      frameH = frameW / targetAspect;
    }

    this.frameOverlay.style.width = `${frameW}px`;
    this.frameOverlay.style.height = `${frameH}px`;
  }

  // ---------------------------------------------------------------------
  // ENVIRONMENT
  // ---------------------------------------------------------------------
  private initEnvironment() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    this.scene.add(hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.dirLight.position.set(50, 80, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;

    const d = 50;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0001;

    this.scene.add(this.dirLight);

    this.sky = new Sky();
    this.sky.scale.setScalar(450000);

    const u = this.sky.material.uniforms;
    u['turbidity'].value = 10;
    u['rayleigh'].value = 3;
    u['mieCoefficient'].value = 0.005;
    u['mieDirectionalG'].value = 0.7;

    this.updateSunPosition(180, 45);
    this.scene.add(this.sky);

    this.gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
    this.gridHelper.visible = true;
    this.gridHelper.position.y = 0.002;
    this.scene.add(this.gridHelper);
  }

  public updateSunPosition(azimuth: number, elevation: number) {
    if (!this.sky || !this.dirLight) return;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    const sunPos = new THREE.Vector3();
    sunPos.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms['sunPosition'].value.copy(sunPos);
    this.dirLight.position.copy(sunPos).multiplyScalar(100);
  }

  public setBackgroundColor(color: string) {
    this.scene.background = new THREE.Color(color);
    if (this.sky) this.sky.visible = false;
  }

  public setSkyVisible(visible: boolean) {
    if (this.sky) {
      this.sky.visible = visible;
      if (visible) this.scene.background = null;
    }
  }

  public setGridVisible(v: boolean) {
    if (this.gridHelper) this.gridHelper.visible = v;
  }

  // ---------------------------------------------------------------------
  // CAMERAS
  // ---------------------------------------------------------------------
  public switchCamera(type: "perspective" | "orthographic") {
    const oldPos = this.activeCamera.position.clone();
    const target = this.controls.target.clone();

    if (type === "orthographic") {
      this.activeCamera = this.orthoCamera;
      this.orthoCamera.zoom = 1;
      this.orthoCamera.updateProjectionMatrix();
    } else {
      this.activeCamera = this.perspectiveCamera;
    }

    this.activeCamera.position.copy(oldPos);
    this.activeCamera.lookAt(target);

    this.controls.object = this.activeCamera;
    this.controls.update();
  }

  public setView(view: CameraView) {
    const d = 20;
    const t = new THREE.Vector3(0, 0, 0);

    let p = new THREE.Vector3();

    if (view === "top") p.set(0, d, 0);
    else if (view === "front") p.set(0, 0, d);
    else if (view === "side") p.set(d, 0, 0);
    else p.set(d, d, d);

    this.activeCamera.position.copy(p);
    this.activeCamera.lookAt(t);

    this.controls.target.copy(t);
    this.controls.update();
  }

  // ---------------------------------------------------------------------
  // RESIZE + DISPOSE
  // ---------------------------------------------------------------------
  public onWindowResize = () => {
    if (!this.container) return;

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.perspectiveCamera.aspect = w / h;
    this.perspectiveCamera.updateProjectionMatrix();

    const a = w / h;
    const s = 20;
    this.orthoCamera.left = -(s * a) / 2;
    this.orthoCamera.right = (s * a) / 2;
    this.orthoCamera.top = s / 2;
    this.orthoCamera.bottom = -s / 2;
    this.orthoCamera.updateProjectionMatrix();

    this.renderer.setSize(w, h);

    this.updateFrameDimensions();
  };

  public dispose() {
    try {
      this.container.removeChild(this.renderer.domElement);
      if (this.frameOverlay) this.container.removeChild(this.frameOverlay);
    } catch (e) {}
    this.controls.dispose();
    this.renderer.dispose();
  }
}
// --- END OF FILE ---
