import * as THREE from "three";

/**
 * Manages scene lighting and shadows
 */
export class LightingManager {
  public dirLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initLighting();
  }

  /**
   * Initializes scene lighting
   */
  private initLighting(): void {
    // Hemisphere light for ambient lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    this.scene.add(this.hemiLight);

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
  }

  /**
   * Updates sun position for directional light
   * @param azimuth - Horizontal angle in degrees (0-360)
   * @param elevation - Vertical angle in degrees (0-90)
   */
  public updateSunPosition(azimuth: number, elevation: number): void {
    if (!this.dirLight) return;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);

    this.dirLight.position.copy(sunPosition).multiplyScalar(100);
  }

  /**
   * Gets the current sun position for sky synchronization
   */
  public getSunPosition(): THREE.Vector3 {
    if (!this.dirLight) {
      return new THREE.Vector3(0, 1, 0);
    }
    return this.dirLight.position.clone().normalize();
  }

  /**
   * Sets the directional light intensity
   */
  public setIntensity(intensity: number): void {
    if (this.dirLight) {
      this.dirLight.intensity = intensity;
    }
  }

  /**
   * Sets the hemisphere light intensity
   */
  public setAmbientIntensity(intensity: number): void {
    if (this.hemiLight) {
      this.hemiLight.intensity = intensity;
    }
  }

  /**
   * Enables or disables shadows
   */
  public setShadowsEnabled(enabled: boolean): void {
    if (this.dirLight) {
      this.dirLight.castShadow = enabled;
    }
  }
}

