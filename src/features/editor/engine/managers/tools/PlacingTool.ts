// --- FILE: src/features/editor/engine/managers/tools/PlacingTool.ts ---
import * as THREE from "three";
import { ObjectManager } from "../ObjectManager";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import type { ProductDefinition } from "@/types/catalog";
import type { ModelItem } from "@/types/editor";

export class PlacingTool {
  private objectManager: ObjectManager;

  // Recibimos la escena pero no la usamos por ahora (por eso no la guardo)
  constructor(_scene: THREE.Scene, objectManager: ObjectManager) {
    this.objectManager = objectManager;
  }

  public async place(point: THREE.Vector3, product: ProductDefinition) {
    if (!product.modelUrl) return;

    const uuid = THREE.MathUtils.generateUUID();

    const item: ModelItem = {
      uuid,
      type: "model",
      productId: product.id,
      name: product.name,
      modelUrl: product.modelUrl,
      price: product.price ?? 0,
      position: [point.x, 0, point.z] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      data: product,
    };

    // SceneStore espera un SceneItem (ModelItem es compatible)
    useSceneStore.getState().addItem(item);

    // Y el ObjectManager crea el Object3D correspondiente
    await this.objectManager.createFromItem(item);
  }
}
