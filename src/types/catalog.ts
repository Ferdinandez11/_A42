// ============================================================================
// CATALOG TYPE DEFINITIONS
// Type definitions for product catalog system
// ============================================================================

/**
 * Product type discriminator
 * Currently supports 3D models, can be extended for other types
 */
export type ProductType = 'model' | 'material' | 'texture' | 'component';

/**
 * Product line categories
 * Represents major product families in the catalog
 */
export type ProductLine = 'General' | 'Premium' | 'Custom' | string;

/**
 * Product category within a line
 * Used for organizing products within their line
 */
export type ProductCategory = 'Varios' | string;

/**
 * Core product definition
 * Represents a single product in the catalog
 */
export interface ProductDefinition {
  // Required fields
  /** Unique product identifier */
  id: string;
  
  /** Display name of the product */
  name: string;
  
  /** Price in euros (base currency) */
  price: number;
  
  /** Product type discriminator */
  type: ProductType;
  
  /** URL to the 3D model file (GLB format) */
  modelUrl: string;
  
  // Optional display fields
  /** URL to 2D preview image */
  img_2d?: string;
  
  /** Product line/family */
  line?: ProductLine;
  
  /** Category within the line */
  category?: ProductCategory;
  
  // Optional documentation fields
  /** URL to technical specification sheet */
  url_tech?: string;
  
  /** URL to certification documents */
  url_cert?: string;
  
  /** URL to installation instructions */
  url_inst?: string;
  
  /** Detailed product description */
  description?: string;
}

/**
 * Product with computed or extended properties
 * Used when additional runtime data is needed
 */
export interface ExtendedProduct extends ProductDefinition {
  /** Whether product is currently in stock */
  inStock?: boolean;
  
  /** Quantity available */
  quantity?: number;
  
  /** Discount percentage (0-100) */
  discount?: number;
  
  /** Final price after discount */
  finalPrice?: number;
  
  /** Whether product is featured */
  featured?: boolean;
  
  /** Tags for search/filtering */
  tags?: string[];
}

/**
 * Product search/filter criteria
 */
export interface ProductFilter {
  /** Filter by line */
  line?: ProductLine;
  
  /** Filter by category */
  category?: ProductCategory;
  
  /** Filter by type */
  type?: ProductType;
  
  /** Minimum price */
  minPrice?: number;
  
  /** Maximum price */
  maxPrice?: number;
  
  /** Search query (matches name, description) */
  query?: string;
  
  /** Filter by availability */
  inStock?: boolean;
  
  /** Filter by tags */
  tags?: string[];
}

/**
 * Catalog organization structure
 * Groups products by line and category
 */
export interface CatalogStructure {
  lines: {
    [lineName: string]: {
      /** Optional image representing the product line */
      lineImage?: string;
      
      /** Products organized by category */
      categories: {
        [categoryName: string]: ProductDefinition[];
      };
    };
  };
}

/**
 * Product sorting options
 */
export type ProductSortBy = 
  | 'name-asc' 
  | 'name-desc' 
  | 'price-asc' 
  | 'price-desc' 
  | 'newest' 
  | 'popular';

/**
 * Catalog statistics
 */
export interface CatalogStats {
  /** Total number of products */
  totalProducts: number;
  
  /** Number of product lines */
  totalLines: number;
  
  /** Number of categories */
  totalCategories: number;
  
  /** Average product price */
  averagePrice: number;
  
  /** Price range */
  priceRange: {
    min: number;
    max: number;
  };
}

// ============================================================================
// TYPE GUARDS
// Helper functions to check product types at runtime
// ============================================================================

/**
 * Checks if a product is a 3D model
 */
export const isModelProduct = (product: ProductDefinition): boolean => {
  return product.type === 'model' && !!product.modelUrl;
};

/**
 * Checks if a product has technical documentation
 */
export const hasTechnicalDocs = (product: ProductDefinition): boolean => {
  return !!(product.url_tech || product.url_cert || product.url_inst);
};

/**
 * Checks if a product has a 2D preview
 */
export const hasPreviewImage = (product: ProductDefinition): boolean => {
  return !!product.img_2d;
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Makes all optional fields required
 */
export type CompleteProduct = Required<ProductDefinition>;

/**
 * Product without price information (for public display)
 */
export type PublicProduct = Omit<ProductDefinition, 'price'>;

/**
 * Minimal product info for lists
 */
export type ProductSummary = Pick<
  ProductDefinition, 
  'id' | 'name' | 'price' | 'img_2d'
>;