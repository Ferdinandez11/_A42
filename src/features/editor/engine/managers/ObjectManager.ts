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
import { FenceTool } from "./tools/FenceTool"; // Importamos la herramienta de vallas

export class ObjectManager {
  private scene: THREE.Scene;
  private gltf = new GLTFLoader();
  private textureLoader = new THREE.TextureLoader(); // Loader para texturas de suelo

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
  // FLOOR (CORREGIDO: Aplica color y textura)
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
    
    // Corregir orientación UV para texturas
    const uvAttribute = geometry.attributes.uv;
    if (uvAttribute) {
       for (let i = 0; i < uvAttribute.count; i++) {
          const u = uvAttribute.getX(i);
          const v = uvAttribute.getY(i);
          // Ajuste simple de mapeo planar
          // Nota: Para extrude geometry, el mapeo UV por defecto es lateral, 
          // a veces requiere recalcular UVs en base a posición X/Z para la cara superior.
       }
    }

    geometry.rotateX(-Math.PI / 2);

    // --- MATERIAL ---
    const material = new THREE.MeshStandardMaterial({
      color: 0x999999, // Gris por defecto
      roughness: 0.8,
    });

    // Asignar color según ID
    if (item.floorMaterial) {
        const matId = item.floorMaterial;
        if (matId === 'rubber_red') material.color.setHex(0xA04040);
        else if (matId === 'rubber_green') material.color.setHex(0x22c55e);
        else if (matId === 'rubber_blue') material.color.setHex(0x3b82f6);
        else if (matId === 'grass') material.color.setHex(0x4ade80);
        else if (matId === 'concrete') material.color.setHex(0x9ca3af);
    }

    // Cargar textura si existe
    if (item.textureUrl) {
        this.textureLoader.load(item.textureUrl, (tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            
            const scale = item.textureScale ?? 1;
            tex.repeat.set(0.5 * scale, 0.5 * scale); 
            tex.rotation = THREE.MathUtils.degToRad(item.textureRotation ?? 0);
            
            material.map = tex;
            material.color.setHex(0xffffff); // Reset color para ver la textura
            material.needsUpdate = true;
        });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.uuid = item.uuid;

    mesh.position.fromArray(item.position as Vector3Array);
    mesh.rotation.fromArray(item.rotation as Vector3Array);
    mesh.scale.fromArray(item.scale as Vector3Array);

    mesh.userData = {
      isItem: true,
      type: "floor",
      uuid: item.uuid,
      // Guardamos estado para detectar cambios en A42Engine
      floorMaterial: item.floorMaterial,
      textureUrl: item.textureUrl,
      points: item.points
    };

    this.scene.add(mesh);
    return mesh;
  }

  // ============================================================
  // FENCE (CORREGIDO: Usa FenceTool para generar geometría)
  // ============================================================
  private createFence(item: FenceItem): THREE.Object3D | null {
    // Usamos el builder estático de la herramienta
    const group = FenceTool.buildFenceMesh(item);

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

    // Hacerlo semitransparente
    obj.traverse((child: any) => {
      if (child.material) {
        // Clonar material para no afectar al original si es cacheado
        if (Array.isArray(child.material)) {
             child.material = child.material.map((m: THREE.Material) => {
                 const cm = m.clone();
                 cm.transparent = true;
                 cm.opacity = 0.5;
                 return cm;
             });
        } else {
             child.material = child.material.clone();
             child.material.transparent = true;
             child.material.opacity = 0.5;
        }
      }
    });

    this.previewObject = obj;
    // Quitamos userData para que no sea seleccionable ni exportable
    this.previewObject.userData = {}; 
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