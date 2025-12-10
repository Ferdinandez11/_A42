import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import type { SceneItem, ModelItem } from "@/types/editor";
import type { Product } from "@/services/catalogService";

type PlaceableProduct = Product & { initialScale?: [number, number, number] };

/**
 * Loads and manages 3D models
 */
export class ModelLoader {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private assetCache: Record<string, THREE.Group> = {};

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
  }

  public async loadModel(url: string): Promise<THREE.Group> {
    if (this.assetCache[url]) {
      return this.assetCache[url].clone();
    }

    const gltf = await this.loader.loadAsync(url);
    this.assetCache[url] = gltf.scene;
    return gltf.scene.clone();
  }

  public async recreateModel(item: SceneItem): Promise<void> {
    if (item.type !== "model" || !item.modelUrl) return;

    try {
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

      this.processSafetyZones(model);
      this.scene.add(model);
    } catch (error) {
      console.error("Error recreating model:", error);
    }
  }

  public async placeObject(
    x: number,
    z: number,
    product: PlaceableProduct,
    afterPlace?: (uuid: string) => void
  ): Promise<void> {
    if (!product.modelUrl) return;

    try {
      const model = await this.loadModel(product.modelUrl);
      model.position.set(x, 0, z);

      const initialScale = product.initialScale
        ? new THREE.Vector3(...product.initialScale)
        : new THREE.Vector3(1, 1, 1);
      model.scale.copy(initialScale);
      model.updateMatrixWorld(true);
      this.adjustObjectToGround(model);

      this.processSafetyZones(model);

      // Animate scale-in
      this.animateScaleIn(model);

      const uuid = THREE.MathUtils.generateUUID();
      model.uuid = uuid;
      model.userData = {
        isItem: true,
        type: "model",
        uuid,
        productId: product.id,
      };

      // Add to scene store
      const newItem: ModelItem = {
        uuid,
        productId: product.id,
        name: product.name,
        price: product.price,
        type: "model",
        modelUrl: product.modelUrl,
        position: [x, model.position.y, z],
        rotation: [0, 0, 0],
        scale: [initialScale.x, initialScale.y, initialScale.z],
        url_tech: product.url_tech,
        url_cert: product.url_cert,
        url_inst: product.url_inst,
        description: product.description,
        data: product,
      };

      useSceneStore.getState().addItem(newItem);

      this.scene.add(model);
      afterPlace?.(uuid);
    } catch (error) {
      console.error("Error placing object:", error);
    }
  }

  public adjustObjectToGround(object: THREE.Object3D): void {
    object.updateMatrixWorld();
    const boundingBox = new THREE.Box3().setFromObject(object);
    object.position.y -= boundingBox.min.y;
  }

  private processSafetyZones(model: THREE.Group): void {
    const editor = useEditorStore.getState();
    const isZonesVisible = editor.safetyZonesVisible;
    const safetyMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const name = mesh.name.toLowerCase();
        const materialName =
          (mesh.material as THREE.Material).name?.toLowerCase() ?? "";

        const isSafetyZone =
          name.includes("zona") ||
          name.includes("seguridad") ||
          name.includes("safety") ||
          materialName.includes("zona") ||
          materialName.includes("seguridad") ||
          materialName.includes("safety");

        if (isSafetyZone) {
          mesh.material = safetyMaterial.clone();
          mesh.visible = isZonesVisible;
          mesh.userData.isSafetyZone = true;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        }
      }
    });
  }

  private animateScaleIn(model: THREE.Group): void {
    const targetScale = model.scale.clone();
    model.scale.set(0, 0, 0);
    let t = 0;
    const animate = (): void => {
      t += 0.05;
      if (t < 1) {
        model.scale.lerpVectors(new THREE.Vector3(0, 0, 0), targetScale, t);
        requestAnimationFrame(animate);
      } else {
        model.scale.copy(targetScale);
      }
    };
    animate();
  }
}