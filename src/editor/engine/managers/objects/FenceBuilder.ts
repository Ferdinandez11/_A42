import * as THREE from "three";
import { FENCE_PRESETS } from "@/editor/data/fence_presets";
import type { SceneItem, FenceConfig } from "@/domain/types/editor";

/**
 * Builds fence meshes from points and configurations
 */
export class FenceBuilder {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public recreateFence(item: SceneItem): void {
    if (item.type !== "fence" || !item.points || !item.fenceConfig) return;

    const points = item.points.map((p) => new THREE.Vector3(p.x, 0, p.z));
    const fence = this.createFenceObject(points, item.fenceConfig);
    if (!fence) return;

    fence.uuid = item.uuid;
    fence.position.fromArray(item.position || [0, 0, 0]);
    fence.rotation.fromArray(item.rotation || [0, 0, 0]);
    fence.scale.fromArray(item.scale || [1, 1, 1]);

    fence.userData = {
      isItem: true,
      type: "fence",
      uuid: item.uuid,
      productId: item.productId,
      points: item.points,
      fenceConfig: item.fenceConfig,
    };

    this.scene.add(fence);
  }

  public createFenceObject(
    points: THREE.Vector3[],
    config: FenceConfig
  ): THREE.Group | null {
    if (!points || points.length < 2) return null;

    const preset = FENCE_PRESETS[config.presetId] || FENCE_PRESETS["wood"];
    const colors = config.colors;
    const parts: Record<
      string,
      { geo: THREE.BufferGeometry; matrices: THREE.Matrix4[]; colors: number[] }
    > = {};
    const temp = new THREE.Object3D();

    const addPart = (
      key: string,
      geo: THREE.BufferGeometry,
      pos: THREE.Vector3,
      rot: THREE.Euler,
      scl: THREE.Vector3,
      colorHex: number
    ): void => {
      if (!parts[key]) parts[key] = { geo, matrices: [], colors: [] };
      temp.position.copy(pos);
      temp.rotation.copy(rot);
      temp.scale.copy(scl);
      temp.updateMatrix();
      parts[key].matrices.push(temp.matrix.clone());
      parts[key].colors.push(colorHex);
    };

    // Create geometries
    const postGeo = this.createPostGeometry(preset);
    const railGeo = this.createRailGeometry(preset);
    const slatGeo = new THREE.BoxGeometry(
      preset.slatThickness,
      1,
      preset.slatWidth
    );

    const topRailY = preset.postHeight - 0.12;
    const bottomRailY = 0.12;
    const slatHeight = topRailY - bottomRailY - 0.08;
    const slatCenterY = (topRailY + bottomRailY) * 0.5;
    const slatColorList = [
      colors.slatA,
      colors.slatB ?? colors.slatA,
      colors.slatC ?? colors.slatA,
    ];

    // Generate fence segments
    for (let i = 0; i < points.length - 1; i++) {
      this.generateFenceSegment(
        points[i],
        points[i + 1],
        preset,
        colors,
        postGeo,
        railGeo,
        slatGeo,
        topRailY,
        bottomRailY,
        slatHeight,
        slatCenterY,
        slatColorList,
        addPart
      );
    }

    // Add final post
    const lastPoint = points[points.length - 1];
    addPart(
      "post",
      postGeo,
      lastPoint,
      new THREE.Euler(0, 0, 0),
      new THREE.Vector3(1, 1, 1),
      colors.post
    );

    // Create instanced meshes
    return this.createInstancedGroup(parts);
  }

  private createPostGeometry(preset: any): THREE.BufferGeometry {
    let geo: THREE.BufferGeometry;
    if (preset.postType === "round") {
      geo = new THREE.CylinderGeometry(
        preset.postRadius!,
        preset.postRadius!,
        preset.postHeight,
        16
      );
      geo.translate(0, preset.postHeight / 2, 0);
    } else {
      geo = new THREE.BoxGeometry(
        preset.postWidth!,
        preset.postHeight,
        preset.postWidth!
      );
      geo.translate(0, preset.postHeight / 2, 0);
    }
    return geo;
  }

