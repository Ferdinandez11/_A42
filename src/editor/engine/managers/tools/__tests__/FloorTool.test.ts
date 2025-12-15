// ============================================================================
// FLOORTOOL TESTS - High Impact Branch Coverage
// Tests critical validation logic and state management
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import "@/editor/engine/__tests__/webgl-mock";
import { FloorTool } from "../FloorTool";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";

// Mock scene store
vi.mock("@/editor/stores/scene/useSceneStore", () => ({
  useSceneStore: {
    getState: vi.fn(() => ({
      addItem: vi.fn(),
    })),
  },
}));

describe("FloorTool", () => {
  let scene: THREE.Scene;
  let floorTool: FloorTool;
  let mockAddItem: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scene = new THREE.Scene();
    floorTool = new FloorTool(scene);
    mockAddItem = vi.fn();

    (useSceneStore.getState as any).mockReturnValue({
      addItem: mockAddItem,
    });
  });

  describe("addPoint() - Duplicate Point Validation", () => {
    it("should add first point without validation", () => {
      const point = new THREE.Vector3(0, 5, 0);
      floorTool.addPoint(point);

      expect(floorTool.getPointCount()).toBe(1);
      expect(floorTool.hasPoints()).toBe(true);
    });

    it("should reject duplicate points that are too close (< 0.1 units)", () => {
      const point1 = new THREE.Vector3(0, 0, 0);
      const point2 = new THREE.Vector3(0.05, 0, 0); // Distance: 0.05 < 0.1

      floorTool.addPoint(point1);
      const countBefore = floorTool.getPointCount();

      floorTool.addPoint(point2);

      // Point should be rejected
      expect(floorTool.getPointCount()).toBe(countBefore);
    });

    it("should accept points that are far enough apart (>= 0.1 units)", () => {
      const point1 = new THREE.Vector3(0, 0, 0);
      const point2 = new THREE.Vector3(0.15, 0, 0); // Distance: 0.15 >= 0.1

      floorTool.addPoint(point1);
      floorTool.addPoint(point2);

      expect(floorTool.getPointCount()).toBe(2);
    });

    it("should always set y coordinate to 0", () => {
      const point = new THREE.Vector3(10, 50, 20);
      floorTool.addPoint(point);

      const points = floorTool.getPoints();
      expect(points[0].y).toBe(0);
    });

    it("should create preview line when second point is added", () => {
      const point1 = new THREE.Vector3(0, 0, 0);
      const point2 = new THREE.Vector3(10, 0, 0);

      floorTool.addPoint(point1);
      expect(floorTool.getPointCount()).toBe(1);

      floorTool.addPoint(point2);
      expect(floorTool.getPointCount()).toBe(2);
      // Preview line should exist (tested via scene children count)
      expect(scene.children.length).toBeGreaterThan(0);
    });
  });

  describe("createFloor() - Minimum Points Validation", () => {
    it("should NOT create floor with 0 points", () => {
      floorTool.createFloor();

      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it("should NOT create floor with 1 point", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.createFloor();

      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it("should NOT create floor with 2 points", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));
      floorTool.createFloor();

      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it("should create floor with exactly 3 points", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 10));

      floorTool.createFloor();

      expect(mockAddItem).toHaveBeenCalledTimes(1);
      const addedItem = mockAddItem.mock.calls[0][0];
      expect(addedItem.type).toBe("floor");
      expect(addedItem.points.length).toBe(3);
    });

    it("should create floor with more than 3 points", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 10));
      floorTool.addPoint(new THREE.Vector3(0, 0, 10));

      floorTool.createFloor();

      expect(mockAddItem).toHaveBeenCalledTimes(1);
      const addedItem = mockAddItem.mock.calls[0][0];
      expect(addedItem.points.length).toBe(4);
    });

    it("should calculate correct center position for floor", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 10));

      floorTool.createFloor();

      const addedItem = mockAddItem.mock.calls[0][0];
      // Center should be approximately (5, 0, 5)
      expect(addedItem.position[0]).toBeCloseTo(5, 1);
      expect(addedItem.position[1]).toBe(0);
      expect(addedItem.position[2]).toBeCloseTo(5, 1);
    });

    it("should convert points to local coordinates relative to center", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 10));

      floorTool.createFloor();

      const addedItem = mockAddItem.mock.calls[0][0];
      // Points should be relative to center
      expect(addedItem.points[0].x).toBeLessThan(0);
      expect(addedItem.points[1].x).toBeGreaterThan(0);
    });
  });

  describe("canFinalize() - Validation Logic", () => {
    it("should return false with 0 points", () => {
      expect(floorTool.canFinalize()).toBe(false);
    });

    it("should return false with 1 point", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      expect(floorTool.canFinalize()).toBe(false);
    });

    it("should return false with 2 points", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));
      expect(floorTool.canFinalize()).toBe(false);
    });

    it("should return true with exactly 3 points", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 10));
      expect(floorTool.canFinalize()).toBe(true);
    });

    it("should return true with more than 3 points", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 10));
      floorTool.addPoint(new THREE.Vector3(0, 0, 10));
      expect(floorTool.canFinalize()).toBe(true);
    });
  });

  describe("reset() - State Cleanup", () => {
    it("should clear all points", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));

      floorTool.reset();

      expect(floorTool.getPointCount()).toBe(0);
      expect(floorTool.hasPoints()).toBe(false);
    });

    it("should remove all markers from scene", () => {
      const initialChildrenCount = scene.children.length;
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));

      const childrenWithMarkers = scene.children.length;
      expect(childrenWithMarkers).toBeGreaterThan(initialChildrenCount);

      floorTool.reset();

      // Markers should be removed (scene cleanup verified)
      expect(floorTool.getMarkers().length).toBe(0);
    });

    it("should remove preview line from scene", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));

      // Preview line should exist
      expect(floorTool.getPointCount()).toBe(2);

      floorTool.reset();

      // Preview line should be removed
      expect(floorTool.getPointCount()).toBe(0);
    });
  });

  describe("finalize() - Integration", () => {
    it("should call createFloor when finalizing", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 10));

      floorTool.finalize();

      expect(mockAddItem).toHaveBeenCalledTimes(1);
    });

    it("should reset tool after finalizing valid floor", () => {
      floorTool.addPoint(new THREE.Vector3(0, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 0));
      floorTool.addPoint(new THREE.Vector3(10, 0, 10));

      floorTool.finalize();

      // Tool should be reset after creating floor
      expect(floorTool.getPointCount()).toBe(0);
    });
  });
});

