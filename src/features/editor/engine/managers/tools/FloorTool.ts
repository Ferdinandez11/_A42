// --- FILE: src/features/editor/engine/managers/tools/FloorTool.ts ---
import * as THREE from "three";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import type { FloorItem } from "@/types/editor";

export class FloorTool {
  private scene: THREE.Scene;
  private points: THREE.Vector3[] = [];
  private markers: THREE.Mesh[] = [];
  private previewLine: THREE.Line | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // RESET ----------------------------------------------------------
  public reset() {
    this.markers.forEach((m) => this.scene.remove(m));
    this.markers = [];

    if (this.previewLine) this.scene.remove(this.previewLine);
    this.previewLine = null;

    this.points = [];
  }

  // ADD POINT ------------------------------------------------------
  public addPoint(world: THREE.Vector3) {
    const p = world.clone();
    p.y = 0;

    if (this.points.length > 0 && p.distanceTo(this.points.at(-1)!) < 0.1) return;

    this.points.push(p);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.12),
      new THREE.MeshBasicMaterial({ color: 0xe67e22 })
    );

    marker.position.copy(p);
    this.scene.add(marker);
    this.markers.push(marker);

    if (this.previewLine) this.scene.remove(this.previewLine);

    if (this.points.length > 1) {
      const geo = new THREE.BufferGeometry().setFromPoints(this.points);
      this.previewLine = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0x9b59b6 })
      );
      this.scene.add(this.previewLine);
    }
  }

  // CREATE FLOOR ---------------------------------------------------
  public createFloor() {
    if (this.points.length < 3) return;

    const uuid = THREE.MathUtils.generateUUID();
    const box = new THREE.Box3().setFromPoints(this.points);
    const center = box.getCenter(new THREE.Vector3());

    const local = this.points.map((p) => ({
      x: p.x - center.x,
      z: p.z - center.z,
    }));

    const item: FloorItem = {
      uuid,
      productId: "custom_floor",
      name: "Suelo",
      type: "floor",
      price: 100,
      points: local,
      floorMaterial: "rubber_red",
      position: [center.x, 0, center.z],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };

    useSceneStore.getState().addItem(item);
    this.reset();
  }

  // FINALIZE --------------------------------------------------------
  public finalize() {
    this.createFloor();
  }
}
