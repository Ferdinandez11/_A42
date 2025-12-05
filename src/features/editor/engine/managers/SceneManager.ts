// --- FILE: src/features/editor/engine/managers/SceneManager.ts ---
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";

export type CameraView = "top" | "front" | "side" | "iso";

export class SceneManager {
  public scene: THREE.Scene;
  public perspectiveCamera: THREE.PerspectiveCamera;
  public orthoCamera: THREE.OrthographicCamera;
  public activeCamera: THREE.Camera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  public grid: THREE.GridHelper;
  public dirLight: THREE.DirectionalLight | null = null;
  public sky: Sky | null = null;
  public sun: THREE.DirectionalLight;

  private container: HTMLElement;
  private frameOverlay: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // === SCENE ===
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#222222");

    // === RENDERER ===
    this.renderer = this.createRenderer(container);

    // === CAMERAS ===
    this.perspectiveCamera = this.createPerspectiveCamera();
    this.orthoCamera = this.createOrthoCamera();
    this.activeCamera = this.perspectiveCamera;

    // === CONTROLS ===
    this.controls = this.createControls();

    // === ENVIRONMENT ===
    this.sun = this.createSun();
    this.dirLight = this.sun; // <--- AHORA updateSunPosition funciona
    this.sky = this.createSky();
    this.grid = this.createGrid();
    this.createShadowReceiver();

    // === FRAME OVERLAY ===
    this.initFrameOverlay();
  }

  // ------------------------------------------------------
  // RENDERER
  // ------------------------------------------------------
  private createRenderer(container: HTMLElement) {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    container.appendChild(renderer.domElement);
    return renderer;
  }

  // ------------------------------------------------------
  // CAMERAS
  // ------------------------------------------------------
  private createPerspectiveCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const cam = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
    cam.position.set(12, 10, 12);
    return cam;
  }

  private createOrthoCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const s = 20;

    const cam = new THREE.OrthographicCamera(
      -(s * aspect) / 2,
      (s * aspect) / 2,
      s / 2,
      -s / 2,
      -500,
      500
    );

    cam.position.set(20, 20, 20);
    cam.lookAt(0, 0, 0);

    return cam;
  }

  public switchCamera(type: "perspective" | "orthographic") {
    const oldPos = this.activeCamera.position.clone();
    const target = this.controls.target.clone();

    this.activeCamera =
      type === "perspective" ? this.perspectiveCamera : this.orthoCamera;

    this.activeCamera.position.copy(oldPos);
    this.activeCamera.lookAt(target);

    this.controls.object = this.activeCamera;
    this.controls.update();
  }

  public setView(view: CameraView) {
    const d = 22;
    const target = new THREE.Vector3(0, 0, 0);

    const pos =
      view === "top"
        ? new THREE.Vector3(0, d, 0)
        : view === "front"
        ? new THREE.Vector3(0, 0, d)
        : view === "side"
        ? new THREE.Vector3(d, 0, 0)
        : new THREE.Vector3(d, d, d);

    this.activeCamera.position.copy(pos);
    this.activeCamera.lookAt(target);

    this.controls.target.copy(target);
    this.controls.update();
  }

  // ------------------------------------------------------
  // CONTROLS
  // ------------------------------------------------------
  private createControls() {
    const c = new OrbitControls(this.activeCamera, this.renderer.domElement);

    c.enableDamping = true;
    c.dampingFactor = 0.04;

    c.minDistance = 1;
    c.maxDistance = 500;

    c.screenSpacePanning = true;

    c.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    return c;
  }

  // ------------------------------------------------------
  // ENVIRONMENT
  // ------------------------------------------------------
  private createSun() {
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(60, 80, 60);
    sun.castShadow = true;

    sun.shadow.mapSize.set(2048, 2048);

    const d = 60;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0001;

    this.scene.add(sun);
    return sun;
  }

  private createSky() {
    const sky = new Sky();
    sky.scale.setScalar(450000);

    const u = sky.material.uniforms;
    u["turbidity"].value = 10;
    u["rayleigh"].value = 3;
    u["mieCoefficient"].value = 0.004;
    u["mieDirectionalG"].value = 0.7;

    this.updateSunPosition(180, 45);

    this.scene.add(sky);
    return sky;
  }

  // ------------------------------------------------------
  // SUN POSITION (FIXED)
  // ------------------------------------------------------
  public updateSunPosition(azimuth: number, elevation: number) {
    if (!this.dirLight) return;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);

    this.dirLight.position.set(x * 50, y * 50, z * 50);
    this.dirLight.target.position.set(0, 0, 0);
    this.dirLight.target.updateMatrixWorld();
  }

  private createGrid() {
    const grid = new THREE.GridHelper(200, 200, 0x888888, 0x444444);
    grid.position.y = 0.005;
    this.scene.add(grid);
    return grid;
  }

  public setGridVisible(v: boolean) {
    this.grid.visible = v;
  }

  public setSkyVisible(v: boolean) {
    if (!this.sky) return;
    this.sky.visible = v;
    this.scene.background = v ? null : new THREE.Color("#222222");
  }

  public setBackgroundColor(color: string) {
    this.scene.background = new THREE.Color(color);
    if (this.sky) this.sky.visible = false;
  }

  private createShadowReceiver() {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.position.y = 0.001;
    this.scene.add(plane);
  }

  // ------------------------------------------------------
  // PDF FRAME OVERLAY
  // ------------------------------------------------------
  private initFrameOverlay() {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.display = "none";
    el.style.border = "2px dashed rgba(255,255,255,0.9)";
    el.style.pointerEvents = "none";
    el.style.zIndex = "200";
    el.style.left = "50%";
    el.style.top = "50%";
    el.style.transform = "translate(-50%, -50%)";

    const label = document.createElement("div");
    label.innerText = "ÁREA PDF PORTADA";
    label.style.position = "absolute";
    label.style.bottom = "-22px";
    label.style.left = "50%";
    label.style.transform = "translateX(-50%)";
    label.style.fontSize = "11px";
    label.style.fontWeight = "bold";
    label.style.color = "#fff";

    el.appendChild(label);

    if (getComputedStyle(this.container).position === "static") {
      this.container.style.position = "relative";
    }

    this.container.appendChild(el);
    this.frameOverlay = el;
  }

  public setFrameVisible(v: boolean) {
    if (!this.frameOverlay) return;
    this.frameOverlay.style.display = v ? "block" : "none";
    if (v) this.updateFrameDimensions();
  }

  public updateFrameDimensions() {
    if (!this.frameOverlay) return;
    if (this.frameOverlay.style.display === "none") return;

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    const aspectTarget = 170 / 120;
    const aspectScreen = w / h;

    let fw, fh;

    if (aspectScreen > aspectTarget) {
      fh = h * 0.85;
      fw = fh * aspectTarget;
    } else {
      fw = w * 0.85;
      fh = fw / aspectTarget;
    }

    this.frameOverlay.style.width = `${fw}px`;
    this.frameOverlay.style.height = `${fh}px`;
  }

  // ------------------------------------------------------
  // RESIZE & DISPOSE
  // ------------------------------------------------------
  public onWindowResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.perspectiveCamera.aspect = w / h;
    this.perspectiveCamera.updateProjectionMatrix();

    const s = 20;
    const a = w / h;
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
      if (this.renderer.domElement.parentElement) {
        this.container.removeChild(this.renderer.domElement);
      }

      if (this.frameOverlay) {
        this.container.removeChild(this.frameOverlay);
      }
    } catch {}

    this.controls.dispose();
    this.renderer.dispose();
  }
}
// --- END FILE ---
