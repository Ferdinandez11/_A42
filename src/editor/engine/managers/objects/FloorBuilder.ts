import * as THREE from "three";
import type { SceneItem, FloorMaterialType } from "@/domain/types/editor";

/**
 * Builds floor meshes from scene items
 */
export class FloorBuilder {
  private scene: THREE.Scene;
  private textureLoader: THREE.TextureLoader;
  private floorMaterials: Record<FloorMaterialType, THREE.Material>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();

    // Initialize floor materials
    this.floorMaterials = {
      rubber_red: new THREE.MeshStandardMaterial({
        color: 0xa04040,
        roughness: 0.9,
      }),
      rubber_green: new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.9,
      }),
      rubber_blue: new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.9,
      }),
      grass: new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 1 }),
      concrete: new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        roughness: 0.8,
      }),
    };
  }

  public recreateFloor(item: SceneItem): void {
    if (item.type !== "floor" || !item.points || item.points.length < 3) {
      return;
    }

    // Type narrowing - item is now FloorItem
    const floorItem = item as any; // FloorItem type not imported but has these properties

    // Create floor shape
    const shape = new THREE.Shape();
    shape.moveTo(floorItem.points[0].x, -floorItem.points[0].z);
    for (let i = 1; i < floorItem.points.length; i++) {
      shape.lineTo(floorItem.points[i].x, -floorItem.points[i].z);
    }
    shape.lineTo(floorItem.points[0].x, -floorItem.points[0].z);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);

    // Apply texture transformation
    this.applyTextureTransform(geometry, floorItem);

    // Create material
    const material = this.createFloorMaterial(floorItem);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.uuid = floorItem.uuid;
    mesh.receiveShadow = true;
    mesh.position.fromArray(floorItem.position || [0, 0, 0]);
    mesh.rotation.fromArray(floorItem.rotation || [0, 0, 0]);
    mesh.scale.fromArray(floorItem.scale || [1, 1, 1]);

    mesh.userData = {
      isItem: true,
      type: "floor",
      uuid: floorItem.uuid,
      points: floorItem.points,
      floorMaterial: floorItem.floorMaterial,
      textureUrl: floorItem.textureUrl,
      textureScale: floorItem.textureScale,
      textureRotation: floorItem.textureRotation,
    };

    this.scene.add(mesh);
  }

  private applyTextureTransform(geometry: THREE.ExtrudeGeometry, item: any): void {
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const scale = item.textureScale ?? 1;
    const rotationRad = THREE.MathUtils.degToRad(item.textureRotation ?? 0);

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const u = (x * Math.cos(rotationRad) - z * Math.sin(rotationRad)) / scale;
      const v = (x * Math.sin(rotationRad) + z * Math.cos(rotationRad)) / scale;
      uv.setXY(i, u, v);
    }
  }

  private createFloorMaterial(item: any): THREE.Material {
    if (item.textureUrl) {
      const texture = this.textureLoader.load(item.textureUrl);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        side: THREE.DoubleSide,
      });
    } else {
      const materialType = (item.floorMaterial ?? "concrete") as FloorMaterialType;
      return this.floorMaterials[materialType];
    }
  }
}