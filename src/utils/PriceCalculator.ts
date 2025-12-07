import type { SceneItem } from "@/types/editor";

/**
 * Base prices configuration
 */
export const PRICES = {
  FLOOR_M2: 35, // Price per m² for floors
  FENCE_M: 45, // Price per linear meter for fences
};

/**
 * Utility class for calculating prices and dimensions
 */
export class PriceCalculator {
  /**
   * Gets the total price for an item
   * @param item - Scene item to calculate price for
   * @returns Total price
   */
  static getItemPrice(item: SceneItem): number {
    // Floors (area-based)
    if (item.type === "floor" && item.points) {
      const area = this.calculateArea(item.points);
      const unitPrice = item.price > 0 ? item.price : PRICES.FLOOR_M2;
      return parseFloat((area * unitPrice).toFixed(2));
    }

    // Fences (length-based)
    if (item.type === "fence" && item.points) {
      const length = this.calculateLength(item.points);
      const unitPrice = item.price > 0 ? item.price : PRICES.FENCE_M;
      return parseFloat((length * unitPrice).toFixed(2));
    }

    // Standard 3D models
    return item.price || 0;
  }

  /**
   * Gets the dimension text for display (e.g., "12.50 m²")
   * @param item - Scene item to get dimensions for
   * @returns Formatted dimension string
   */
  static getItemDimensions(item: SceneItem): string {
    if (item.type === "floor" && item.points) {
      const area = this.calculateArea(item.points);
      return `${area.toFixed(2)} m²`;
    }

    if (item.type === "fence" && item.points) {
      const length = this.calculateLength(item.points);
      return `${length.toFixed(2)} ml`;
    }

    return "1 ud";
  }

  /**
   * Calculates the total price for a list of items
   * @param items - Array of scene items
   * @returns Total price
   */
  static calculateProjectTotal(items: SceneItem[]): number {
    return items.reduce(
      (total, item) => total + this.getItemPrice(item),
      0
    );
  }

  /**
   * Calculates the area of a polygon using the shoelace formula
   * @param points - Array of 2D points
   * @returns Area in square meters
   */
  private static calculateArea(points: { x: number; z: number }[]): number {
    if (!points || points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].z;
      area -= points[j].x * points[i].z;
    }

    return Math.abs(area) / 2;
  }

  /**
   * Calculates the total length of a polyline
   * @param points - Array of 2D points
   * @returns Length in meters
   */
  private static calculateLength(points: { x: number; z: number }[]): number {
    if (!points || points.length < 2) return 0;

    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const distance = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2)
      );
      length += distance;
    }

    return length;
  }
}