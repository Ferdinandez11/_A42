// --- FILE: src/features/editor/engine/managers/SceneManager.ts ---
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { useEditorStore } from "@/stores/editor/useEditorStore";

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

  public interactionPlane: THREE.Mesh;

  private container: HTMLElement;
  private frameOverlay: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // === SCENE ===
    this.scene = new THREE.Scene();
    this.scene.background = null; 

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
    this.dirLight = this.sun;
    this.sky = this.createSky(); // Crear cielo
    this.grid = this.createGrid();
    this.createShadowReceiver();

    // === INTERACTION PLANE ===
    this.interactionPlane = this.createInteractionPlane();

    // === FRAME OVERLAY ===
    this.initFrameOverlay();

    // === SYNC ===
    this.setupEditorStoreSync();
    
    // Forzar actualización inicial del sol para que el cielo se pinte AZUL y no negro
    const initialSun = useEditorStore.getState().sunPosition;
    this.updateSunPosition(initialSun.azimuth, initialSun.elevation);
  }

  // ------------------------------------------------------
  // SYNC CON useEditorStore
  // ------------------------------------------------------
  private setupEditorStoreSync() {
    let currentBg = useEditorStore.getState().backgroundColor;
    let currentSun = useEditorStore.getState().sunPosition;

    // Aplicamos estado inicial
    this.setBackgroundColor(currentBg);
    this.setGridVisible(useEditorStore.getState().gridVisible);

    useEditorStore.subscribe((state) => {
      // 1. FONDO
      if (state.backgroundColor !== currentBg) {
        currentBg = state.backgroundColor;
        this.setBackgroundColor(currentBg);
      }

      // 2. GRID
      this.setGridVisible(state.gridVisible);

      // 3. SOL
      if (
        state.sunPosition.azimuth !== currentSun.azimuth ||
        state.sunPosition.elevation !== currentSun.elevation
      ) {
        currentSun = state.sunPosition;
        this.updateSunPosition(currentSun.azimuth, currentSun.elevation);
      }
    });
  }

  // ------------------------------------------------------
  // RENDERER & CAMERAS
  // ------------------------------------------------------
  private createRenderer(container: HTMLElement) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8; // Un poco menos expuesto para que el cielo se vea mejor
    container.appendChild(renderer.domElement);
    return renderer;
  }

  private createPerspectiveCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const cam = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
    cam.position.set(12, 10, 12);
    return cam;
  }

  private createOrthoCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const s = 20;
    const cam = new THREE.OrthographicCamera(-(s * aspect) / 2, (s * aspect) / 2, s / 2, -s / 2, -500, 500);
    cam.position.set(20, 20, 20);
    cam.lookAt(0, 0, 0);
    return cam;
  }

  public switchCamera(type: "perspective" | "orthographic") {
    const oldPos = this.activeCamera.position.clone();
    const target = this.controls.target.clone();
    this.activeCamera = type === "perspective" ? this.perspectiveCamera : this.orthoCamera;
    this.activeCamera.position.copy(oldPos);
    this.activeCamera.lookAt(target);
    this.controls.object = this.activeCamera;
    this.controls.update();
  }

  public setView(view: CameraView) {
    const d = 22;
    const target = new THREE.Vector3(0, 0, 0);
    const pos = view === "top" ? new THREE.Vector3(0, d, 0) : view === "front" ? new THREE.Vector3(0, 0, d) : view === "side" ? new THREE.Vector3(d, 0, 0) : new THREE.Vector3(d, d, d);
    this.activeCamera.position.copy(pos);
    this.activeCamera.lookAt(target);
    this.controls.target.copy(target);
    this.controls.update();
  }

  private createControls() {
    const c = new OrbitControls(this.activeCamera, this.renderer.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.04;
    c.minDistance = 1;
    c.maxDistance = 500;
    c.screenSpacePanning = true;
    c.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    return c;
  }

  // ------------------------------------------------------
  // ENVIRONMENT (SOL Y CIELO)
  // ------------------------------------------------------
  private createSun() {
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
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
    
    // Parámetros ajustados para un día azul claro
    const u = sky.material.uniforms;
    u["turbidity"].value = 0.6;  // Menos turbidez = más claro
    u["rayleigh"].value = 0.5;   // Dispersión baja = azul más puro
    u["mieCoefficient"].value = 0.005;
    u["mieDirectionalG"].value = 0.8;

    this.scene.add(sky);
    return sky;
  }

  public updateSunPosition(azimuth: number, elevation: number) {
    // Calculamos posición esférica
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);

    // 1. Mover la LUZ (para las sombras)
    if (this.dirLight) {
        this.dirLight.position.set(x * 100, y * 100, z * 100);
        this.dirLight.target.position.set(0, 0, 0);
        this.dirLight.target.updateMatrixWorld();
    }

    // 2. Mover el SOL DEL CIELO (Esto es lo que faltaba para que no fuera negro)
    if (this.sky) {
        // El shader del cielo necesita el vector del sol en sus uniforms
        this.sky.material.uniforms['sunPosition'].value.set(x, y, z);
    }
  }

  // ------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------
  private createGrid() {
    const grid = new THREE.GridHelper(200, 200, 0x888888, 0x444444);
    grid.position.y = 0.005;
    this.scene.add(grid);
    return grid;
  }

  public setGridVisible(v: boolean) {
    if(this.grid) this.grid.visible = v;
  }

  public setSkyVisible(v: boolean) {
    if (!this.sky) return;
    this.sky.visible = v;
  }

  public setBackgroundColor(color: string) {
    if (color === '#111111') {
        this.setSkyVisible(true);
        this.scene.background = null; 
    } else {
        this.setSkyVisible(false);
        this.scene.background = new THREE.Color(color);
    }
  }

  private createInteractionPlane() {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshBasicMaterial({ visible: false }));
    plane.rotation.x = -Math.PI / 2;
    plane.userData.isInteractionPlane = true;
    this.scene.add(plane);
    return plane;
  }

  public raycastWorldPoint(raycaster: THREE.Raycaster): THREE.Vector3 | null {
    const hit = raycaster.intersectObject(this.interactionPlane, false);
    return hit.length ? hit[0].point : null;
  }

  private createShadowReceiver() {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.3 }));
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.position.y = 0.001;
    this.scene.add(plane);
  }

  private initFrameOverlay() {
    const el = document.createElement("div");
    Object.assign(el.style, { position: "absolute", display: "none", border: "2px dashed rgba(255,255,255,0.9)", pointerEvents: "none", zIndex: "200", left: "50%", top: "50%", transform: "translate(-50%, -50%)" });
    if (getComputedStyle(this.container).position === "static") this.container.style.position = "relative";
    this.container.appendChild(el);
    this.frameOverlay = el;
  }

  public setFrameVisible(v: boolean) {
    if (!this.frameOverlay) return;
    this.frameOverlay.style.display = v ? "block" : "none";
    if (v) this.updateFrameDimensions();
  }

  public updateFrameDimensions() {
    if (!this.frameOverlay || this.frameOverlay.style.display === "none") return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const aspectTarget = 170 / 120;
    const aspectScreen = w / h;
    let fw, fh;
    if (aspectScreen > aspectTarget) { fh = h * 0.85; fw = fh * aspectTarget; } 
    else { fw = w * 0.85; fh = fw / aspectTarget; }
    this.frameOverlay.style.width = `${fw}px`;
    this.frameOverlay.style.height = `${fh}px`;
  }

  public onWindowResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.perspectiveCamera.aspect = w / h;
    this.perspectiveCamera.updateProjectionMatrix();
    const s = 20; const a = w / h;
    this.orthoCamera.left = -(s * a) / 2; this.orthoCamera.right = (s * a) / 2;
    this.orthoCamera.top = s / 2; this.orthoCamera.bottom = -s / 2;
    this.orthoCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.updateFrameDimensions();
  };

  public dispose() {
    try {
      if (this.renderer.domElement.parentElement) this.container.removeChild(this.renderer.domElement);
      if (this.frameOverlay) this.container.removeChild(this.frameOverlay);
    } catch {}
    this.controls.dispose();
    this.renderer.dispose();
  }
}