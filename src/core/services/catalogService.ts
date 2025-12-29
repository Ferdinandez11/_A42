import type { ProductDefinition } from "@/domain/types/catalog";
import { logDebug, logError } from "@/core/lib/logger";

// 🎨 Types
export type Product = ProductDefinition & { 
  description?: string;
  url_tech?: string;
  url_cert?: string;
  url_inst?: string;
};

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

interface CatalogLoadStatus {
  isLoaded: boolean;
  error: string | null;
}

interface ColumnIndices {
  ref: number;
  nombre: number;
  precio: number;
  categoria: number;
  glb: number;
  img: number;
  linea: number;
  imgLinea: number;
  urlTech: number;
  urlCert: number;
  urlInst: number;
  desc: number;
}

// 🎨 Constants
const GOOGLE_SHEET_CSV_URL = 
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfEbdFX3uyPiy45jEG3YLFsW9xqlbKfmdBigZzBStBjnVm1oWkw1AVesUcK11O0CXytHVeFY3l-gds/pub?output=csv";

const COLUMN_MAPPINGS = {
  ref: ['ref', 'id'],
  nombre: ['nombre', 'name'],
  precio: ['precio', 'price'],
  categoria: ['categoria', 'categoría', 'category'],
  glb: ['archivo_glb', 'glb', 'modelo'],
  img: ['img_2d', 'img', 'imagen'],
  linea: ['linea', 'línea', 'line'],
  imgLinea: ['img_linea', 'img_line', 'imagen_linea', 'foto_linea'],
  urlTech: ['url_tech', 'ficha_tecnica', 'ficha técnica'],
  urlCert: ['url_cert', 'certificado'],
  urlInst: ['url_inst', 'instrucciones', 'montaje'],
  desc: ['descripcion', 'descripción', 'description'],
} as const;

const DEFAULT_VALUES = {
  linea: 'General',
  categoria: 'Varios',
  precio: 0,
} as const;

const MIN_ROWS = 2;
const MIN_COLS = 3;

// 🎨 Module State
let catalogData: CatalogDB | null = null;
let loadError: string | null = null;
let isLoaded = false;

// 🎨 Helper Functions
/**
 * Cleans CSV cell content by removing surrounding quotes and whitespace
 */
const cleanCell = (text: string): string => {
  return text ? text.replace(/^"|"$/g, '').trim() : '';
};

/**
 * Finds column index by matching against possible header names (case-insensitive)
 */
const getColIndex = (headers: string[], possibleNames: readonly string[]): number => {
  const lowerHeaders = headers.map(h => cleanCell(h).toLowerCase());
  return lowerHeaders.findIndex(h => possibleNames.includes(h));
};

/**
 * Safely gets column value or returns undefined
 */
const getColumnValue = (
  cols: string[], 
  index: number
): string | undefined => {
  if (index < 0 || index >= cols.length) return undefined;
  // After bounds check, assert the value exists with !
  const value = cols[index]!;
  return value || undefined;
};

/**
 * Safely gets column value with fallback for invalid indices
 */
const safeGetColumnValue = (
  cols: string[],
  index: number,
  fallback: string = ''
): string => {
  if (index < 0 || index >= cols.length) return fallback;
  // After bounds check, assert the value exists with !
  const value = cols[index]!;
  return value || fallback;
};

/**
 * Identifies all required column indices from CSV headers
 * Returns -1 for columns that are not found
 */
const identifyColumns = (headers: string[]): ColumnIndices => {
  return {
    ref: getColIndex(headers, COLUMN_MAPPINGS.ref) ?? -1,
    nombre: getColIndex(headers, COLUMN_MAPPINGS.nombre) ?? -1,
    precio: getColIndex(headers, COLUMN_MAPPINGS.precio) ?? -1,
    categoria: getColIndex(headers, COLUMN_MAPPINGS.categoria) ?? -1,
    glb: getColIndex(headers, COLUMN_MAPPINGS.glb) ?? -1,
    img: getColIndex(headers, COLUMN_MAPPINGS.img) ?? -1,
    linea: getColIndex(headers, COLUMN_MAPPINGS.linea) ?? -1,
    imgLinea: getColIndex(headers, COLUMN_MAPPINGS.imgLinea) ?? -1,
    urlTech: getColIndex(headers, COLUMN_MAPPINGS.urlTech) ?? -1,
    urlCert: getColIndex(headers, COLUMN_MAPPINGS.urlCert) ?? -1,
    urlInst: getColIndex(headers, COLUMN_MAPPINGS.urlInst) ?? -1,
    desc: getColIndex(headers, COLUMN_MAPPINGS.desc) ?? -1,
  };
};

/**
 * Validates that required columns exist
 */
const validateRequiredColumns = (indices: ColumnIndices): void => {
  if (indices.nombre === -1 || indices.glb === -1) {
    throw new Error("Faltan columnas obligatorias en el CSV (Nombre o GLB).");
  }
};

/**
 * Parses a row into a Product object
 */
