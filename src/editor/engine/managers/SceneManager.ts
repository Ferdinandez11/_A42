import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";

export type CameraView = "top" | "front" | "side" | "iso";
export type CameraType = "perspective" | "orthographic";

/**
 * Manages the 3D scene, cameras, lighting, and environment
 */
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

    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    // Initialize perspective camera
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      45,
      aspect,
      0.1,
      10000
    );
    this.perspectiveCamera.position.set(10, 15, 10);

    // Initialize orthographic camera
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

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    container.appendChild(this.renderer.domElement);

    // Initialize orbit controls
    this.controls = new OrbitControls(
      this.activeCamera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;

    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    this.initEnvironment();
    this.initFrameOverlay();

    // Add shadow receiver plane
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

  /**
   * Initializes the PDF frame overlay
   */
  private initFrameOverlay(): void {
    this.frameOverlay = document.createElement("div");

    this.frameOverlay.style.position = "absolute";
    this.frameOverlay.style.border = "2px dashed rgba(255,255,255,0.9)";
    this.frameOverlay.style.boxShadow = "0 0 0 9999px rgba(0,0,0,0.7)";
    this.frameOverlay.style.pointerEvents = "none";
    this.frameOverlay.style.zIndex = "100";
    this.frameOverlay.style.display = "none";
    this.frameOverlay.style.left = "50%";
    this.frameOverlay.style.top = "50%";
    this.frameOverlay.style.transform = "translate(-50%, -50%)";

    const label = document.createElement("div");
    label.innerText = "ÁREA PDF PORTADA";
    label.style.position = "absolute";
    label.style.bottom = "-25px";
    label.style.left = "50%";
    label.style.transform = "translateX(-50%)";
    label.style.color = "white";
    label.style.fontWeight = "bold";
    label.style.fontSize = "12px";

    this.frameOverlay.appendChild(label);

    if (getComputedStyle(this.container).position === "static") {
      this.container.style.position = "relative";
    }

    this.container.appendChild(this.frameOverlay);
  }

  /**
   * Shows or hides the PDF frame overlay
   */
  public setFrameVisible(visible: boolean): void {
    if (this.frameOverlay) {
      this.frameOverlay.style.display = visible ? "block" : "none";
      if (visible) {
        this.updateFrameDimensions();
      }
    }
  }

  /**
   * Updates the PDF frame dimensions based on container size
   */
  public updateFrameDimensions(): void {
    if (!this.frameOverlay || this.frameOverlay.style.display === "none") {
      return;
    }

    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    const targetAspect = 170 / 120;
    const screenAspect = containerWidth / containerHeight;

    let frameWidth: number;
    let frameHeight: number;

    if (screenAspect > targetAspect) {
      frameHeight = containerHeight * 0.85;
      frameWidth = frameHeight * targetAspect;
    } else {
      frameWidth = containerWidth * 0.85;
      frameHeight = frameWidth / targetAspect;
    }

    this.frameOverlay.style.width = `${frameWidth}px`;
    this.frameOverlay.style.height = `${frameHeight}px`;
  }

  /**
   * Initializes scene environment (lights, sky, grid)
   */
  private initEnvironment(): void {
    // Hemisphere light for ambient lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    this.scene.add(hemiLight);

    // Directional light for shadows
    this.dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.dirLight.position.set(50, 80, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;

    const shadowDistance = 50;
    this.dirLight.shadow.camera.left = -shadowDistance;
    this.dirLight.shadow.camera.right = shadowDistance;
    this.dirLight.shadow.camera.top = shadowDistance;
    this.dirLight.shadow.camera.bottom = -shadowDistance;
    this.dirLight.shadow.bias = -0.0001;

    this.scene.add(this.dirLight);

    // Sky dome
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);

    const uniforms = this.sky.material.uniforms;
    uniforms["turbidity"].value = 10;
    uniforms["rayleigh"].value = 3;
    uniforms["mieCoefficient"].value = 0.005;
    uniforms["mieDirectionalG"].value = 0.7;

    this.updateSunPosition(180, 45);
    this.scene.add(this.sky);

    // Grid helper
    this.gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
    this.gridHelper.visible = true;
    this.gridHelper.position.y = 0.002;
    this.scene.add(this.gridHelper);
  }

  /**
   * Updates sun position for sky and directional light
   * @param azimuth - Horizontal angle in degrees (0-360)
   * @param elevation - Vertical angle in degrees (0-90)
   */
  public updateSunPosition(azimuth: number, elevation: number): void {
    if (!this.sky || !this.dirLight) return;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms["sunPosition"].value.copy(sunPosition);
    this.dirLight.position.copy(sunPosition).multiplyScalar(100);
  }

  /**
   * Sets the scene background color
   */
  public setBackgroundColor(color: string): void {
    this.scene.background = new THREE.Color(color);
    if (this.sky) {
      this.sky.visible = false;
    }
  }

  /**
   * Shows or hides the sky dome
   */
  public setSkyVisible(visible: boolean): void {
    if (this.sky) {
      this.sky.visible = visible;
      if (visible) {
        this.scene.background = null;
      }
    }
  }

  /**
   * Shows or hides the grid helper
   */
  public setGridVisible(visible: boolean): void {
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
    }
  }

  /**
   * Switches between perspective and orthographic cameras
   */
  public switchCamera(type: CameraType): void {
    const oldPosition = this.activeCamera.position.clone();
    const target = this.controls.target.clone();

    if (type === "orthographic") {
      this.activeCamera = this.orthoCamera;
      this.orthoCamera.zoom = 1;
      this.orthoCamera.updateProjectionMatrix();
    } else {
      this.activeCamera = this.perspectiveCamera;
    }

    this.activeCamera.position.copy(oldPosition);
    this.activeCamera.lookAt(target);

    this.controls.object = this.activeCamera;
    this.controls.update();
  }

  /**
   * Sets camera to a predefined view
   */
  public setView(view: CameraView): void {
    const distance = 20;
    const target = new THREE.Vector3(0, 0, 0);

    let position = new THREE.Vector3();

    if (view === "top") {
      position.set(0, distance, 0);
    } else if (view === "front") {
      position.set(0, 0, distance);
    } else if (view === "side") {
      position.set(distance, 0, 0);
    } else {
      // Isometric view
      position.set(distance, distance, distance);
    }

    this.activeCamera.position.copy(position);
    this.activeCamera.lookAt(target);

    this.controls.target.copy(target);
    this.controls.update();
  }

  /**
   * Handles window resize events
   */
  public onWindowResize = (): void => {
    if (!this.container) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.perspectiveCamera.aspect = width / height;
    this.perspectiveCamera.updateProjectionMatrix();

    const aspect = width / height;
    const size = 20;
    this.orthoCamera.left = -(size * aspect) / 2;
    this.orthoCamera.right = (size * aspect) / 2;
    this.orthoCamera.top = size / 2;
    this.orthoCamera.bottom = -size / 2;
    this.orthoCamera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    this.updateFrameDimensions();
  };

  /**
   * Cleans up resources
   */
  public dispose(): void {
    try {
      this.container.removeChild(this.renderer.domElement);
      if (this.frameOverlay) {
        this.container.removeChild(this.frameOverlay);
      }
    } catch (error) {
      // Ignore errors if elements were already removed
    }
    this.controls.dispose();
    this.renderer.dispose();
  }
}