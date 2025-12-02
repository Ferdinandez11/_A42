import 'three';
import type { SceneItem } from '../stores/useAppStore';

// PRECIOS BASE (Esto idealmente vendría de BBDD, pero para arrancar lo ponemos aquí)
const PRICES = {
    fence_wood: 45, // € por metro lineal
    floor_rubber: 60, // € por metro cuadrado
    default: 0 // Si no tiene precio definido
};

export class PriceCalculator {

    // Calcular distancia total de una línea de puntos (Vallas)
    static calculateLinearMeters(points: { x: number, z: number }[]): number {
        if (!points || points.length < 2) return 0;
        let totalLen = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
            totalLen += dist;
        }
        return parseFloat(totalLen.toFixed(2));
    }

    // Calcular área de un polígono (Suelos) - Algoritmo Shoelace
    static calculateSquareMeters(points: { x: number, z: number }[]): number {
        if (!points || points.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].z;
            area -= points[j].x * points[i].z;
        }
        return parseFloat((Math.abs(area) / 2).toFixed(2));
    }

    // Obtener precio de un ítem individual
    static getItemPrice(item: SceneItem): number {
        // 1. Si es VALLA
        if (item.type === 'fence' && item.points) {
            const meters = this.calculateLinearMeters(item.points);
            // Si el ítem tiene un precio base asignado en el store, lo usamos, si no, el de la constante
            const unitPrice = item.price > 0 ? item.price : PRICES.fence_wood; 
            return parseFloat((meters * unitPrice).toFixed(2));
        }

        // 2. Si es SUELO
        if (item.type === 'floor' && item.points) {
            const sqMeters = this.calculateSquareMeters(item.points);
            const unitPrice = item.price > 0 ? item.price : PRICES.floor_rubber;
            return parseFloat((sqMeters * unitPrice).toFixed(2));
        }

        // 3. Ítem NORMAL (Banco, Papelera...)
        return item.price || 0;
    }

    // Calcular total del proyecto
    static calculateProjectTotal(items: SceneItem[]): number {
        return items.reduce((total, item) => total + this.getItemPrice(item), 0);
    }
    
    // Obtener dimensiones para mostrar en texto (ej: "12.5 m²")
    static getItemDimensions(item: SceneItem): string {
        if (item.type === 'fence' && item.points) return `${this.calculateLinearMeters(item.points)} ml`;
        if (item.type === 'floor' && item.points) return `${this.calculateSquareMeters(item.points)} m²`;
        return '1 ud';
    }
}