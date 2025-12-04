// --- START OF FILE src/catalog/catalogService.ts ---

import type { ProductDefinition } from "@/types/catalog";

// Extendemos el tipo para que TypeScript no se queje de la descripción si no está en el store original
export type Product = ProductDefinition & { description?: string };

export interface CatalogDB {
  lines: {
    [lineName: string]: {
      lineImage?: string; 
      categories: {
        [categoryName: string]: Product[];
      };
    };
  };
}

let catalogData: CatalogDB | null = null;
let loadError: string | null = null;
let isLoaded = false;

// URL de tu Google Sheet
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfEbdFX3uyPiy45jEG3YLFsW9xqlbKfmdBigZzBStBjnVm1oWkw1AVesUcK11O0CXytHVeFY3l-gds/pub?output=csv";

// Helper para limpiar comillas extras del CSV
const cleanCell = (text: string) => text ? text.replace(/^"|"$/g, '').trim() : '';

// Helper para buscar índices ignorando mayúsculas/minúsculas
const getColIndex = (headers: string[], possibleNames: string[]) => {
  const lowerHeaders = headers.map(h => cleanCell(h).toLowerCase());
  return lowerHeaders.findIndex(h => possibleNames.includes(h));
};

export const loadCatalogData = async () => {
  if (isLoaded && catalogData) return; 

  try {
    console.log('[CatalogService] Descargando CSV...');
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = csvText.split('\n').map(r => r.trim()).filter(r => r.length > 0);
    if (rows.length < 2) throw new Error("CSV vacío o sin datos.");

    // Procesar cabeceras
    const headers = rows[0].split(','); 
    
    // --- 1. IDENTIFICAR COLUMNAS (Aquí es donde añadimos las nuevas) ---
    const idxRef = getColIndex(headers, ['ref', 'id']);
    const idxNombre = getColIndex(headers, ['nombre', 'name']);
    const idxPrecio = getColIndex(headers, ['precio', 'price']);
    const idxCategoria = getColIndex(headers, ['categoria', 'categoría', 'category']);
    const idxGlb = getColIndex(headers, ['archivo_glb', 'glb', 'modelo']);
    const idxImg = getColIndex(headers, ['img_2d', 'img', 'imagen']);
    const idxLinea = getColIndex(headers, ['linea', 'línea', 'line']);
    const idxImgLinea = getColIndex(headers, ['img_linea', 'img_line', 'imagen_linea', 'foto_linea']);
    
    // NUEVAS COLUMNAS (Las que faltaban)
    const idxUrlTech = getColIndex(headers, ['url_tech', 'ficha_tecnica', 'ficha técnica']);
    const idxUrlCert = getColIndex(headers, ['url_cert', 'certificado']);
    const idxUrlInst = getColIndex(headers, ['url_inst', 'instrucciones', 'montaje']);
    const idxDesc    = getColIndex(headers, ['descripcion', 'descripción', 'description']);
    // ------------------------------------------------------------------

    if (idxNombre === -1 || idxGlb === -1) {
      throw new Error("Faltan columnas obligatorias en el CSV (Nombre o GLB).");
    }

    const tempDB: CatalogDB = { lines: {} };

    // Procesar filas
    for (let i = 1; i < rows.length; i++) {
      // Nota: split(',') es básico, si una descripción tiene comas dentro podría romperse.
      // Para descripciones complejas se recomienda una librería parser CSV real, 
      // pero para esto servirá si no hay comas en los textos.
      const cols = rows[i].split(',').map(cleanCell);
      
      if (cols.length < 3) continue;

      const ref = idxRef > -1 ? cols[idxRef] : `item_${i}`;
      const nombre = cols[idxNombre] || 'Sin Nombre';
      const precio = idxPrecio > -1 ? (parseFloat(cols[idxPrecio]) || 0) : 0;
      const linea = idxLinea > -1 ? (cols[idxLinea] || 'General') : 'General';
      const categoria = idxCategoria > -1 ? (cols[idxCategoria] || 'Varios') : 'Varios';
      const glbUrl = cols[idxGlb];
      const imgUrl = idxImg > -1 ? cols[idxImg] : undefined;
      const lineImgUrl = idxImgLinea > -1 ? cols[idxImgLinea] : undefined;

      // --- 2. EXTRAER DATOS NUEVOS ---
      const urlTech = idxUrlTech > -1 ? cols[idxUrlTech] : undefined;
      const urlCert = idxUrlCert > -1 ? cols[idxUrlCert] : undefined;
      const urlInst = idxUrlInst > -1 ? cols[idxUrlInst] : undefined;
      const desc    = idxDesc > -1    ? cols[idxDesc]    : undefined;
      // -------------------------------

      if (!glbUrl) continue;

      // --- 3. CREAR OBJETO PRODUCTO ---
      const product: Product = {
        id: ref,
        name: nombre,
        price: precio,
        type: 'model' as any, 
        modelUrl: glbUrl,
        img_2d: imgUrl,
        line: linea,
        category: categoria,
        
        // AÑADIMOS LAS PROPIEDADES AL OBJETO
        url_tech: urlTech,
        url_cert: urlCert,
        url_inst: urlInst,
        description: desc 
      };

      // Organizar en categorías
      if (!tempDB.lines[linea]) {
        tempDB.lines[linea] = { categories: {} };
      }
      
      if (lineImgUrl && !tempDB.lines[linea].lineImage) {
        tempDB.lines[linea].lineImage = lineImgUrl;
      }

      if (!tempDB.lines[linea].categories[categoria]) {
        tempDB.lines[linea].categories[categoria] = [];
      }

      tempDB.lines[linea].categories[categoria].push(product);
    }

    catalogData = tempDB;
    isLoaded = true;
    console.log('[CatalogService] CSV procesado correctamente. Datos cargados:', catalogData);

  } catch (err: any) {
    loadError = `Error CSV: ${err.message || err}`;
    console.error('[CatalogService]', err);
    isLoaded = false;
  }
};

export const getCatalogDB = (): CatalogDB | null => catalogData;
export const getCatalogLoadStatus = () => ({ isLoaded, error: loadError });

export const getProxiedImageUrl = (url: string): string => {
  return url;
};
// --- END OF FILE src/catalog/catalogService.ts ---