import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { FENCE_PRESETS } from "@/features/editor/data/fence_presets";

import type {
  SceneItem,
  FenceConfig,
  FloorMaterialType,
  ModelItem,
} from "@/types/editor";
import type { Product } from "@/services/catalogService";

type PlaceableProduct = Product & { initialScale?: [number, number, number] };

/**
 * Manages 3D object creation, loading, and manipulation
 */
export class ObjectManager {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private assetCache: Record<string, THREE.Group> = {};
  private floorMaterials: Record<FloorMaterialType, THREE.Material>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
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

  /**
   * Loads a 3D model from URL with caching
   */
  public async loadModel(url: string): Promise<THREE.Group> {
    if (this.assetCache[url]) {
      return this.assetCache[url].clone();
    }

    const gltf = await this.loader.loadAsync(url);
    this.assetCache[url] = gltf.scene;
    return gltf.scene.clone();
  }

  /**
   * Recreates a model from a scene item
   */
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

      const editor = useEditorStore.getState();
      const isZonesVisible = editor.safetyZonesVisible;
      const safetyMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      // Process safety zones
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

      this.scene.add(model);
    } catch (error) {
      console.error("Error recreating model:", error);
    }
  }

  /**
   * Recreates a floor polygon from a scene item
   */
  public recreateFloor(item: SceneItem): void {
    if (item.type !== "floor" || !item.points || item.points.length < 3) {
      return;
    }

    // Create floor shape
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

    // Apply texture transformation
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

    // Create material
    let material: THREE.Material;
    if (item.textureUrl) {
      const texture = this.textureLoader.load(item.textureUrl);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        side: THREE.DoubleSide,
      });
    } else {
      material = this.floorMaterials[item.floorMaterial ?? "concrete"];
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.uuid = item.uuid;
    mesh.receiveShadow = true;
    mesh.position.fromArray(item.position || [0, 0, 0]);
    mesh.rotation.fromArray(item.rotation || [0, 0, 0]);
    mesh.scale.fromArray(item.scale || [1, 1, 1]);

    mesh.userData = {
      isItem: true,
      type: "floor",
      uuid: item.uuid,
      points: item.points,
      floorMaterial: item.floorMaterial,
      textureUrl: item.textureUrl,
      textureScale: item.textureScale,
      textureRotation: item.textureRotation,
    };

    this.scene.add(mesh);
  }

  /**
   * Recreates a fence from a scene item
   */
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

  /**
   * Creates a fence 3D object from points and configuration
   */
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

    // Create post geometry
    let postGeo: THREE.BufferGeometry;
    if (preset.postType === "round") {
      postGeo = new THREE.CylinderGeometry(
        preset.postRadius!,
        preset.postRadius!,
        preset.postHeight,
        16
      );
      postGeo.translate(0, preset.postHeight / 2, 0);
    } else {
      postGeo = new THREE.BoxGeometry(
        preset.postWidth!,
        preset.postHeight,
        preset.postWidth!
      );
      postGeo.translate(0, preset.postHeight / 2, 0);
    }

    // Create rail geometry
    let railGeo: THREE.BufferGeometry | null = null;
    if (preset.railType === "frame") {
      if (preset.railShape === "square") {
        railGeo = new THREE.BoxGeometry(
          preset.railThickness!,
          preset.railThickness!,
          1
        );
      } else {
        railGeo = new THREE.CylinderGeometry(
          preset.railRadius!,
          preset.railRadius!,
          1,
          12
        );
        railGeo.rotateX(Math.PI / 2);
      }
    }

    // Create slat geometry
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
      const pointA = points[i];
      const pointB = points[i + 1];
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

  /**
   * Places a product object in the scene
   */
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

      const editor = useEditorStore.getState();
      const isZonesVisible = editor.safetyZonesVisible;
      const safetyMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      // Process safety zones
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
          }
        }
      });

      // Animate scale-in
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

  /**
   * Adjusts object position to sit on the ground plane
   */
  public adjustObjectToGround(object: THREE.Object3D): void {
    object.updateMatrixWorld();
    const boundingBox = new THREE.Box3().setFromObject(object);
    object.position.y -= boundingBox.min.y;
  }
}