import * as THREE from "three";
import type { A42Engine } from "../../A42Engine";

/**
 * Handles camera positioning and image capture for PDF
 */
export class PDFRenderer {
  private engine: A42Engine;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  public resizeRenderer(width: number, height: number): void {
    this.engine.renderer.setSize(width, height);
    if (this.engine.activeCamera instanceof THREE.PerspectiveCamera) {
      this.engine.activeCamera.aspect = width / height;
      this.engine.activeCamera.updateProjectionMatrix();
    }
  }

  public takeScreenshot(format: string = "image/jpeg"): string {
    return this.engine.renderer.domElement.toDataURL(format, 0.9);
  }

  public fitCameraToSingleObject(obj: THREE.Object3D, sceneController: any): void {
    const box = sceneController.getObjectBoundingBox(obj);
    if (box.isEmpty()) return;
    this.positionCameraFromBox(box, 1.2);
  }

  public fitCameraToScene(margin: number = 1.2, sceneController: any): void {
    const box = sceneController.getSceneBoundingBox();
    if (box.isEmpty()) return;
    this.positionCameraFromBox(box, margin);
  }

  public positionCameraFromBox(box: THREE.Box3, margin: number): void {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (this.engine.activeCamera instanceof THREE.PerspectiveCamera) {
      const fov = (this.engine.activeCamera.fov * Math.PI) / 180;
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * margin;
      const aspect = this.engine.activeCamera.aspect;
      if (aspect < 1) cameraZ = cameraZ / aspect;

      const direction = new THREE.Vector3(1, 0.5, 1).normalize();
      const newPosition = direction.multiplyScalar(cameraZ).add(center);
      this.engine.activeCamera.position.copy(newPosition);
      this.engine.activeCamera.lookAt(center);
    }
  }

  public setupOrthographicViews(sceneBox: THREE.Box3): void {
    const size = sceneBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const orthoSize = maxDim * 0.7;
    
    const cam = this.engine.sceneManager.orthoCamera;
    cam.zoom = 1;
    cam.left = -orthoSize;
    cam.right = orthoSize;
    cam.top = orthoSize;
    cam.bottom = -orthoSize;
    cam.updateProjectionMatrix();
  }

  public captureView(center: THREE.Vector3, pos: number[], up: number[]): string {
    const cam = this.engine.sceneManager.orthoCamera;
    cam.position.set(center.x + pos[0], center.y + pos[1], center.z + pos[2]);
    cam.up.set(up[0], up[1], up[2]);
    cam.lookAt(center);
    cam.updateProjectionMatrix();
    this.engine.renderer.render(this.engine.scene, cam);
    return this.takeScreenshot("image/jpeg");
  }
}