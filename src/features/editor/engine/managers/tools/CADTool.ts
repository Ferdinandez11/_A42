// --- FILE: src/features/editor/engine/managers/tools/CADTool.ts ---
import * as THREE from "three";
import { useCADStore } from "@/stores/cad/useCADStore";

export class CADTool {
  private scene: THREE.Scene;
  private markers: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public reset() {
    this.markers.forEach((m) => this.scene.remove(m));
    this.markers = [];

    useCADStore.getState().setSelectedVertices([], null, null);
  }

  public setMarkers(itemUuid: string, worldPositions: THREE.Vector3[]) {
    void itemUuid; // <- evita warning con erasableSyntaxOnly

    this.reset();

    worldPositions.forEach((pos, index) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      );
      m.position.copy(pos);
      m.userData.pointIndex = index;
      this.scene.add(m);
      this.markers.push(m);
    });
  }


  public updateDistances() {
    const store = useCADStore.getState();
    const indices = store.selectedVertices;

    let distance: number | null = null;
    let angle: number | null = null;

    if (indices.length >= 2) {
      const a = this.getMarker(indices[0]);
      const b = this.getMarker(indices[1]);
      if (a && b) {
        distance = a.position.distanceTo(b.position);
      }
    }

    if (indices.length === 3) {
      const p0 = this.getMarker(indices[0])?.position;
      const p1 = this.getMarker(indices[1])?.position;
      const p2 = this.getMarker(indices[2])?.position;

      if (p0 && p1 && p2) {
        const v1 = new THREE.Vector3().subVectors(p0, p1).normalize();
        const v2 = new THREE.Vector3().subVectors(p2, p1).normalize();
        angle = THREE.MathUtils.radToDeg(v1.angleTo(v2));
      }
    }

    store.setSelectedVertices([...indices], distance, angle);
  }

  private getMarker(idx: number) {
    return this.markers.find((m) => m.userData.pointIndex === idx);
  }
}
