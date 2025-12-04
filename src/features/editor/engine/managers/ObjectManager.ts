// --- START OF FILE src/features/editor/engine/managers/ObjectManager.ts ---
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { FENCE_PRESETS } from "@/features/editor/data/fence_presets";

import type {
  SceneItem,
  FenceConfig,
  FloorMaterialType,
} from "@/types/editor";

import type { Product } from "@/services/catalogService";

type PlaceableProduct = Product & { initialScale?: [number, number, number] };

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

    this.floorMaterials = {
      rubber_red: new THREE.MeshStandardMaterial({ color: 0xa04040, roughness: 0.9 }),
      rubber_green: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.9 }),
      rubber_blue: new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.9 }),
      grass: new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 1 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.8 }),
    };
  }

  // ----------------------------------------------------------
  //  CARGA DE MODELOS CON CACHÉ
  // ----------------------------------------------------------

  public async loadModel(url: string): Promise<THREE.Group> {
    if (this.assetCache[url]) return this.assetCache[url].clone();
    const gltf = await this.loader.loadAsync(url);
    this.assetCache[url] = gltf.scene;
    return gltf.scene.clone();
  }

  // ----------------------------------------------------------
  //  RECREAR OBJETO 'model'
  // ----------------------------------------------------------

  public async recreateModel(item: SceneItem) {
    if (!item.modelUrl) return;

    try {
      const model = await this.loadModel(item.modelUrl);

      model.uuid = item.uuid;
      model.position.fromArray(item.position);
      model.rotation.fromArray(item.rotation);
      model.scale.fromArray(item.scale);

      // 🔥 userData completo (NECESARIO PARA SELECCIÓN + GIZMO)
      model.userData = {
        isItem: true,
        type: "model",
        uuid: item.uuid,
        productId: item.productId,
      };

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.isItem = true;
          child.userData.type = "model";
          child.userData.uuid = item.uuid;
          child.userData.productId = item.productId;
        }
      });

      // Zonas de seguridad
      const editor = useEditorStore.getState();
      const isZonesVisible = editor.safetyZonesVisible;

      const safetyMat = new THREE.MeshBasicMaterial({
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
          const mat = (mesh.material as THREE.Material).name?.toLowerCase() ?? "";

          if (
            name.includes("zona") ||
            name.includes("seguridad") ||
            name.includes("safety") ||
            mat.includes("zona") ||
            mat.includes("seguridad") ||
            mat.includes("safety")
          ) {
            mesh.material = safetyMat.clone();
            mesh.visible = isZonesVisible;
            mesh.userData.isSafetyZone = true;
            mesh.castShadow = false;
          }
        }
      });

      this.scene.add(model);
    } catch (e) {
      console.error("Error recreating model:", e);
    }
  }

  // ----------------------------------------------------------
  //  RECREAR SUELO
  // ----------------------------------------------------------

  public recreateFloor(item: SceneItem) {
    if (!item.points || item.points.length < 3) return;

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

    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;

    const scale = item.textureScale ?? 1;
    const rotRad = THREE.MathUtils.degToRad(item.textureRotation ?? 0);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      const u = (x * Math.cos(rotRad) - z * Math.sin(rotRad)) / scale;
      const v = (x * Math.sin(rotRad) + z * Math.cos(rotRad)) / scale;

      uv.setXY(i, u, v);
    }

    let material: THREE.Material;

    if (item.textureUrl) {
      const tex = this.textureLoader.load(item.textureUrl);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;

      material = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.8,
        side: THREE.DoubleSide,
      });
    } else {
      material = this.floorMaterials[item.floorMaterial ?? "concrete"];
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.uuid = item.uuid;
    mesh.receiveShadow = true;

    // 🔥 userData correcto para selección + edición de vértices
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

  // ----------------------------------------------------------
  //  RECREAR VALLA
  // ----------------------------------------------------------

  public recreateFence(item: SceneItem) {
    if (!item.points || !item.fenceConfig) return;

    const points = item.points.map((p) => new THREE.Vector3(p.x, 0, p.z));
    const fence = this.createFenceObject(points, item.fenceConfig);

    if (!fence) return;

    fence.uuid = item.uuid;

    // 🔥 userData correcto
    fence.userData = {
      isItem: true,
      type: "fence",
      uuid: item.uuid,
      productId: item.productId,
      points: item.points,
      fenceConfig: item.fenceConfig,
    };

    // También en hijos (instanced meshes)
    fence.traverse((child) => {
      child.userData.isItem = true;
      child.userData.type = "fence";
      child.userData.uuid = item.uuid;
    });

    this.scene.add(fence);
  }

  // ----------------------------------------------------------
  //  CREACIÓN DE VALLA (instanced meshes)
  // ----------------------------------------------------------

  public createFenceObject(points: THREE.Vector3[], config: FenceConfig): THREE.Group | null {
    if (!points || points.length < 2) return null;

    const preset = FENCE_PRESETS[config.presetId] || FENCE_PRESETS["wood"];
    const colors = config.colors;

    const parts: Record<string, { geo: THREE.BufferGeometry; matrices: THREE.Matrix4[]; colors: number[] }> = {};
    const temp = new THREE.Object3D();

    const addPart = (
      key: string,
      geo: THREE.BufferGeometry,
      pos: THREE.Vector3,
      rot: THREE.Euler,
      scl: THREE.Vector3,
      colorHex: number
    ) => {
      if (!parts[key]) {
        parts[key] = { geo, matrices: [], colors: [] };
      }

      temp.position.copy(pos);
      temp.rotation.copy(rot);
      temp.scale.copy(scl);
      temp.updateMatrix();

      parts[key].matrices.push(temp.matrix.clone());
      parts[key].colors.push(colorHex);
    };

    // GEOMETRÍAS BASE
    let postGeo: THREE.BufferGeometry;
    if (preset.postType === "round") {
      postGeo = new THREE.CylinderGeometry(preset.postRadius!, preset.postRadius!, preset.postHeight, 16);
      postGeo.translate(0, preset.postHeight / 2, 0);
    } else {
      postGeo = new THREE.BoxGeometry(preset.postWidth!, preset.postHeight, preset.postWidth!);
      postGeo.translate(0, preset.postHeight / 2, 0);
    }

    let railGeo: THREE.BufferGeometry | null = null;
    if (preset.railType === "frame") {
      if (preset.railShape === "square") {
        railGeo = new THREE.BoxGeometry(preset.railThickness!, preset.railThickness!, 1);
      } else {
        railGeo = new THREE.CylinderGeometry(preset.railRadius!, preset.railRadius!, 1, 12);
        railGeo.rotateX(Math.PI / 2);
      }
    }

    const slatGeo = new THREE.BoxGeometry(preset.slatThickness, 1, preset.slatWidth);

    const topRailY = preset.postHeight - 0.12;
    const botRailY = 0.12;
    const slatHeight = topRailY - botRailY - 0.08;
    const slatCenterY = (topRailY + botRailY) * 0.5;

    const slatColorList = [
      colors.slatA,
      colors.slatB ?? colors.slatA,
      colors.slatC ?? colors.slatA,
    ];

    for (let i = 0; i < points.length - 1; i++) {
      const A = points[i];
      const B = points[i + 1];
      const dist = A.distanceTo(B);

      const dir = new THREE.Vector3().subVectors(B, A).normalize();
      const angle = Math.atan2(dir.x, dir.z);

      const module = 2.0;
      const count = Math.max(1, Math.ceil(dist / module));
      const moduleLen = dist / count;

      for (let m = 0; m < count; m++) {
        const t0 = m / count;
        const t1 = (m + 1) / count;

        const P0 = new THREE.Vector3().lerpVectors(A, B, t0);
        const P1 = new THREE.Vector3().lerpVectors(A, B, t1);
        const PC = new THREE.Vector3().lerpVectors(P0, P1, 0.5);

        addPart("post", postGeo, P0, new THREE.Euler(0, angle, 0), new THREE.Vector3(1, 1, 1), colors.post);

        if (railGeo) {
          const railLen = Math.max(moduleLen - 0.1, 0.05);

          addPart("rail", railGeo, new THREE.Vector3(PC.x, topRailY, PC.z), new THREE.Euler(0, angle, 0),
            new THREE.Vector3(1, 1, railLen), colors.post);

          addPart("rail", railGeo, new THREE.Vector3(PC.x, botRailY, PC.z), new THREE.Euler(0, angle, 0),
            new THREE.Vector3(1, 1, railLen), colors.post);
        }

        if (preset.isSolidPanel) {
          const panelLen = moduleLen - 0.1;
          addPart(
            "slat",
            slatGeo,
            new THREE.Vector3(PC.x, slatCenterY, PC.z),
            new THREE.Euler(0, angle, 0),
            new THREE.Vector3(1, slatHeight, panelLen / preset.slatWidth),
            slatColorList[0]
          );
        } else {
          let slatCount: number;
          if (preset.fixedCount) {
            slatCount = preset.fixedCount;
          } else {
            const unit = preset.slatWidth + (preset.slatGap ?? 0.05);
            slatCount = Math.max(1, Math.floor(moduleLen / unit));
          }

          for (let s = 0; s < slatCount; s++) {
            const tSlat = (s + 0.5) / slatCount;
            const Pslat = new THREE.Vector3().lerpVectors(P0, P1, tSlat);
            Pslat.y = slatCenterY;

            const color = slatColorList[s % slatColorList.length];

            addPart(
              "slat",
              slatGeo,
              Pslat,
              new THREE.Euler(0, angle, 0),
              new THREE.Vector3(1, slatHeight, 1),
              color
            );
          }
        }
      }
    }

    const last = points[points.length - 1];
    addPart("post", postGeo, last, new THREE.Euler(0, 0, 0), new THREE.Vector3(1, 1, 1), colors.post);

    const group = new THREE.Group();

    for (const key in parts) {
      const { geo, matrices, colors } = parts[key];
      const count = matrices.length;

      const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 });
      const mesh = new THREE.InstancedMesh(geo, mat, count);

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

  // ----------------------------------------------------------
  //  COLOCAR OBJETO NUEVO (CATÁLOGO)
  // ----------------------------------------------------------

  public async placeObject(
    x: number,
    z: number,
    product: PlaceableProduct,
    afterPlace?: (uuid: string) => void
  ) {
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

      // Seguridad
      const editor = useEditorStore.getState();
      const isZonesVisible = editor.safetyZonesVisible;

      const safetyMat = new THREE.MeshBasicMaterial({
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
          const mat = (mesh.material as THREE.Material).name?.toLowerCase() ?? "";

          if (
            name.includes("zona") ||
            name.includes("seguridad") ||
            name.includes("safety") ||
            mat.includes("zona") ||
            mat.includes("seguridad") ||
            mat.includes("safety")
          ) {
            mesh.material = safetyMat.clone();
            mesh.visible = isZonesVisible;
            mesh.userData.isSafetyZone = true;
            mesh.castShadow = false;
          }
        }
      });

      // Pop animation
      const targetScale = model.scale.clone();
      model.scale.set(0, 0, 0);
      let t = 0;

      const animate = () => {
        t += 0.05;
        if (t < 1) {
          model.scale.lerpVectors(new THREE.Vector3(0, 0, 0), targetScale, t);
          requestAnimationFrame(animate);
        } else {
          model.scale.copy(targetScale);
        }
      };
      animate();

      // --- GUARDAR EN STORE ---
      const uuid = THREE.MathUtils.generateUUID();
      model.uuid = uuid;

      // 🔥 CLAVE PARA QUE EL GIZMO FUNCIONE
      model.userData = {
        isItem: true,
        type: "model",
        uuid,
        productId: product.id,
      };

      model.traverse((child) => {
        child.userData.isItem = true;
        child.userData.type = "model";
        child.userData.uuid = uuid;
        child.userData.productId = product.id;
      });

      useEditorStore.getState().addItem({
        uuid,
        productId: product.id,
        name: product.name,
        price: product.price,
        modelUrl: product.modelUrl,

        position: [x, model.position.y, z],
        rotation: [0, 0, 0],
        scale: [initialScale.x, initialScale.y, initialScale.z],

        type: "model",

        url_tech: product.url_tech,
        url_cert: product.url_cert,
        url_inst: product.url_inst,

        description: product.description,
        data: product,
      });

      this.scene.add(model);
      afterPlace?.(uuid);

    } catch (e) {
      console.error("Error placing object:", e);
    }
  }

  // ----------------------------------------------------------
  //  AJUSTAR OBJETO AL SUELO
  // ----------------------------------------------------------

  public adjustObjectToGround(object: THREE.Object3D) {
    object.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(object);
    object.position.y -= box.min.y;
  }
}
// --- END OF FILE ---
