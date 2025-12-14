import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";

/**
 * Manages scene environment (sky, grid, background)
 */
export class EnvironmentManager {
  public sky: Sky | null = null;
  public gridHelper: THREE.GridHelper | null = null;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initEnvironment();
  }

  /**
   * Initializes environment elements
   */
  private initEnvironment(): void {
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
   * Updates sun position for sky
   * @param azimuth - Horizontal angle in degrees (0-360)
   * @param elevation - Vertical angle in degrees (0-90)
   */
  public updateSunPosition(azimuth: number, elevation: number): void {
    if (!this.sky) return;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms["sunPosition"].value.copy(sunPosition);
  }

  /**
   * Syncs sky sun position with lighting manager sun position
   * @param sunPosition - Normalized sun position vector
   */
  public syncSunPosition(sunPosition: THREE.Vector3): void {
    if (!this.sky) return;
    // Copy the normalized position directly
    this.sky.material.uniforms["sunPosition"].value.copy(sunPosition);
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
   * Sets sky parameters
   */
  public setSkyParameters(params: {
    turbidity?: number;
    rayleigh?: number;
    mieCoefficient?: number;
    mieDirectionalG?: number;
  }): void {
    if (!this.sky) return;

    const uniforms = this.sky.material.uniforms;
    if (params.turbidity !== undefined) {
      uniforms["turbidity"].value = params.turbidity;
    }
    if (params.rayleigh !== undefined) {
      uniforms["rayleigh"].value = params.rayleigh;
    }
    if (params.mieCoefficient !== undefined) {
      uniforms["mieCoefficient"].value = params.mieCoefficient;
    }
    if (params.mieDirectionalG !== undefined) {
      uniforms["mieDirectionalG"].value = params.mieDirectionalG;
    }
  }
}

