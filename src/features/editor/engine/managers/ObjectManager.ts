// --- FILE: src/features/editor/engine/managers/ObjectManager.ts ---
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type {
  SceneItem,
  ModelItem,
  FloorItem,
  FenceItem,
  Vector3Array,
} from "@/types/editor";

import { useSceneStore } from "@/stores/scene/useSceneStore";

export class ObjectManager {
  private scene: THREE.Scene;
  private gltf = new GLTFLoader();

  private cache: Record<string, THREE.Group> = {};

  // === PREVIEW ===
  private previewObject: THREE.Object3D | null = null;
  private previewItem: SceneItem | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // ============================================================
  // MODEL LOADING + CACHE
  // ============================================================
  public async loadModel(url: string): Promise<THREE.Group> {
    if (this.cache[url]) return this.cache[url].clone();

    const gltf = await this.gltf.loadAsync(url);
    this.cache[url] = gltf.scene;

    return gltf.scene.clone();
  }

  // ============================================================
  // SCENE ITEM → OBJECT
  // ============================================================
  public async createFromItem(item: SceneItem): Promise<THREE.Object3D | null> {
    switch (item.type) {
      case "model":
        return this.createModel(item as ModelItem);
      case "floor":
        return this.createFloor(item as FloorItem);
      case "fence":
        return this.createFence(item as FenceItem);
      default:
        return null;
    }
  }

  // ============================================================
  // MODEL
  // ============================================================
  private async createModel(item: ModelItem): Promise<THREE.Object3D | null> {
    if (!item.modelUrl) return null;

    const model = await this.loadModel(item.modelUrl);

    model.uuid = item.uuid;
    model.position.fromArray(item.position as Vector3Array);
    model.rotation.fromArray(item.rotation as Vector3Array);
    model.scale.fromArray(item.scale as Vector3Array);

    model.userData = {
      isItem: true,
      type: "model",
      uuid: item.uuid,
      productId: item.productId,
    };

    this.prepareSafetyZones(model);
    this.scene.add(model);

    return model;
  }

  private prepareSafetyZones(root: THREE.Object3D) {
    const safetyMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    root.traverse((child: any) => {
      if (!child.isMesh) return;

      const name = child.name.toLowerCase();
      const matName = child.material?.name?.toLowerCase?.() ?? "";

      const isSafety =
        name.includes("seguridad") ||
        name.includes("safety") ||
        matName.includes("seguridad") ||
        matName.includes("safety");

      if (isSafety) {
        child.material = safetyMat.clone();
        child.userData.isSafetyZone = true;
      }
    });
  }

  // ============================================================
  // FLOOR
  // ============================================================
  private createFloor(item: FloorItem): THREE.Object3D | null {
    const pts = item.points;
    if (!pts || pts.length < 3) return null;

    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, -pts[0].z);
    pts.forEach((p, i) => i && shape.lineTo(p.x, -p.z));
    shape.lineTo(pts[0].x, -pts[0].z);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: false,
    });

    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x999999,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.uuid = item.uuid;

    mesh.position.fromArray(item.position as Vector3Array);
    mesh.rotation.fromArray(item.rotation as Vector3Array);
    mesh.scale.fromArray(item.scale as Vector3Array);

    mesh.userData = {
      isItem: true,
      type: "floor",
      uuid: item.uuid,
    };

    this.scene.add(mesh);
    return mesh;
  }

  // ============================================================
  // FENCE
  // ============================================================
  private createFence(item: FenceItem): THREE.Object3D | null {
    const group = new THREE.Group();

    group.uuid = item.uuid;
    group.position.fromArray(item.position as Vector3Array);
    group.rotation.fromArray(item.rotation as Vector3Array);
    group.scale.fromArray(item.scale as Vector3Array);

    group.userData = {
      isItem: true,
      type: "fence",
      uuid: item.uuid,
      points: item.points,
      fenceConfig: item.fenceConfig,
      productId: item.productId,
    };

    this.scene.add(group);
    return group;
  }

  // ============================================================
  // PREVIEW HANDLING
  // ============================================================
  public async setPreviewItem(item: SceneItem) {
    if (this.previewObject) {
      this.scene.remove(this.previewObject);
      this.previewObject = null;
    }

    this.previewItem = item;

    const obj = await this.createFromItem({ ...item, uuid: "preview" });
    if (!obj) return;

    obj.traverse((child: any) => {
      if (child.material) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.35;
      }
    });

    this.previewObject = obj;
    this.scene.add(obj);
  }

  public placePreviewAt(point: THREE.Vector3) {
    if (!this.previewObject) return;
    this.previewObject.position.copy(point);
  }

  public confirmPreviewPlacement() {
    if (!this.previewObject || !this.previewItem) return;

    const uuid = THREE.MathUtils.generateUUID();

    const finalItem: SceneItem = {
      ...this.previewItem,
      uuid,
      position: [
        this.previewObject.position.x,
        this.previewObject.position.y,
        this.previewObject.position.z,
      ] as Vector3Array,
    };

    useSceneStore.getState().addItem(finalItem);

    this.scene.remove(this.previewObject);
    this.previewObject = null;
    this.previewItem = null;
  }

  // ============================================================
  // REMOVE ITEM
  // ============================================================
  public removeByUUID(uuid: string) {
    const obj = this.scene.getObjectByProperty("uuid", uuid);
    if (!obj) return;

    this.scene.remove(obj);

    obj.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material))
        child.material.forEach((mat: THREE.Material) => mat.dispose());
      else child.material?.dispose?.();
    });
  }
}
// --- END FILE ---
