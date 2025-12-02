// --- START OF FILE src/utils/PriceCalculator.ts ---
import type { SceneItem } from '../stores/useAppStore';

// PRECIOS BASE (Configuración centralizada)
export const PRICES = {
    FLOOR_M2: 35,   // Precio por m² suelo
    FENCE_M: 45,    // Precio por metro lineal valla
};

export class PriceCalculator {

    // --- MÉTODOS PÚBLICOS ---

    /** Obtiene el precio total de un ítem */
    static getItemPrice(item: SceneItem): number {
        // 1. Suelos (Área)
        if (item.type === 'floor' && item.points) {
            const area = this.calculateArea(item.points);
            // Si el item tiene precio específico usamos ese, si no, el de tarifa base
            const unitPrice = item.price > 0 ? item.price : PRICES.FLOOR_M2;
            return parseFloat((area * unitPrice).toFixed(2));
        } 
        
        // 2. Vallas (Longitud)
        if (item.type === 'fence' && item.points) {
            const length = this.calculateLength(item.points);
            const unitPrice = item.price > 0 ? item.price : PRICES.FENCE_M;
            return parseFloat((length * unitPrice).toFixed(2));
        }

        // 3. Modelos 3D estándar
        return item.price || 0;
    }

    /** Obtiene el texto de dimensiones para mostrar (ej: "12.50 m²") */
    static getItemDimensions(item: SceneItem): string {
        if (item.type === 'floor' && item.points) {
            const area = this.calculateArea(item.points);
            return `${area.toFixed(2)} m²`;
        }
        if (item.type === 'fence' && item.points) {
            const length = this.calculateLength(item.points);
            return `${length.toFixed(2)} ml`;
        }
        return "1 ud";
    }

    /** Calcula el total de una lista de items */
    static calculateProjectTotal(items: SceneItem[]): number {
        return items.reduce((total, item) => total + this.getItemPrice(item), 0);
    }

    // --- MATEMÁTICAS INTERNAS (Privadas) ---

    private static calculateArea(points: { x: number, z: number }[]): number {
        if (!points || points.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].z;
            area -= points[j].x * points[i].z;
        }
        return Math.abs(area) / 2;
    }

    private static calculateLength(points: { x: number, z: number }[]): number {
        if (!points || points.length < 2) return 0;
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