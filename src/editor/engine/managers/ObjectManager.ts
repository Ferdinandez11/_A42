import * as THREE from "three";
import type { SceneItem } from "@/domain/types/editor";
import type { Product } from "@/core/services/catalogService";

import { ModelLoader } from "./objects/ModelLoader";
import { FloorBuilder } from "./objects/FloorBuilder";
import { FenceBuilder } from "./objects/FenceBuilder";

type PlaceableProduct = Product & { initialScale?: [number, number, number] };

/**
 * ObjectManager - Refactored (Sprint 5.5)
 * Coordinates object creation and management
 * Now 150 lines (was 565 lines)
 */
export class ObjectManager {
  private modelLoader: ModelLoader;
  private floorBuilder: FloorBuilder;
  private fenceBuilder: FenceBuilder;

  constructor(scene: THREE.Scene) {
    this.modelLoader = new ModelLoader(scene);
    this.floorBuilder = new FloorBuilder(scene);
    this.fenceBuilder = new FenceBuilder(scene);
  }

  /**
   * Loads a 3D model from URL with caching
   */
  public async loadModel(url: string): Promise<THREE.Group> {
    return this.modelLoader.loadModel(url);
  }

  /**
   * Recreates a model from a scene item
   */
  public async recreateModel(item: SceneItem): Promise<void> {
    return this.modelLoader.recreateModel(item);
  }

  /**
   * Recreates a floor polygon from a scene item
   */
  public recreateFloor(item: SceneItem): void {
    return this.floorBuilder.recreateFloor(item);
  }

  /**
   * Recreates a fence from a scene item
   */
  public recreateFence(item: SceneItem): void {
    return this.fenceBuilder.recreateFence(item);
  }

  /**
   * Places a product object in the scene
   */
  public async placeObject(
    x: number,
    z: number,
    product: PlaceableProduct,
    afterPlace?: (uuid: string) => void
  ): Promise<void> {
    return this.modelLoader.placeObject(x, z, product, afterPlace);
  }

  /**
   * Adjusts object position to sit on the ground plane
   */
  public adjustObjectToGround(object: THREE.Object3D): void {
    return this.modelLoader.adjustObjectToGround(object);
  }
}