// --- FILE: src/features/editor/engine/managers/ExportManager.ts ---
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { A42Engine } from "../A42Engine";
import { useEditorStore } from "@/stores/editor/useEditorStore";

export class ExportManager {
  private engine: A42Engine;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  // ======================================================
  // GLB EXPORT
  // ======================================================
  public async exportGLB() {
    const name = await useEditorStore
      .getState()
      .requestInput("Nombre del archivo (.glb):", "proyecto-3d");

    if (!name) return;

    const exporter = new GLTFExporter();
    const exportGroup = this.buildExportGroup();

    if (!exportGroup) {
      alert("No hay objetos para exportar.");
      return;
    }

    exporter.parse(
      exportGroup,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], {
          type: "application/octet-stream",
        });
        this.download(blob, `${name}.glb`);
      },
      (error) => {
        console.error("Error exportando GLB:", error);
        alert("Error al exportar GLB.");
      },
      { binary: true }
    );
  }

  private buildExportGroup(): THREE.Group | null {
    const group = new THREE.Group();
    let found = false;

    this.engine.scene.traverse((child) => {
      if (child.userData?.isItem) {
        group.add(child.clone());
        found = true;
      }
    });

    return found ? group : null;
  }

  // ======================================================
  // DXF EXPORT
  // ======================================================
  public async exportDXF() {
    const name = await useEditorStore
      .getState()
      .requestInput("Nombre del archivo (.dxf):", "plano-cad");

    if (!name) return;

    let dxf = this.headerDXF();
    this.engine.scene.updateMatrixWorld(true);

    this.engine.scene.traverse((obj) => {
      if (!obj.userData?.isItem) return;

      // --- EXPORTAR SUELOS ---
      if (obj.userData.type === "floor" && obj.userData.points) {
        dxf += this.exportFloor(obj);
        return;
      }

      // --- EXPORTAR MODELOS Y VALLAS ---
      dxf += this.exportMeshOrInstanced(obj);
    });

    dxf += this.footerDXF();

    const blob = new Blob([dxf], { type: "application/dxf" });
    this.download(blob, `${name}.dxf`);
  }

  // ======================================================
  // DXF — EXPORT FLOOR
  // ======================================================
  private exportFloor(obj: THREE.Object3D): string {
    let out = "";

    const layer = "SUELOS";
    const color = 4;

    const pts = obj.userData.points;
    const world = pts.map((p: any) => {
      const v = new THREE.Vector3(p.x, 0, p.z);
      v.applyMatrix4(obj.matrixWorld);
      return v;
    });

    for (let i = 0; i < world.length; i++) {
      const p1 = world[i];
      const p2 = world[(i + 1) % world.length];
      out += this.lineDXF(p1.x, -p1.z, p2.x, -p2.z, layer, color);
    }

    return out;
  }

  // ======================================================
  // DXF — MESH / INSTANCED
  // ======================================================
  private exportMeshOrInstanced(root: THREE.Object3D): string {
    let out = "";

    const layer =
      root.userData.type === "fence" ? "VALLAS" : "MOBILIARIO";
    const color = root.userData.type === "fence" ? 1 : 3;

    root.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;

      const mesh = child as THREE.Mesh;

      // Edges
      const edges = new THREE.EdgesGeometry(mesh.geometry, 10);
      const pos = edges.attributes.position.array;

      // Instanced meshes
      if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
        const inst = mesh as THREE.InstancedMesh;
        const mat = new THREE.Matrix4();

        for (let i = 0; i < inst.count; i++) {
          inst.getMatrixAt(i, mat);
          const worldMat = new THREE.Matrix4().multiplyMatrices(
            inst.matrixWorld,
            mat
          );
          out += this.exportEdgesDXF(pos, worldMat, layer, color);
        }
        return;
      }

      // Normal meshes
      out += this.exportEdgesDXF(pos, mesh.matrixWorld, layer, color);
    });

    return out;
  }

  private exportEdgesDXF(
    pos: ArrayLike<number>,
    matrix: THREE.Matrix4,
    layer: string,
    color: number
  ): string {
    let out = "";

    for (let i = 0; i < pos.length; i += 6) {
      const v1 = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(matrix);
      const v2 = new THREE.Vector3(pos[i + 3], pos[i + 4], pos[i + 5]).applyMatrix4(matrix);

      out += this.lineDXF(v1.x, -v1.z, v2.x, -v2.z, layer, color);
    }

    return out;
  }

  // ======================================================
  // DXF FORMAT HELPERS
  // ======================================================
  private headerDXF() {
    return `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
0
ENDSEC
0
SECTION
2
ENTITIES
`;
  }

  private footerDXF() {
    return `0
ENDSEC
0
EOF`;
  }

  private lineDXF(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    layer: string,
    color: number
  ) {
    return `0
LINE
8
${layer}
62
${color}
10
${x1.toFixed(4)}
20
${y1.toFixed(4)}
11
${x2.toFixed(4)}
21
${y2.toFixed(4)}
`;
  }

  // ======================================================
  // FILE DOWNLOAD
  // ======================================================
  private download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 120);
  }
}
