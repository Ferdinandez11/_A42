// --- START OF FILE src/features/editor/engine/managers/ExportManager.ts ---
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { A42Engine } from '../A42Engine';

export class ExportManager {
  private engine: A42Engine;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  // --- 1. EXPORTAR A GLB ---
  public exportGLB() {
    const exporter = new GLTFExporter();
    const exportableObjects: THREE.Object3D[] = [];
    
    this.engine.scene.traverse((child) => {
        if (child.userData?.isItem) {
            exportableObjects.push(child);
        }
    });

    if (exportableObjects.length === 0) {
        alert("No hay objetos para exportar.");
        return;
    }

    const exportGroup = new THREE.Group();
    exportableObjects.forEach(obj => exportGroup.add(obj.clone()));

    exporter.parse(
      exportGroup,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], { type: 'application/octet-stream' });
        this.downloadFile(blob, `proyecto-3d-${new Date().getTime()}.glb`);
      },
      (error) => {
        console.error('Error exportando GLB:', error);
        alert('Error al exportar GLB.');
      },
      { binary: true }
    );
  }

  // --- 2. EXPORTAR A DXF (Soporte para InstancedMesh) ---
  public exportDXF() {
    let dxf = this.getDXFHeader();
    
    // Actualizar matrices globales para asegurar posiciones correctas
    this.engine.scene.updateMatrixWorld(true);

    this.engine.scene.traverse((child) => {
        if (!child.userData.isItem) return;

        // --- CASO 1: SUELOS (Contorno) ---
        if (child.userData.type === 'floor' && child.userData.points) {
            const points = child.userData.points;
            const worldPoints = points.map((p: any) => {
                 const vec = new THREE.Vector3(p.x, p.y, p.z);
                 vec.applyMatrix4(child.matrixWorld);
                 return vec;
            });

            for (let i = 0; i < worldPoints.length; i++) {
                const p1 = worldPoints[i];
                const p2 = worldPoints[(i + 1) % worldPoints.length]; 
                dxf += this.line(p1.x, -p1.z, p2.x, -p2.z, 'SUELOS', 4); // Cyan
            }
        }

        // --- CASO 2: VALLAS Y MODELOS (Geometría Real + Instancias) ---
        else {
            const layerName = child.userData.type === 'fence' ? 'VALLAS' : 'MOBILIARIO';
            const layerColor = child.userData.type === 'fence' ? 1 : 3; // Rojo o Verde

            child.traverse((mesh) => {
                // Verificamos si es un Mesh normal o una Instancia
                if ((mesh as THREE.Mesh).isMesh) {
                    
                    const geometry = (mesh as THREE.Mesh).geometry;
                    // Extraer aristas (15 grados de umbral)
                    const edges = new THREE.EdgesGeometry(geometry, 15);
                    const positions = edges.attributes.position.array;

                    // --- SUB-CASO A: Malla Instanciada (Vallas optimizadas) ---
                    if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
                        const instancedMesh = mesh as THREE.InstancedMesh;
                        const instanceMatrix = new THREE.Matrix4();

                        // Recorremos CADA copia de la valla
                        for (let k = 0; k < instancedMesh.count; k++) {
                            instancedMesh.getMatrixAt(k, instanceMatrix);
                            
                            // Matriz Final = Matriz del Mundo (Padre) * Matriz de la Instancia (Copia)
                            const finalMatrix = new THREE.Matrix4();
                            finalMatrix.multiplyMatrices(instancedMesh.matrixWorld, instanceMatrix);

                            // Dibujamos la geometría para ESTA copia
                            dxf += this.drawGeometryPoints(positions, finalMatrix, layerName, layerColor);
                        }
                    } 
                    // --- SUB-CASO B: Malla Normal (Modelos únicos) ---
                    else {
                        dxf += this.drawGeometryPoints(positions, mesh.matrixWorld, layerName, layerColor);
                    }
                }
            });
        }
    });

    dxf += this.getDXFFooter();

    const blob = new Blob([dxf], { type: 'application/dxf' });
    this.downloadFile(blob, `plano-detalle-${new Date().getTime()}.dxf`);
  }

  // --- Helper para dibujar puntos transformados ---
  private drawGeometryPoints(positions: ArrayLike<number>, matrix: THREE.Matrix4, layer: string, color: number): string {
      let output = '';
      for (let i = 0; i < positions.length; i += 6) {
          const v1 = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]);
          const v2 = new THREE.Vector3(positions[i+3], positions[i+4], positions[i+5]);

          // Aplicar la matriz calculada (sea simple o de instancia)
          v1.applyMatrix4(matrix);
          v2.applyMatrix4(matrix);

          output += this.line(v1.x, -v1.z, v2.x, -v2.z, layer, color);
      }
      return output;
  }

  // --- GENERADORES DXF ---
  private getDXFHeader() {
      return `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
  }

  private getDXFFooter() {
      return `0\nENDSEC\n0\nEOF`;
  }

  private line(x1: number, y1: number, x2: number, y2: number, layer: string, color: number) {
      const fx1 = x1.toFixed(4);
      const fy1 = y1.toFixed(4);
      const fx2 = x2.toFixed(4);
      const fy2 = y2.toFixed(4);
      return `0\nLINE\n8\n${layer}\n62\n${color}\n10\n${fx1}\n20\n${fy1}\n11\n${fx2}\n21\n${fy2}\n`;
  }

  private downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
  }
}
// --- END OF FILE src/features/editor/engine/managers/ExportManager.ts ---