  private createRailGeometry(preset: any): THREE.BufferGeometry | null {
    if (preset.railType !== "frame") return null;

    let geo: THREE.BufferGeometry;
    if (preset.railShape === "square") {
      geo = new THREE.BoxGeometry(
        preset.railThickness!,
        preset.railThickness!,
        1
      );
    } else {
      geo = new THREE.CylinderGeometry(
        preset.railRadius!,
        preset.railRadius!,
        1,
        12
      );
      geo.rotateX(Math.PI / 2);
    }
    return geo;
  }

  private generateFenceSegment(
    pointA: THREE.Vector3,
    pointB: THREE.Vector3,
    preset: any,
    colors: any,
    postGeo: THREE.BufferGeometry,
    railGeo: THREE.BufferGeometry | null,
    slatGeo: THREE.BufferGeometry,
    topRailY: number,
    bottomRailY: number,
    slatHeight: number,
    slatCenterY: number,
    slatColorList: number[],
    addPart: (
      key: string,
      geo: THREE.BufferGeometry,
      pos: THREE.Vector3,
      rot: THREE.Euler,
      scl: THREE.Vector3,
      colorHex: number
    ) => void
  ): void {
    const distance = pointA.distanceTo(pointB);
    const direction = new THREE.Vector3()
      .subVectors(pointB, pointA)
      .normalize();
    const angle = Math.atan2(direction.x, direction.z);
    const moduleLength = 2.0;
    const moduleCount = Math.max(1, Math.ceil(distance / moduleLength));
    const actualModuleLength = distance / moduleCount;

    for (let m = 0; m < moduleCount; m++) {
      const t0 = m / moduleCount;
      const t1 = (m + 1) / moduleCount;
      const p0 = new THREE.Vector3().lerpVectors(pointA, pointB, t0);
      const p1 = new THREE.Vector3().lerpVectors(pointA, pointB, t1);
      const pCenter = new THREE.Vector3().lerpVectors(p0, p1, 0.5);

      // Add post at module start
      addPart(
        "post",
        postGeo,
        p0,
        new THREE.Euler(0, angle, 0),
        new THREE.Vector3(1, 1, 1),
        colors.post
      );

      // Add rails
      if (railGeo) {
        const railLength = Math.max(actualModuleLength - 0.1, 0.05);
        addPart(
          "rail",
          railGeo,
          new THREE.Vector3(pCenter.x, topRailY, pCenter.z),
          new THREE.Euler(0, angle, 0),
          new THREE.Vector3(1, 1, railLength),
          colors.post
        );
        addPart(
          "rail",
          railGeo,
          new THREE.Vector3(pCenter.x, bottomRailY, pCenter.z),
          new THREE.Euler(0, angle, 0),
          new THREE.Vector3(1, 1, railLength),
          colors.post
        );
      }

      // Add slats or solid panel
      if (preset.isSolidPanel) {
        const panelLength = actualModuleLength - 0.1;
        addPart(
          "slat",
          slatGeo,
          new THREE.Vector3(pCenter.x, slatCenterY, pCenter.z),
          new THREE.Euler(0, angle, 0),
          new THREE.Vector3(1, slatHeight, panelLength / preset.slatWidth),
          slatColorList[0]
        );
      } else {
        const slatCount = preset.fixedCount
          ? preset.fixedCount
          : Math.max(
              1,
              Math.floor(
                actualModuleLength / (preset.slatWidth + (preset.slatGap ?? 0.05))
              )
            );

        for (let s = 0; s < slatCount; s++) {
          const tSlat = (s + 0.5) / slatCount;
          const pSlat = new THREE.Vector3().lerpVectors(p0, p1, tSlat);
          pSlat.y = slatCenterY;
          addPart(
            "slat",
            slatGeo,
            pSlat,
            new THREE.Euler(0, angle, 0),
            new THREE.Vector3(1, slatHeight, 1),
            slatColorList[s % slatColorList.length]
          );
        }
      }
    }
  }

  private createInstancedGroup(parts: Record<
    string,
    { geo: THREE.BufferGeometry; matrices: THREE.Matrix4[]; colors: number[] }
  >): THREE.Group {
    const group = new THREE.Group();
    for (const key in parts) {
      const { geo, matrices, colors } = parts[key];
      const count = matrices.length;
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.1,
      });
      const mesh = new THREE.InstancedMesh(geo, material, count);

      for (let i = 0; i < count; i++) {
        mesh.setMatrixAt(i, matrices[i]);
        mesh.setColorAt(i, new THREE.Color(colors[i]));
      }

      mesh.instanceMatrix!.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    return group;
  }
}