import * as THREE from "three";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";
import { useFenceStore } from "@/editor/stores/fence/useFenceStore";
import type { FenceItem, FenceConfig as BaseFenceConfig } from "@/domain/types/editor";
import { FENCE_PRESETS } from "@/editor/data/fence_presets";

// Extended fence configuration with all required geometric properties
type FenceConfig = BaseFenceConfig & {
  moduleLength?: number;
  postHeight: number;
  postType?: string;
  postRadius?: number;
  postWidth?: number;
  fixedCount?: number;
  slatWidth: number;
  slatGap?: number;
  slatThickness: number;
  railType?: string;
  railShape?: string;
  railRadius?: number;
  railThickness?: number;
};

/**
 * Tool for creating fences by placing points and generating geometry
 */
export class FenceTool {
  private scene: THREE.Scene;
  private points: THREE.Vector3[] = [];
  private markers: THREE.Mesh[] = [];
  private previewLine: THREE.Line | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Resets the tool state, removing all markers and preview line
   */
  public reset(): void {
    this.markers.forEach((marker) => this.scene.remove(marker));
    this.markers = [];

    if (this.previewLine) {
      this.scene.remove(this.previewLine);
    }
    this.previewLine = null;

    this.points = [];
  }

  /**
   * Adds a point to the fence path
   * @param world - World space position for the new point
   */
  public addPoint(world: THREE.Vector3): void {
    const point = world.clone();
    point.y = 0;

    // Avoid duplicate points that are too close
    if (
      this.points.length > 0 &&
      point.distanceTo(this.points[this.points.length - 1]) < 0.1
    ) {
      return;
    }

    this.points.push(point);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.15),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
    );
    marker.position.copy(point);
    this.scene.add(marker);
    this.markers.push(marker);

    this.updatePreview();
  }

  /**
   * Updates the preview line connecting all points
   */
  private updatePreview(): void {
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
    }

    if (this.points.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
      this.previewLine = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: 0x3b82f6 })
      );
      this.scene.add(this.previewLine);
    }
  }

  /**
   * Finalizes the fence creation
   */
  public finalize(): void {
    this.createFence();
  }

  /**
   * Creates a fence scene item from the current points
   */
  private createFence(): void {
    if (this.points.length < 2) return;

    const storeConfig = useFenceStore.getState().config;
    const uuid = THREE.MathUtils.generateUUID();
    
    const boundingBox = new THREE.Box3().setFromPoints(this.points);
    const center = boundingBox.getCenter(new THREE.Vector3());

    // Convert to local coordinates relative to center
    const localPoints = this.points.map((p) => ({
      x: p.x - center.x,
      z: p.z - center.z,
    }));

    const item: FenceItem = {
      uuid,
      type: "fence",
      productId: "fence_" + storeConfig.presetId,
      name: "Valla",
      price: 100, // Base price, recalculated by PriceCalculator
      points: localPoints,
      fenceConfig: structuredClone(storeConfig),
      position: [center.x, 0, center.z],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };

    useSceneStore.getState().addItem(item);
    this.reset();
  }

  /**
   * Builds the 3D mesh for a fence item
   * @param item - The fence item to build geometry for
   * @returns A Three.js group containing the fence mesh
   */
  public static buildFenceMesh(item: FenceItem): THREE.Group {
    const group = new THREE.Group();

    // Merge preset data with user configuration
    const userConfig = item.fenceConfig;
    const presetData =
      FENCE_PRESETS[userConfig.presetId] || FENCE_PRESETS["wood"];

    const config: FenceConfig = {
      ...presetData,
      ...userConfig,
      colors: {
        ...presetData.defaultColors,
        ...userConfig.colors,
      },
    } as FenceConfig;

    const points = item.points.map((p) => new THREE.Vector3(p.x, 0, p.z));
    if (points.length < 2) return group;

    const postMatrices: THREE.Matrix4[] = [];
    const railMatrices: THREE.Matrix4[] = [];
    const slatMatrices: THREE.Matrix4[] = [];

    const temp = new THREE.Object3D();

    // Generate geometries
    const postGeo = FenceTool.getPostGeometry(config);
    const railGeo = FenceTool.getRailGeometry(config);
    const slatGeo = FenceTool.getSlatGeometry(config);

    const moduleLength = config.moduleLength ?? 2.0;
    const postHeight = config.postHeight || 1.0;

    const topRailY = postHeight - 0.12;
    const bottomRailY = 0.12;

    // Process each segment between points
    for (let i = 0; i < points.length - 1; i++) {
      const pointA = points[i];
      const pointB = points[i + 1];
      const distance = pointA.distanceTo(pointB);

      // Skip if points are too close (avoid NaN)
      if (distance < 0.001) continue;

      const direction = new THREE.Vector3()
        .subVectors(pointB, pointA)
        .normalize();
      const angle = Math.atan2(direction.x, direction.z);

      // Add post at segment start
      FenceTool.pushMatrix(postMatrices, temp, pointA, angle, 1);

      const segmentCount = Math.max(1, Math.ceil(distance / moduleLength));
      const actualModuleLength = distance / segmentCount;

      // Process each module in the segment
      for (let m = 0; m < segmentCount; m++) {
        const t0 = m / segmentCount;
        const t1 = (m + 1) / segmentCount;
        const mid = new THREE.Vector3().lerpVectors(
          pointA,
          pointB,
          (t0 + t1) / 2
        );

        // Add rails
        if (railGeo) {
          FenceTool.pushMatrix(
            railMatrices,
            temp,
            new THREE.Vector3(mid.x, topRailY, mid.z),
            angle,
            actualModuleLength
          );
          FenceTool.pushMatrix(
            railMatrices,
            temp,
            new THREE.Vector3(mid.x, bottomRailY, mid.z),
            angle,
            actualModuleLength
          );
        }

        // Add slats
        const slatWidth = config.slatWidth || 0.1;
        const slatGap = config.slatGap ?? 0.04;

        const maxSlats = Math.max(
          1,
          Math.floor(actualModuleLength / (slatWidth + slatGap))
        );
        const slatCount = config.fixedCount ?? maxSlats;

        const subStart = new THREE.Vector3().lerpVectors(pointA, pointB, t0);
        const subEnd = new THREE.Vector3().lerpVectors(pointA, pointB, t1);

        for (let s = 0; s < slatCount; s++) {
          const slatPosition = new THREE.Vector3().lerpVectors(
            subStart,
            subEnd,
            (s + 0.5) / slatCount
          );

          FenceTool.pushMatrix(
            slatMatrices,
            temp,
            new THREE.Vector3(
              slatPosition.x,
              postHeight * 0.5,
              slatPosition.z
            ),
            angle,
            1
          );
        }
      }
    }

    // Add final post at last point
    const lastPoint = points[points.length - 1];
    FenceTool.pushMatrix(postMatrices, temp, lastPoint, 0, 1);

    // Create instanced meshes
    FenceTool.addInstanced(group, postGeo, postMatrices, config.colors.post);
    if (railGeo) {
      FenceTool.addInstanced(group, railGeo, railMatrices, config.colors.post);
    }
    FenceTool.addInstanced(group, slatGeo, slatMatrices, config.colors.slatA);

    return group;
  }

  /**
   * Creates geometry for fence posts
   */
  private static getPostGeometry(config: FenceConfig): THREE.BufferGeometry {
    const height = config.postHeight || 1.0;

    if (config.postType === "round") {
      const radius = config.postRadius ?? 0.06;
      const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
      geometry.translate(0, height / 2, 0);
      return geometry;
    }

    const width = config.postWidth ?? 0.08;
    const geometry = new THREE.BoxGeometry(width, height, width);
    geometry.translate(0, height / 2, 0);
    return geometry;
  }

  /**
   * Creates geometry for fence rails
   */
  private static getRailGeometry(
    config: FenceConfig
  ): THREE.BufferGeometry | null {
    if (config.railType === "none") return null;

    if (config.railShape === "round") {
      const radius = config.railRadius ?? 0.03;
      const geometry = new THREE.CylinderGeometry(radius, radius, 1, 10);
      geometry.rotateX(Math.PI / 2);
      return geometry;
    }

    const thickness = config.railThickness ?? 0.04;
    return new THREE.BoxGeometry(thickness, thickness, 1);
  }

  /**
   * Creates geometry for fence slats
   */
  private static getSlatGeometry(config: FenceConfig): THREE.BufferGeometry {
    const thickness = config.slatThickness || 0.02;
    const height = (config.postHeight || 1.0) * 0.7;
    const width = config.slatWidth || 0.1;

    return new THREE.BoxGeometry(thickness, height, width);
  }

  /**
   * Adds a transformation matrix to the list
   */
  private static pushMatrix(
    list: THREE.Matrix4[],
    temp: THREE.Object3D,
    position: THREE.Vector3,
    angle: number,
    length: number
  ): void {
    // Protect against NaN values
    if (
      isNaN(position.x) ||
      isNaN(position.y) ||
      isNaN(position.z) ||
      isNaN(length)
    ) {
      return;
    }

    temp.position.copy(position);
    temp.rotation.set(0, angle, 0);
    temp.scale.set(1, 1, length);
    temp.updateMatrix();
    list.push(temp.matrix.clone());
  }

  /**
   * Creates an instanced mesh and adds it to the group
   */
  private static addInstanced(
    group: THREE.Group,
    geometry: THREE.BufferGeometry | null,
    matrices: THREE.Matrix4[],
    color: number
  ): void {
    if (!geometry || matrices.length === 0) return;

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.1,
    });
    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      matrices.length
    );

    matrices.forEach((matrix, i) => instancedMesh.setMatrixAt(i, matrix));
    instancedMesh.instanceMatrix.needsUpdate = true;

    group.add(instancedMesh);
  }
}