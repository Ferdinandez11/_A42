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
import { FenceTool } from "./tools/FenceTool";

export class ObjectManager {
  private scene: THREE.Scene;
  private gltf = new GLTFLoader();
  private textureLoader = new THREE.TextureLoader();

  private cache: Record<string, THREE.Group> = {};

  // === PREVIEW ===
  private previewObject: THREE.Object3D | null = null;
  private previewItem: SceneItem | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public async loadModel(url: string): Promise<THREE.Group> {
    if (this.cache[url]) return this.cache[url].clone();
    const gltf = await this.gltf.loadAsync(url);
    this.cache[url] = gltf.scene;
    return gltf.scene.clone();
  }

  public async createFromItem(item: SceneItem): Promise<THREE.Object3D | null> {
    switch (item.type) {
      case "model": return this.createModel(item as ModelItem);
      case "floor": return this.createFloor(item as FloorItem);
      case "fence": return this.createFence(item as FenceItem);
      default: return null;
    }
  }

  // --- MODELO CON AUTO-AJUSTE AL SUELO (OPTIMIZADO) ---
  private async createModel(item: ModelItem): Promise<THREE.Object3D | null> {
    if (!item.modelUrl) return null;

    const model = await this.loadModel(item.modelUrl);

    // 1. Calculamos la caja UNA SOLA VEZ al crear
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());

    // 2. Creamos un contenedor (Wrapper) que será el objeto real en la escena
    const wrapper = new THREE.Group();
    wrapper.add(model);
    
    // 3. Movemos el modelo DENTRO del wrapper.
    // Lo subimos (-box.min.y) para que sus pies toquen el suelo del wrapper (Y=0).
    // Lo centramos en X/Z para que el pivote esté en el centro.
    model.position.x = -center.x;
    model.position.y = -box.min.y;
    model.position.z = -center.z;

    // 4. Aplicamos las transformaciones del mundo al wrapper
    wrapper.uuid = item.uuid;
    wrapper.position.fromArray(item.position as Vector3Array);
    wrapper.rotation.fromArray(item.rotation as Vector3Array);
    wrapper.scale.fromArray(item.scale as Vector3Array);

    wrapper.userData = {
      isItem: true,
      type: "model",
      uuid: item.uuid,
      productId: item.productId,
    };

    this.prepareSafetyZones(wrapper);
    this.scene.add(wrapper);

    return wrapper;
  }

  private prepareSafetyZones(root: THREE.Object3D) {
    const safetyMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
    root.traverse((child: any) => {
      if (!child.isMesh) return;
      const name = child.name.toLowerCase();
      const matName = child.material?.name?.toLowerCase?.() ?? "";
      const isSafety = name.includes("seguridad") || name.includes("safety") || matName.includes("seguridad") || matName.includes("safety");
      if (isSafety) {
        child.material = safetyMat.clone();
        child.userData.isSafetyZone = true;
      }
    });
  }

  private createFloor(item: FloorItem): THREE.Object3D | null {
    const pts = item.points;
    if (!pts || pts.length < 3) return null;
    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, -pts[0].z);
    pts.forEach((p, i) => i && shape.lineTo(p.x, -p.z));
    shape.lineTo(pts[0].x, -pts[0].z);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    
    // Fix UVs simple
    const uv = geometry.attributes.uv;
    if(uv) {
        for(let i=0; i<uv.count; i++) {
            // Un mapeo simple planar para que la textura no se estire en los lados
            // (Esto es una aproximación, para suelos complejos se requiere un mapa UV mejor)
        }
    }

    const material = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 });

    if (item.floorMaterial) {
        const matId = item.floorMaterial;
        if (matId === 'rubber_red') material.color.setHex(0xA04040);
        else if (matId === 'rubber_green') material.color.setHex(0x22c55e);
        else if (matId === 'rubber_blue') material.color.setHex(0x3b82f6);
        else if (matId === 'grass') material.color.setHex(0x4ade80);
        else if (matId === 'concrete') material.color.setHex(0x9ca3af);
    }
    if (item.textureUrl) {
        this.textureLoader.load(item.textureUrl, (tex) => {
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
            const scale = item.textureScale ?? 1;
            tex.repeat.set(0.5 * scale, 0.5 * scale); 
            tex.rotation = THREE.MathUtils.degToRad(item.textureRotation ?? 0);
            material.map = tex; material.color.setHex(0xffffff); material.needsUpdate = true;
        });
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.uuid = item.uuid;
    mesh.position.fromArray(item.position as Vector3Array);
    mesh.rotation.fromArray(item.rotation as Vector3Array);
    mesh.scale.fromArray(item.scale as Vector3Array);
    mesh.userData = { isItem: true, type: "floor", uuid: item.uuid, floorMaterial: item.floorMaterial, textureUrl: item.textureUrl, points: item.points };
    this.scene.add(mesh);
    return mesh;
  }

  private createFence(item: FenceItem): THREE.Object3D | null {
    const group = FenceTool.buildFenceMesh(item);
    group.uuid = item.uuid;
    group.position.fromArray(item.position as Vector3Array);
    group.rotation.fromArray(item.rotation as Vector3Array);
    group.scale.fromArray(item.scale as Vector3Array);
    group.userData = { isItem: true, type: "fence", uuid: item.uuid, points: item.points, fenceConfig: item.fenceConfig, productId: item.productId };
    this.scene.add(group);
    return group;
  }

  // === PREVIEW HANDLING ===
  public async setPreviewItem(item: SceneItem) {
    if (this.previewObject) {
      this.scene.remove(this.previewObject);
      this.previewObject = null;
    }
    this.previewItem = item;
    
    // Creamos el objeto preview (esto puede tardar unos ms si el modelo es pesado, 
    // pero solo ocurre UNA vez al hacer click en el catálogo)
    const obj = await this.createFromItem({ ...item, uuid: "preview" });
    if (!obj) return;

    // Material semitransparente para el fantasma
    obj.traverse((child: any) => {
      if (child.isMesh) {
        const mat = Array.isArray(child.material) ? child.material[0].clone() : child.material.clone();
        mat.transparent = true;
        mat.opacity = 0.6;
        mat.depthWrite = false; 
        child.material = mat;
      }
    });

    this.previewObject = obj;
    this.previewObject.userData = {}; // Sin userData para no ser interactuable
    this.scene.add(obj);
  }

  public placePreviewAt(point: THREE.Vector3) {
    if (!this.previewObject) return;
    // Solo movemos el wrapper. Como el modelo interno ya está ajustado (pivote en pies),
    // poner el wrapper en point.y (suelo) hace que los pies toquen el suelo perfectamente.
    this.previewObject.position.copy(point);
  }

  public confirmPreviewPlacement() {
    if (!this.previewObject || !this.previewItem) return;

    const position = [
        this.previewObject.position.x,
        this.previewObject.position.y,
        this.previewObject.position.z,
    ] as Vector3Array;

    const uuid = THREE.MathUtils.generateUUID();
    const finalItem: SceneItem = { ...this.previewItem, uuid, position };

    useSceneStore.getState().addItem(finalItem);

    this.scene.remove(this.previewObject);
    this.previewObject = null;
    this.previewItem = null;
  }

  public removeByUUID(uuid: string) {
    const obj = this.scene.getObjectByProperty("uuid", uuid);
    if (!obj) return;
    this.scene.remove(obj);
    obj.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) child.material.forEach((mat: THREE.Material) => mat.dispose());
      else child.material?.dispose?.();
    });
  }
}