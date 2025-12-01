// --- START OF FILE src/features/editor/utils/PriceCalculator.ts ---
import type { SceneItem } from "../../../stores/useAppStore";

// --- CONFIGURACIÓN DE PRECIOS BASE ---
export const PRICES = {
    FLOOR_M2: 35,   // Precio por metro cuadrado de suelo
    FENCE_M: 42,    // Precio por metro lineal de valla
};

export class PriceCalculator {

    /**
     * Calcula el precio total de un item basado en su tipo y geometría.
     */
    public static getItemPrice(item: SceneItem): number {
        if (item.type === 'floor' && item.points) {
            const area = this.calculateArea(item.points);
            return area * PRICES.FLOOR_M2;
        } 
        
        if (item.type === 'fence' && item.points) {
            const length = this.calculateLength(item.points);
            return length * PRICES.FENCE_M;
        }

        // Si es un modelo 3D estándar, devolvemos su precio fijo
        return item.price || 0;
    }

    /**
     * Obtiene una cadena de texto con las dimensiones (ej: "24.50 m²")
     */
    public static getItemDimensions(item: SceneItem): string {
        if (item.type === 'floor' && item.points) {
            const area = this.calculateArea(item.points);
            return `${area.toFixed(2)} m²`;
        }
        
        if (item.type === 'fence' && item.points) {
            const length = this.calculateLength(item.points);
            return `${length.toFixed(2)} m`;
        }

        return "1 ud";
    }

    // --- MATEMÁTICAS INTERNAS ---

    private static calculateArea(points: { x: number, z: number }[]): number {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].z;
            area -= points[j].x * points[i].z;
        }
        return Math.abs(area) / 2;
    }

    private static calculateLength(points: { x: number, z: number }[]): number {
        let length = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
            length += dist;
        }
        return length;
    }
}
// --- END OF FILE src/features/editor/utils/PriceCalculator.ts ---