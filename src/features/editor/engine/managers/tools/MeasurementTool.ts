// --- FILE: src/features/editor/engine/managers/tools/MeasurementTool.ts ---
import * as THREE from "three";
import { useEditorStore } from "@/stores/editor/useEditorStore";

export class MeasurementTool {
  private scene: THREE.Scene;
  private points: THREE.Vector3[] = [];
  private markers: THREE.Mesh[] = [];
  private line: THREE.Line | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public reset() {
    this.markers.forEach((m) => this.scene.remove(m));
    this.markers = [];

    if (this.line) this.scene.remove(this.line);
    this.line = null;

    this.points = [];
  }

  public addPoint(world: THREE.Vector3) {
    const p = world.clone();
    p.y += 0.05;

    this.points.push(p);

    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    m.position.copy(p);
    this.scene.add(m);
    this.markers.push(m);

    if (this.points.length === 2) {
      const dist = this.points[0].distanceTo(this.points[1]);

      const g = new THREE.BufferGeometry().setFromPoints(this.points);
      const mat = new THREE.LineBasicMaterial({ color: 0xffff00 });
      this.line = new THREE.Line(g, mat);
      this.scene.add(this.line);

      // 🔧 Intento de enviar la medida al store (si existe ese método)
      const editorState = useEditorStore.getState() as any;
      if (typeof editorState.setMeasurementResult === "function") {
        editorState.setMeasurementResult(dist);
      } else {
        // TODO: conectar con el nuevo sistema de mediciones si lo hay
        console.log("Distancia medida:", dist.toFixed(3), "m");
      }

      this.reset();
    }
  }
}
