// ============================================================================
// RAYCASTHANDLER TESTS - Branch & Decision Coverage
// Cubre:
// - raycastInteractionPlane: hit vs no hit
// - raycastObjects: delegación y flag recursive
// - findItemRoot: objeto ya es item, item en ancestro, sin item en la cadena
// - calculatePointer: cálculo de NDC (sin depender de WebGL real)
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";

import { RaycastHandler } from "../RaycastHandler";

describe("RaycastHandler", () => {
  let engine: any;
  let handler: RaycastHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    const canvas = {
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      })),
    } as unknown as HTMLCanvasElement;

    engine = {
      renderer: {
        domElement: canvas,
      },
      activeCamera: new THREE.PerspectiveCamera(),
      scene: new THREE.Scene(),
      interactionManager: {
        interactionPlane: new THREE.Mesh(),
      },
    };

    handler = new RaycastHandler(engine as any);

    // Stub internos del raycaster para no depender de geometría real
    const anyHandler = handler as any;
    anyHandler.raycaster.intersectObject = vi.fn();
    anyHandler.raycaster.intersectObjects = vi.fn();
    anyHandler.raycaster.setFromCamera = vi.fn();
  });

  describe("calculatePointer", () => {
    it("debe calcular coordenadas normalizadas a partir del MouseEvent", () => {
      // Cubre: lógica de normalización en calculatePointer
      const event = {
        clientX: 50,
        clientY: 50,
      } as MouseEvent;

      const anyHandler = handler as any;

      handler.calculatePointer(event);

      // Centro del canvas (50,50) debería dar NDC aprox (0,0)
      expect(anyHandler.pointer.x).toBeCloseTo(0, 5);
      expect(anyHandler.pointer.y).toBeCloseTo(0, 5);
      expect(anyHandler.raycaster.setFromCamera).toHaveBeenCalled();
    });
  });

  describe("raycastInteractionPlane", () => {
    it("debe devolver null cuando no hay hits", () => {
      // Cubre: rama hit.length === 0
      const anyHandler = handler as any;
      anyHandler.raycaster.intersectObject.mockReturnValue([]);

      const result = handler.raycastInteractionPlane();

      expect(result).toBeNull();
    });

    it("debe devolver el primer hit cuando hay intersecciones", () => {
      // Cubre: rama hit.length > 0 -> devuelve hit[0]
      const hit1 = { distance: 1 } as THREE.Intersection;
      const hit2 = { distance: 2 } as THREE.Intersection;

      const anyHandler = handler as any;
      anyHandler.raycaster.intersectObject.mockReturnValue([hit1, hit2]);

      const result = handler.raycastInteractionPlane();

      expect(result).toBe(hit1);
    });
  });

  describe("raycastObjects", () => {
    it("debe delegar en raycaster.intersectObjects con el flag recursive dado", () => {
      // Cubre: paso correcto del flag recursive
      const anyHandler = handler as any;
      const objects = [new THREE.Mesh(), new THREE.Mesh()];
      const hits: THREE.Intersection[] = [];

      anyHandler.raycaster.intersectObjects.mockReturnValue(hits);

      const result = handler.raycastObjects(objects, false);

      expect(anyHandler.raycaster.intersectObjects).toHaveBeenCalledWith(
        objects,
        false
      );
      expect(result).toBe(hits);
    });
  });

  describe("findItemRoot", () => {
    it("debe devolver el propio objeto cuando ya es item", () => {
      // Cubre: objeto con userData.isItem true directamente
      const item = new THREE.Object3D();
      item.userData.isItem = true;
      engine.scene.add(item);

      const result = handler.findItemRoot(item);

      expect(result).toBe(item);
    });

    it("debe subir por la jerarquía hasta encontrar un ancestro con isItem", () => {
      // Cubre: item en un ancestro intermedio
      const root = new THREE.Object3D();
      root.userData.isItem = true;

      const mid = new THREE.Object3D();
      const child = new THREE.Object3D();

      engine.scene.add(root);
      root.add(mid);
      mid.add(child);

      const result = handler.findItemRoot(child);

      expect(result).toBe(root);
    });

    it("debe devolver null si no hay ningún item en la cadena de padres", () => {
      // Cubre: bucle termina sin encontrar userData.isItem
      const root = new THREE.Object3D();
      const child = new THREE.Object3D();

      engine.scene.add(root);
      root.add(child);

      const result = handler.findItemRoot(child);

      expect(result).toBeNull();
    });
  });
});


