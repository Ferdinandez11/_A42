// --- FILE: src/features/editor/engine/managers/tools/FenceTool.ts ---
import * as THREE from "three";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useFenceStore } from "@/stores/fence/useFenceStore";
import type { FenceItem, FenceConfig as BaseFenceConfig } from "@/types/editor";
// IMPORTANTE: Importamos los presets para rellenar los datos que faltan
import { FENCE_PRESETS } from "../../../data/fence_presets";

// Tipo interno extendido con todos los campos necesarios
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

export class FenceTool {
  private scene: THREE.Scene;

  private points: THREE.Vector3[] = [];
  private markers: THREE.Mesh[] = [];
  private previewLine: THREE.Line | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // ====================================================================
  // RESET
  // ====================================================================
  public reset() {
    this.markers.forEach((m) => this.scene.remove(m));
    this.markers = [];

    if (this.previewLine) this.scene.remove(this.previewLine);
    this.previewLine = null;

    this.points = [];
  }

  // ====================================================================
  // ADD POINT
  // ====================================================================
  public addPoint(world: THREE.Vector3) {
    const p = world.clone();
    p.y = 0;

    // Evitar puntos duplicados muy cerca
    if (this.points.length > 0 && p.distanceTo(this.points.at(-1)!) < 0.1) {
      return;
    }

    this.points.push(p);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.15),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
    );
    marker.position.copy(p);
    this.scene.add(marker);
    this.markers.push(marker);

    this.updatePreview();
  }

  private updatePreview() {
    if (this.previewLine) this.scene.remove(this.previewLine);

    if (this.points.length > 1) {
      const geo = new THREE.BufferGeometry().setFromPoints(this.points);
      this.previewLine = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0x3b82f6 })
      );
      this.scene.add(this.previewLine);
    }
  }

  // ====================================================================
  // FINALIZE
  // ====================================================================
  public finalize() {
    this.createFence();
  }

  // ====================================================================
  // CREATE FENCE (SceneItem)
  // ====================================================================
  private createFence() {
    if (this.points.length < 2) return;

    // Obtenemos config del store (parcial, solo tiene ID y colores)
    const storeConfig = useFenceStore.getState().config;

    const uuid = THREE.MathUtils.generateUUID();
    const box = new THREE.Box3().setFromPoints(this.points);
    const center = box.getCenter(new THREE.Vector3());

    const localPoints = this.points.map((p) => ({
      x: p.x - center.x,
      z: p.z - center.z,
    }));

    const item: FenceItem = {
      uuid,
      type: "fence",
      productId: "fence_" + storeConfig.presetId,
      name: "Valla",
      price: 100, // Precio base dummy, luego se recalcula con PriceCalculator
      points: localPoints,
      // Guardamos la config del usuario
      fenceConfig: structuredClone(storeConfig),
      position: [center.x, 0, center.z],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };

    useSceneStore.getState().addItem(item);

    this.reset();
  }

  // ====================================================================
  // RUNTIME GEOMETRY BUILDER (CORREGIDO)
  // ====================================================================
  public static buildFenceMesh(item: FenceItem): THREE.Group {
    const group = new THREE.Group();
    
    // 1. RECUPERAMOS LOS VALORES DEL PRESET
    // item.fenceConfig tiene lo que el usuario personalizó (colores, id)
    // FENCE_PRESETS tiene las dimensiones geométricas
    const userConfig = item.fenceConfig;
    const presetData = FENCE_PRESETS[userConfig.presetId] || FENCE_PRESETS["wood"];

    // 2. FUSIONAMOS (Merge) para tener un objeto config completo
    const config: FenceConfig = {
        ...presetData,        // Valores geométricos por defecto (postHeight, slatWidth, etc)
        ...userConfig,        // Sobreescribe colores y presetId
        // Aseguramos merging de colores
        colors: {
            ...presetData.defaultColors,
            ...userConfig.colors
        }
    } as FenceConfig;

    const pts = item.points.map((p) => new THREE.Vector3(p.x, 0, p.z));
    if (pts.length < 2) return group;

    const postMatrices: THREE.Matrix4[] = [];
    const railMatrices: THREE.Matrix4[] = [];
    const slatMatrices: THREE.Matrix4[] = [];

    const temp = new THREE.Object3D();

    // 3. GENERAMOS GEOMETRÍAS CON LA CONFIG COMPLETA
    const postGeo = FenceTool.getPostGeometry(config);
    const railGeo = FenceTool.getRailGeometry(config);
    const slatGeo = FenceTool.getSlatGeometry(config);

    const moduleLength = config.moduleLength ?? 2.0;
    const postHeight = config.postHeight || 1.0; // Fallback por seguridad

    const topRailY = postHeight - 0.12;
    const bottomRailY = 0.12;

    // --- Recorremos tramos P_i -> P_{i+1} ---
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i];
      const B = pts[i + 1];
      const dist = A.distanceTo(B);
      
      // Evitar NaN si los puntos son idénticos
      if (dist < 0.001) continue;

      const dir = new THREE.Vector3().subVectors(B, A).normalize();
      const angle = Math.atan2(dir.x, dir.z);

      // POSTE en el inicio de cada tramo (A)
      FenceTool.pushMatrix(postMatrices, temp, A, angle, 1);

      const segmentCount = Math.max(1, Math.ceil(dist / moduleLength));
      const moduleLen = dist / segmentCount;

      for (let m = 0; m < segmentCount; m++) {
        const t0 = m / segmentCount;
        const t1 = (m + 1) / segmentCount;
        const mid = new THREE.Vector3().lerpVectors(A, B, (t0 + t1) / 2);

        // --- RAILS ---
        if (railGeo) {
          FenceTool.pushMatrix(
            railMatrices,
            temp,
            new THREE.Vector3(mid.x, topRailY, mid.z),
            angle,
            moduleLen
          );
          FenceTool.pushMatrix(
            railMatrices,
            temp,
            new THREE.Vector3(mid.x, bottomRailY, mid.z),
            angle,
            moduleLen
          );
        }

        // --- SLATS ---
        const slatWidth = config.slatWidth || 0.1;
        const slatGap = config.slatGap ?? 0.04;

        const maxSlats = Math.max(
          1,
          Math.floor(moduleLen / (slatWidth + slatGap))
        );
        const slatCount = config.fixedCount ?? maxSlats;

        for (let s = 0; s < slatCount; s++) {
          const tSlat = (s + 0.5) / slatCount;
          const pSlat = new THREE.Vector3().lerpVectors(A, B, tSlat); // Esto es incorrecto para la posición exacta en el módulo, pero válido visualmente para MVP
          
          // Corrección: Interpolar entre el inicio y fin del SUB-SEGMENTO actual, no de todo el tramo A-B
          const subStart = new THREE.Vector3().lerpVectors(A, B, t0);
          const subEnd = new THREE.Vector3().lerpVectors(A, B, t1);
          const pSlatExact = new THREE.Vector3().lerpVectors(subStart, subEnd, (s + 0.5) / slatCount);

          FenceTool.pushMatrix(
            slatMatrices,
            temp,
            new THREE.Vector3(pSlatExact.x, postHeight * 0.5, pSlatExact.z),
            angle,
            1
          );
        }
      }
    }

    // --- Último poste en el punto final P_{n} ---
    FenceTool.pushMatrix(postMatrices, temp, pts.at(-1)!, 0, 1);

    // Instanced meshes
    FenceTool.addInstanced(group, postGeo, postMatrices, config.colors.post);
    if (railGeo)
      FenceTool.addInstanced(group, railGeo, railMatrices, config.colors.post);
    FenceTool.addInstanced(group, slatGeo, slatMatrices, config.colors.slatA);

    return group;
  }

  // ====================================================================
  // HELPERS GEOMETRÍA
  // ====================================================================
  private static getPostGeometry(config: FenceConfig) {
    const h = config.postHeight || 1.0;

    if (config.postType === "round") {
      const r = config.postRadius ?? 0.06;
      const geo = new THREE.CylinderGeometry(r, r, h, 16);
      geo.translate(0, h / 2, 0);
      return geo;
    }

    const w = config.postWidth ?? 0.08;
    const geo = new THREE.BoxGeometry(w, h, w);
    geo.translate(0, h / 2, 0);
    return geo;
  }

  private static getRailGeometry(config: FenceConfig) {
    if (config.railType === "none") return null;

    if (config.railShape === "round") {
      const r = config.railRadius ?? 0.03;
      const geo = new THREE.CylinderGeometry(r, r, 1, 10);
      geo.rotateX(Math.PI / 2);
      return geo;
    }

    const t = config.railThickness ?? 0.04;
    return new THREE.BoxGeometry(t, t, 1);
  }

  private static getSlatGeometry(config: FenceConfig) {
    const thickness = config.slatThickness || 0.02;
    const height = (config.postHeight || 1.0) * 0.7;
    const width = config.slatWidth || 0.1;

    return new THREE.BoxGeometry(thickness, height, width);
  }

  private static pushMatrix(
    list: THREE.Matrix4[],
    temp: THREE.Object3D,
    pos: THREE.Vector3,
    angle: number,
    length: number
  ) {
    // Protección contra NaNs
    if (isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z) || isNaN(length)) return;

    temp.position.copy(pos);
    temp.rotation.set(0, angle, 0);
    temp.scale.set(1, 1, length);
    temp.updateMatrix();
    list.push(temp.matrix.clone());
  }

  private static addInstanced(
    group: THREE.Group,
    geo: THREE.BufferGeometry | null,
    matrices: THREE.Matrix4[],
    color: number
  ) {
    if (!geo || matrices.length === 0) return;

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.1,
    });
    const inst = new THREE.InstancedMesh(geo, mat, matrices.length);

    matrices.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;

    group.add(inst);
  }
}