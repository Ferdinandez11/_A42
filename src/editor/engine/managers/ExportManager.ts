import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { A42Engine } from "@/editor/engine/A42Engine";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";
import { editorErrorHandler } from "@/editor/services/EditorErrorHandler";
import { ErrorSeverity } from "@/core/lib/errorHandler";

/**
 * Manages scene export functionality to various formats (GLB, DXF)
 */
export class ExportManager {
  private engine: A42Engine;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  /**
   * Exports the scene to GLB format (binary glTF)
   */
  public async exportGLB(): Promise<void> {
    const name = await useEditorStore
      .getState()
      .requestInput("Nombre del archivo 3D (.glb):", "proyecto-3d");

    if (name === null) return;

    const exporter = new GLTFExporter();
    const exportableObjects: THREE.Object3D[] = [];

    // Collect all exportable objects
    this.engine.scene.traverse((child) => {
      if (child.userData?.isItem) {
        exportableObjects.push(child);
      }
    });

    if (exportableObjects.length === 0) {
      alert("No hay objetos para exportar.");
      return;
    }

    // Create export group with clones to avoid modifying original scene
    const exportGroup = new THREE.Group();
    exportableObjects.forEach((obj) => exportGroup.add(obj.clone()));

    exporter.parse(
      exportGroup,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], {
          type: "application/octet-stream",
        });
        this.downloadFile(blob, `${name}.glb`);
      },
      (error) => {
        editorErrorHandler.handleError(error, {
          userMessage: 'Error al exportar GLB',
          severity: ErrorSeverity.MEDIUM,
          showToast: false,
        });
        alert("Error al exportar GLB.");
      },
      { binary: true }
    );
  }

  /**
   * Exports the scene to DXF format (AutoCAD Drawing Exchange Format)
   * Creates a 2D plan view from the top
   */
  public async exportDXF(): Promise<void> {
    const name = await useEditorStore
      .getState()
      .requestInput("Nombre del plano (.dxf):", "planta-cad");

    if (name === null) return;

    let dxf = this.getDXFHeader();
    this.engine.scene.updateMatrixWorld(true);

    // Process each item in the scene
    this.engine.scene.traverse((child) => {
      if (!child.userData.isItem) return;

      // Handle floor polygons
      if (child.userData.type === "floor" && child.userData.points) {
        const points = child.userData.points;
        const worldPoints = points.map((p: any) => {
          const vector = new THREE.Vector3(p.x, p.y, p.z);
          vector.applyMatrix4(child.matrixWorld);
          return vector;
        });

        // Draw floor boundary lines
        for (let i = 0; i < worldPoints.length; i++) {
          const p1 = worldPoints[i];
          const p2 = worldPoints[(i + 1) % worldPoints.length];
          dxf += this.line(p1.x, -p1.z, p2.x, -p2.z, "SUELOS", 4);
        }
      } else {
        // Handle fences and furniture
        const layerName =
          child.userData.type === "fence" ? "VALLAS" : "MOBILIARIO";
        const layerColor = child.userData.type === "fence" ? 1 : 3;

        child.traverse((mesh) => {
          if ((mesh as THREE.Mesh).isMesh) {
            const geometry = (mesh as THREE.Mesh).geometry;
            const edges = new THREE.EdgesGeometry(geometry, 15);
            const positions = edges.attributes.position.array;

            // Handle instanced meshes
            if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
              const instanced = mesh as THREE.InstancedMesh;
              const instanceMatrix = new THREE.Matrix4();

              for (let k = 0; k < instanced.count; k++) {
                instanced.getMatrixAt(k, instanceMatrix);
                const finalMatrix = new THREE.Matrix4();
                finalMatrix.multiplyMatrices(
                  instanced.matrixWorld,
                  instanceMatrix
                );
                dxf += this.drawGeometryEdges(
                  positions,
                  finalMatrix,
                  layerName,
                  layerColor
                );
              }
            } else {
              // Handle regular meshes
              dxf += this.drawGeometryEdges(
                positions,
                mesh.matrixWorld,
                layerName,
                layerColor
              );
            }
          }
        });
      }
    });

    dxf += this.getDXFFooter();

    const blob = new Blob([dxf], { type: "application/dxf" });
    this.downloadFile(blob, `${name}.dxf`);
  }

  /**
   * Draws geometry edges as DXF lines
   */
  private drawGeometryEdges(
    positions: ArrayLike<number>,
    matrix: THREE.Matrix4,
    layer: string,
    color: number
  ): string {
    let output = "";

    for (let i = 0; i < positions.length; i += 6) {
      const v1 = new THREE.Vector3(
        positions[i],
        positions[i + 1],
        positions[i + 2]
      );
      const v2 = new THREE.Vector3(
        positions[i + 3],
        positions[i + 4],
        positions[i + 5]
      );

      v1.applyMatrix4(matrix);
      v2.applyMatrix4(matrix);

      // Use X and -Z for top-down view
      output += this.line(v1.x, -v1.z, v2.x, -v2.z, layer, color);
    }

    return output;
  }

  /**
   * Generates DXF file header
   */
  private getDXFHeader(): string {
    return `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
  }

  /**
   * Generates DXF file footer
   */
  private getDXFFooter(): string {
    return `0\nENDSEC\n0\nEOF`;
  }

  /**
   * Creates a DXF line entity
   */
  private line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    layer: string,
    color: number
  ): string {
    return `0\nLINE\n8\n${layer}\n62\n${color}\n10\n${x1.toFixed(
      4
    )}\n20\n${y1.toFixed(4)}\n11\n${x2.toFixed(4)}\n21\n${y2.toFixed(4)}\n`;
  }

  /**
   * Triggers file download in the browser
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}