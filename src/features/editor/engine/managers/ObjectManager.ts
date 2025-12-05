// --- FILE: src/features/editor/engine/managers/ObjectManager.ts ---
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type {
  SceneItem,
  ModelItem,
  FloorItem,
  FenceItem,
} from "@/types/editor";

export class ObjectManager {
  private scene: THREE.Scene;
  private gltf = new GLTFLoader();
  private textures = new THREE.TextureLoader();

  private cache: Record<string, THREE.Group> = {};

  // PREVIEW SYSTEM
  private previewMesh: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // ============================================================================
  // MODEL LOADING
  // ============================================================================
  public async loadModel(url: string): Promise<THREE.Group> {
    if (this.cache[url]) return this.cache[url].clone();

    const gltf = await this.gltf.loadAsync(url);
    this.cache[url] = gltf.scene;

    return gltf.scene.clone();
  }

  // ============================================================================
  // CREATE OBJECT FROM SceneItem
  // ============================================================================
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

  // ============================================================================
  // CREATE FROM PRODUCT (solo para placement preview)
  // ============================================================================
  public async createFromProduct(product: any): Promise<THREE.Object3D> {
    if (!product.modelUrl) {
      console.warn("Producto sin modelUrl:", product);
      return new THREE.Group();
    }

    const model = await this.loadModel(product.modelUrl);
    model.position.set(0, 0, 0);

    model.userData = {
      isItem: false, // No es un item real aún
      productId: product.productId ?? product.id,
      type: "model",
    };

    return model;
  }

  // ============================================================================
  // MODEL
  // ============================================================================
  private async createModel(item: ModelItem): Promise<THREE.Object3D | null> {
    if (!item.modelUrl) return null;

    const model = await this.loadModel(item.modelUrl);

    model.uuid = item.uuid;
    model.position.fromArray(item.position);
    model.rotation.fromArray(item.rotation);
    model.scale.fromArray(item.scale);

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

  // Detecta zonas de seguridad
  private prepareSafetyZones(root: THREE.Object3D) {
    const safetyMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    root.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;

      const mesh = child as THREE.Mesh;
      const name = mesh.name.toLowerCase();
      const matName =
        (mesh.material as THREE.Material).name?.toLowerCase() ?? "";

      const isSafety =
        name.includes("safety") ||
        name.includes("seguridad") ||
        matName.includes("safety");

      if (isSafety) {
        mesh.material = safetyMat.clone();
        mesh.userData.isSafetyZone = true;
      }
    });
  }

  // ============================================================================
  // FLOOR
  // ============================================================================
  private createFloor(item: FloorItem): THREE.Object3D | null {
    if (!item.points || item.points.length < 3) return null;

    // SHAPE
    const shape = new THREE.Shape();
    shape.moveTo(item.points[0].x, -item.points[0].z);

    for (let i = 1; i < item.points.length; i++) {
      shape.lineTo(item.points[i].x, -item.points[i].z);
    }
    shape.lineTo(item.points[0].x, -item.points[0].z);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: false,
    });

    geometry.rotateX(-Math.PI / 2);

    // UV Mapping
    const scale = item.textureScale ?? 1;
    const rot = THREE.MathUtils.degToRad(item.textureRotation ?? 0);

    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      const u = (x * Math.cos(rot) - z * Math.sin(rot)) / scale;
      const v = (x * Math.sin(rot) + z * Math.cos(rot)) / scale;

      uv.setXY(i, u, v);
    }

    let material: THREE.Material;

    if (item.textureUrl) {
      const tex = this.textures.load(item.textureUrl);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

      material = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: 0x999999,
        roughness: 1,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);

    mesh.uuid = item.uuid;
    mesh.position.fromArray(item.position);
    mesh.rotation.fromArray(item.rotation);
    mesh.scale.fromArray(item.scale);

    mesh.userData = {
      isItem: true,
      type: "floor",
      uuid: item.uuid,
      points: item.points,
      textureUrl: item.textureUrl,
      textureScale: item.textureScale,
      textureRotation: item.textureRotation,
    };

    this.scene.add(mesh);
    return mesh;
  }

  // ============================================================================
  // FENCE (placeholder)
  // ============================================================================
  private createFence(item: FenceItem): THREE.Object3D | null {
    if (!item.points || !item.fenceConfig) return null;

    const group = new THREE.Group();

    group.uuid = item.uuid;
    group.position.fromArray(item.position);
    group.rotation.fromArray(item.rotation);
    group.scale.fromArray(item.scale);

    group.userData = {
      isItem: true,
      type: "fence",
      uuid: item.uuid,
      points: item.points,
      fenceConfig: item.fenceConfig,
    };

    this.scene.add(group);
    return group;
  }

  // ============================================================================
  // PREVIEW SYSTEM
  // ============================================================================
  public async createPreviewFromProduct(product: any) {
    this.clearPreview();

    const base = await this.createFromProduct(product);

    base.traverse((c: any) => {
      if (c.material) {
        c.material = c.material.clone();
        c.material.transparent = true;
        c.material.opacity = 0.55;
      }
      c.castShadow = false;
      c.receiveShadow = false;
    });

    this.previewMesh = base;
    this.scene.add(base);
  }

  public placePreviewAt(worldPos: THREE.Vector3) {
    if (!this.previewMesh) return;

    this.previewMesh.position.copy(worldPos);
    this.previewMesh.position.y = 0;
  }

  public async confirmPreviewPlacement(item: SceneItem) {
    if (!this.previewMesh) return;

    // Convert preview → real object
    this.previewMesh.traverse((c: any) => {
      if (c.material) {
        c.material.opacity = 1;
        c.material.transparent = false;
      }
    });

    await this.createFromItem(item);
    this.clearPreview();
  }

  public clearPreview() {
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh = null;
    }
  }

  // ============================================================================
  // REMOVE OBJECT
  // ============================================================================
  public removeByUUID(uuid: string) {
    const obj = this.scene.getObjectByProperty("uuid", uuid);
    if (!obj) return;

    this.scene.remove(obj);

    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) mesh.geometry.dispose();

      const mat = mesh.material;
      if (mat) {
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }

  // ============================================================================
  // UTIL
  // ============================================================================
  public adjustObjectToGround(obj: THREE.Object3D) {
    obj.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(obj);
    obj.position.y -= box.min.y;
  }
}

// --- END FILE ---
