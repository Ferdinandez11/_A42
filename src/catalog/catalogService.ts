// --- START OF FILE src/catalog/catalogService.ts ---

import type { ProductDefinition } from '../stores/useAppStore'; 

export type Product = ProductDefinition;

export interface CatalogDB {
  lines: {
    [lineName: string]: {
      lineImage?: string; // Nuevo campo para la imagen de la línea
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

const cleanCell = (text: string) => text ? text.replace(/^"|"$/g, '').trim() : '';

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

    const headers = rows[0].split(','); 
    
    // Mapeo de columnas (Añadido IMG_LINEA)
    const idxRef = getColIndex(headers, ['ref', 'id']);
    const idxNombre = getColIndex(headers, ['nombre', 'name']);
    const idxPrecio = getColIndex(headers, ['precio', 'price']);
    const idxCategoria = getColIndex(headers, ['categoria', 'categoría', 'category']);
    const idxGlb = getColIndex(headers, ['archivo_glb', 'glb', 'modelo']);
    const idxImg = getColIndex(headers, ['img_2d', 'img', 'imagen']);
    const idxLinea = getColIndex(headers, ['linea', 'línea', 'line']);
    
    // NUEVO: Buscamos la columna de imagen de línea
    const idxImgLinea = getColIndex(headers, ['img_linea', 'img_line', 'imagen_linea', 'foto_linea']);

    if (idxNombre === -1 || idxGlb === -1) {
      throw new Error("Faltan columnas obligatorias en el CSV.");
    }

    const tempDB: CatalogDB = { lines: {} };

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(',').map(cleanCell);
      if (cols.length < 3) continue;

      const ref = idxRef > -1 ? cols[idxRef] : `item_${i}`;
      const nombre = cols[idxNombre] || 'Sin Nombre';
      const precio = idxPrecio > -1 ? (parseFloat(cols[idxPrecio]) || 0) : 0;
      const linea = idxLinea > -1 ? (cols[idxLinea] || 'General') : 'General';
      const categoria = idxCategoria > -1 ? (cols[idxCategoria] || 'Varios') : 'Varios';
      const glbUrl = cols[idxGlb];
      const imgUrl = idxImg > -1 ? cols[idxImg] : undefined;
      
      // Capturamos la imagen de la línea si existe la columna
      const lineImgUrl = idxImgLinea > -1 ? cols[idxImgLinea] : undefined;

      if (!glbUrl) continue;

      const product: Product = {
        id: ref,
        name: nombre,
        price: precio,
        type: 'model' as any, 
        modelUrl: glbUrl,
        img_2d: imgUrl,
        line: linea,
        category: categoria
      };

      if (!tempDB.lines[linea]) {
        tempDB.lines[linea] = { categories: {} };
      }
      
      // Si encontramos una URL de imagen para la línea en esta fila, la guardamos.
      // (Sobrescribirá si hay varias, pero asumimos que son iguales para la misma línea)
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
    console.log('[CatalogService] CSV procesado:', catalogData);

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