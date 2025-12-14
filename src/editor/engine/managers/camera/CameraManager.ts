import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type CameraView = "top" | "front" | "side" | "iso";
export type CameraType = "perspective" | "orthographic";

/**
 * Manages cameras and camera controls
 */
export class CameraManager {
  public perspectiveCamera: THREE.PerspectiveCamera;
  public orthoCamera: THREE.OrthographicCamera;
  public activeCamera: THREE.Camera;
  public controls: OrbitControls;

  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement, renderer: THREE.WebGLRenderer) {
    this.container = container;
    this.renderer = renderer;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

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
   * Handles window resize events for cameras
   */
  public onWindowResize(): void {
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
  }

  /**
   * Cleans up camera resources
   */
  public dispose(): void {
    this.controls.dispose();
  }
}