const parseProductFromRow = (
  cols: string[],
  indices: ColumnIndices,
  rowIndex: number
): Product | null => {
  if (cols.length < MIN_COLS) return null;

  // Use safeGetColumnValue for all required fields
  const ref = getColumnValue(cols, indices.ref) || `item_${rowIndex}`;
  const nombre = safeGetColumnValue(cols, indices.nombre, 'Sin Nombre');
  const precioStr = getColumnValue(cols, indices.precio);
  const precio = precioStr ? (parseFloat(precioStr) || DEFAULT_VALUES.precio) : DEFAULT_VALUES.precio;
  const linea = getColumnValue(cols, indices.linea) || DEFAULT_VALUES.linea;
  const categoria = getColumnValue(cols, indices.categoria) || DEFAULT_VALUES.categoria;
  const glbUrl = safeGetColumnValue(cols, indices.glb);

  // Skip if no GLB URL
  if (!glbUrl) return null;

  const product: Product = {
    id: ref,
    name: nombre,
    price: precio,
    type: 'model',
    modelUrl: glbUrl,
    img_2d: getColumnValue(cols, indices.img),
    line: linea,
    category: categoria,
    url_tech: getColumnValue(cols, indices.urlTech),
    url_cert: getColumnValue(cols, indices.urlCert),
    url_inst: getColumnValue(cols, indices.urlInst),
    description: getColumnValue(cols, indices.desc),
  };

  return product;
};

/**
 * Adds product to the catalog database structure
 */
const addProductToDB = (
  db: CatalogDB,
  product: Product,
  lineImageUrl?: string
): void => {
  // Ensure line and category are valid strings
  const line = product.line || DEFAULT_VALUES.linea;
  const category = product.category || DEFAULT_VALUES.categoria;

  // Initialize line if it doesn't exist
  if (!db.lines[line]) {
    db.lines[line] = { categories: {} };
  }

  // Set line image if provided and not already set
  if (lineImageUrl && !db.lines[line].lineImage) {
    db.lines[line].lineImage = lineImageUrl;
  }

  // Initialize category if it doesn't exist
  if (!db.lines[line].categories[category]) {
    db.lines[line].categories[category] = [];
  }

  // Add product to category
  db.lines[line].categories[category].push(product);
};

/**
 * Fetches and parses the CSV data from Google Sheets
 */
const fetchAndParseCsv = async (): Promise<CatalogDB> => {
  logDebug('Descargando CSV...', { context: 'CatalogService' });
  
  const response = await fetch(GOOGLE_SHEET_CSV_URL);
  
  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  const csvText = await response.text();
  const rows = csvText
    .split('\n')
    .map(r => r.trim())
    .filter(r => r.length > 0);

  if (rows.length < MIN_ROWS) {
    throw new Error("CSV vacío o sin datos.");
  }

  return parseCsvRows(rows);
};

/**
 * Parses CSV rows into a CatalogDB structure
 */
const parseCsvRows = (rows: string[]): CatalogDB => {
  const headers = rows[0].split(',');
  const indices = identifyColumns(headers);
  validateRequiredColumns(indices);

  const tempDB: CatalogDB = { lines: {} };

  // Process data rows (skip header)
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(',').map(cleanCell);
    const product = parseProductFromRow(cols, indices, i);
    
    if (product) {
      const lineImageUrl = getColumnValue(cols, indices.imgLinea);
      addProductToDB(tempDB, product, lineImageUrl);
    }
  }

  return tempDB;
};

// 🎨 Public API
/**
 * Loads catalog data from Google Sheets CSV
 * Only loads once - subsequent calls return immediately if already loaded
 */
export const loadCatalogData = async (): Promise<void> => {
  // Return early if already loaded
  if (isLoaded && catalogData) {
    return;
  }

  try {
    catalogData = await fetchAndParseCsv();
    isLoaded = true;
    loadError = null;
    
    logDebug('CSV procesado correctamente. Datos cargados', { 
      context: 'CatalogService', 
      meta: { catalogData } 
    });
  } catch (err: unknown) {
    loadError = err instanceof Error ? `Error CSV: ${err.message}` : `Error CSV: ${String(err)}`;
    // Error is stored in loadError and can be retrieved via getCatalogLoadStatus
    logError('Error al procesar CSV', err, { context: 'CatalogService' });
    isLoaded = false;
    catalogData = null;
  }
};

/**
 * Returns the loaded catalog database
 * Returns null if not yet loaded or if load failed
 */
export const getCatalogDB = (): CatalogDB | null => {
  return catalogData;
};

/**
 * Returns the current load status of the catalog
 */
export const getCatalogLoadStatus = (): CatalogLoadStatus => {
  return { 
    isLoaded, 
    error: loadError 
  };
};

/**
 * Returns a proxied image URL (currently returns URL as-is)
 * Can be extended to use a proxy service if needed
 */
export const getProxiedImageUrl = (url: string): string => {
  return url;
};