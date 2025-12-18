import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { CameraManager, type CameraView, type CameraType } from "./camera/CameraManager";
import { LightingManager } from "./lighting/LightingManager";
import { EnvironmentManager } from "./environment/EnvironmentManager";

// Re-export types for backward compatibility
export type { CameraView, CameraType };

/**
 * Manages the 3D scene, cameras, lighting, and environment
 * Now uses modular managers: CameraManager, LightingManager, EnvironmentManager
 */
export class SceneManager {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  
  // Managers
  private cameraManager: CameraManager;
  private lightingManager: LightingManager;
  private environmentManager: EnvironmentManager;

  // Public API - delegates to managers for backward compatibility
  public get perspectiveCamera(): THREE.PerspectiveCamera {
    return this.cameraManager.perspectiveCamera;
  }

  public get orthoCamera(): THREE.OrthographicCamera {
    return this.cameraManager.orthoCamera;
  }

  public get activeCamera(): THREE.Camera {
    return this.cameraManager.activeCamera;
  }

  public get controls(): OrbitControls {
    return this.cameraManager.controls;
  }

  public get gridHelper(): THREE.GridHelper | null {
    return this.environmentManager.gridHelper;
  }

  public get dirLight(): THREE.DirectionalLight | null {
    return this.lightingManager.dirLight;
  }

  public get sky(): Sky | null {
    return this.environmentManager.sky;
  }

  private container: HTMLElement;
  private frameOverlay: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      // Needed for WebXR AR: allow transparent clearColor (avoid black background)
      alpha: true,
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

    // Initialize managers
    this.cameraManager = new CameraManager(container, this.renderer);
    this.lightingManager = new LightingManager(this.scene);
    this.environmentManager = new EnvironmentManager(this.scene);

    // Sync sun position between lighting and environment
    this.syncSunPosition();

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
   * Syncs sun position between lighting and environment managers
   */
  private syncSunPosition(): void {
    const sunPosition = this.lightingManager.getSunPosition();
    this.environmentManager.syncSunPosition(sunPosition);
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
   * Updates sun position for sky and directional light
   * @param azimuth - Horizontal angle in degrees (0-360)
   * @param elevation - Vertical angle in degrees (0-90)
   */
  public updateSunPosition(azimuth: number, elevation: number): void {
    this.lightingManager.updateSunPosition(azimuth, elevation);
    // Sync environment sky with lighting sun position
    const sunPosition = this.lightingManager.getSunPosition();
    this.environmentManager.syncSunPosition(sunPosition);
  }

  /**
   * Sets the scene background color
   */
  public setBackgroundColor(color: string): void {
    this.environmentManager.setBackgroundColor(color);
  }

  /**
   * Shows or hides the sky dome
   */
  public setSkyVisible(visible: boolean): void {
    this.environmentManager.setSkyVisible(visible);
  }

  /**
   * Shows or hides the grid helper
   */
  public setGridVisible(visible: boolean): void {
    this.environmentManager.setGridVisible(visible);
  }

  /**
   * Switches between perspective and orthographic cameras
   */
  public switchCamera(type: CameraType): void {
    this.cameraManager.switchCamera(type);
  }

  /**
   * Sets camera to a predefined view
   */
  public setView(view: CameraView): void {
    this.cameraManager.setView(view);
  }

  /**
   * Handles window resize events
   */
  public onWindowResize = (): void => {
    if (!this.container) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.cameraManager.onWindowResize();
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
    this.cameraManager.dispose();
    this.renderer.dispose();
  }
}