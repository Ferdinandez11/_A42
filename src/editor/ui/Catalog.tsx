// --- START OF FILE src/features/editor/ui/Catalog.tsx ---
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';

import { useEditorStore } from '@/editor/stores/editor/useEditorStore';
import { useCatalogStore } from '@/editor/stores/catalog/useCatalogStore';
import {
  loadCatalogData,
  getCatalogDB,
  getCatalogLoadStatus,
  getProxiedImageUrl,
  type Product,
  type CatalogDB,
} from '@/core/services/catalogService';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface BreadcrumbItem {
  label: string;
  onClick: () => void;
  isActive: boolean;
}

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  showCategory?: boolean;
}

interface CategoryCardProps {
  name: string;
  productCount: number;
  imageUrl: string | null;
  onClick: () => void;
}

interface LineCardProps {
  name: string;
  imageUrl: string | null;
  onClick: () => void;
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

interface LoadingStateProps {
  message?: string;
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MESSAGES = {
  LOADING: 'Cargando catálogo...',
  ERROR_TITLE: 'Error al cargar el catálogo:',
  RETRY_BUTTON: 'Reintentar',
  NO_RESULTS: (term: string) => `No se encontraron productos para "${term}"`,
  NO_PRODUCTS: 'No hay productos disponibles aquí.',
  NO_CATEGORIES: 'No hay categorías en esta línea.',
  EMPTY_CATALOG: 'El catálogo está vacío.',
  CATALOG_TITLE: 'Catálogo',
  SEARCH_PLACEHOLDER: 'Buscar por nombre o ref...',
  SEARCH_RESULTS: (count: number) => `Resultados de búsqueda (${count})`,
  OUR_LINES: 'Nuestras Líneas',
  VIEW_COLLECTION: 'Ver Colección',
  PRODUCTS_COUNT: (count: number) => `${count} productos`,
  NO_IMAGE: 'Sin imagen',
} as const;

const GRID_CONFIGS = {
  PRODUCTS: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  CATEGORIES: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  LINES: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
} as const;

const CURRENCY_SYMBOL = '€';

// ============================================================================
// COMPONENTES DE ESTADO
// ============================================================================

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = MESSAGES.LOADING 
}) => (
  <div className="absolute inset-0 bg-neutral-900 bg-opacity-90 flex items-center justify-center z-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-white text-lg">{message}</p>
    </div>
  </div>
);

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => (
  <div className="absolute inset-0 bg-neutral-900 bg-opacity-90 flex flex-col items-center justify-center z-50 p-4">
    <p className="text-red-400 text-lg mb-4">{MESSAGES.ERROR_TITLE}</p>
    <p className="text-red-300 text-sm text-center mb-6 max-w-lg">{error}</p>
    <button
      onClick={onRetry}
      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
    >
      {MESSAGES.RETRY_BUTTON}
    </button>
  </div>
);

const EmptySearchState: React.FC<{ searchTerm: string }> = ({ searchTerm }) => (
  <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
    <Search size={48} className="mb-4 opacity-50" />
    <p className="text-xl">{MESSAGES.NO_RESULTS(searchTerm)}</p>
  </div>
);

// ============================================================================
// COMPONENTES DE TARJETAS
// ============================================================================

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  showCategory = false,
}) => {
  const handleClick = useCallback(() => {
    onSelect(product);
  }, [product, onSelect]);

  const imageUrl = useMemo(
    () => (product.img_2d ? getProxiedImageUrl(product.img_2d) : null),
    [product.img_2d]
  );

  const formattedPrice = useMemo(
    () => product.price.toLocaleString(),
    [product.price]
  );

  return (
    <div
      onClick={handleClick}
      className="group bg-neutral-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-neutral-700 hover:border-blue-500 cursor-pointer flex flex-col"
    >
      <div className="aspect-square bg-white/5 p-4 flex items-center justify-center relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span className="text-neutral-500 text-sm">{MESSAGES.NO_IMAGE}</span>
        )}
        {showCategory && (
          <span className="absolute top-2 right-2 bg-black/60 text-xs px-2 py-1 rounded text-white/70 backdrop-blur-sm">
            {product.category}
          </span>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col justify-between bg-neutral-800">
        <h3 className="text-white font-medium text-lg leading-tight mb-2">
          {product.name}
        </h3>
        <div className="flex justify-between items-end">
          <span className="text-xs text-neutral-500">{product.id}</span>
          <p className="text-green-400 font-bold">
            {formattedPrice} {CURRENCY_SYMBOL}
          </p>
        </div>
      </div>
    </div>
  );
};

const CategoryCard: React.FC<CategoryCardProps> = ({
  name,
  productCount,
  imageUrl,
  onClick,
}) => (
  <div
    onClick={onClick}
    className="relative h-48 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-blue-500/50 transition-all duration-300 group border border-neutral-700"
  >
    {imageUrl ? (
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
    ) : (
      <div className="absolute inset-0 bg-neutral-800" />
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
    <div className="absolute bottom-0 left-0 p-6 w-full">
      <h3 className="text-white text-2xl font-bold group-hover:translate-x-2 transition-transform">
        {name}
      </h3>
      <p className="text-neutral-300 text-sm mt-1 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
        {MESSAGES.PRODUCTS_COUNT(productCount)}
      </p>
    </div>
  </div>
);

const LineCard: React.FC<LineCardProps> = ({ name, imageUrl, onClick }) => (
  <div
    onClick={onClick}
    className="relative h-64 rounded-2xl overflow-hidden cursor-pointer shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 group border border-neutral-700"
  >
    {imageUrl ? (
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
    ) : (
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-700" />
    )}
    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
      <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider drop-shadow-lg transform group-hover:-translate-y-2 transition-transform duration-300">
        {name}
      </h3>
      <span className="mt-4 px-4 py-1 border border-white/30 rounded-full text-xs font-semibold text-white/80 uppercase tracking-widest backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
        {MESSAGES.VIEW_COLLECTION}
      </span>
    </div>
  </div>
);

// ============================================================================
// COMPONENTES DE NAVEGACIÓN
// ============================================================================

const Breadcrumbs: React.FC<{
  items: BreadcrumbItem[];
  isSearching: boolean;
}> = ({ items, isSearching }) => {
  if (isSearching) return null;

  return (
    <div className="flex items-center space-x-3 overflow-hidden flex-grow min-w-0">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-neutral-600 text-2xl">/</span>}
          <button
            onClick={item.onClick}
            className={`text-2xl font-bold whitespace-nowrap transition-colors ${
              item.isActive
                ? 'text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onClear }) => (
  <div className="relative w-full md:w-80">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search size={18} className="text-neutral-400" />
    </div>
    <input
      type="text"
      className="block w-full pl-10 pr-10 py-2 border border-neutral-700 rounded-full leading-5 bg-neutral-900/50 text-white placeholder-neutral-500 focus:outline-none focus:bg-neutral-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all"
      placeholder={MESSAGES.SEARCH_PLACEHOLDER}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {value && (
      <button
        onClick={onClear}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
      >
        <X size={18} />
      </button>
    )}
  </div>
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const Catalog: React.FC = (() => {
  // ==========================================================================
  // HOOKS Y ESTADO
  // ==========================================================================

  const { setMode } = useEditorStore();
  const { selectProduct } = useCatalogStore();

  const [catalogDB, setCatalogDB] = useState<CatalogDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentLine, setCurrentLine] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ==========================================================================
  // CARGA DE DATOS
  // ==========================================================================

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    await loadCatalogData();
    
    const status = getCatalogLoadStatus();
    if (status.error) {
      setError(status.error);
    } else if (status.isLoaded) {
      setCatalogDB(getCatalogDB());
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // ==========================================================================
  // DATOS DERIVADOS
  // ==========================================================================

  const allProducts = useMemo(() => {
    if (!catalogDB) return [];
    
    const products: Product[] = [];
    Object.values(catalogDB.lines).forEach((line) => {
      Object.values(line.categories).forEach((catProducts) => {
        products.push(...catProducts);
      });
    });
    
    return products;
  }, [catalogDB]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    
    const lowerTerm = searchTerm.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerTerm) ||
        p.id.toLowerCase().includes(lowerTerm)
    );
  }, [searchTerm, allProducts]);

  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        label: MESSAGES.CATALOG_TITLE,
        onClick: () => {
          setCurrentLine(null);
          setCurrentCategory(null);
          setSearchTerm('');
        },
        isActive: !currentLine && !searchTerm,
      },
    ];

    if (currentLine && !searchTerm) {
      items.push({
        label: currentLine,
        onClick: () => {
          setCurrentCategory(null);
          setSearchTerm('');
        },
        isActive: !currentCategory,
      });
    }

    if (currentCategory && !searchTerm) {
      items.push({
        label: currentCategory,
        onClick: () => {},
        isActive: true,
      });
    }

    return items;
  }, [currentLine, currentCategory, searchTerm]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSelectProduct = useCallback(
    (product: Product) => {
      selectProduct(product);
      setMode('placing_item');
    },
    [selectProduct, setMode]
  );

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const handleClose = useCallback(() => {
    setMode('idle');
  }, [setMode]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // ==========================================================================
  // RENDERIZADO DE CONTENIDO
  // ==========================================================================

  const renderContent = useCallback(() => {
    if (!catalogDB) return null;

    // BÚSQUEDA
    if (searchTerm) {
      if (filteredProducts.length === 0) {
        return <EmptySearchState searchTerm={searchTerm} />;
      }

      return (
        <>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            {MESSAGES.SEARCH_RESULTS(filteredProducts.length)}
          </h2>
          <div
            className={`grid ${GRID_CONFIGS.PRODUCTS} gap-6 custom-scrollbar pr-2 pb-20`}
            style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
          >
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={handleSelectProduct}
                showCategory
              />
            ))}
          </div>
        </>
      );
    }

    // PRODUCTOS DE CATEGORÍA
    if (currentLine && currentCategory) {
      const products = catalogDB.lines[currentLine]?.categories[currentCategory];

      if (!products || products.length === 0) {
        return (
          <p className="text-neutral-400 mt-10 text-center">
            {MESSAGES.NO_PRODUCTS}
          </p>
        );
      }

      return (
        <>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="opacity-50">{currentLine} /</span> {currentCategory}
          </h2>
          <div
            className={`grid ${GRID_CONFIGS.PRODUCTS} gap-6 custom-scrollbar pr-2 pb-20`}
            style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={handleSelectProduct}
              />
            ))}
          </div>
        </>
      );
    }

    // CATEGORÍAS
    if (currentLine) {
      const categories = catalogDB.lines[currentLine]?.categories;
      const categoryNames = Object.keys(categories || {});

      if (categoryNames.length === 0) {
        return (
          <p className="text-neutral-400 mt-10 text-center">
            {MESSAGES.NO_CATEGORIES}
          </p>
        );
      }

      return (
        <>
          <h2 className="text-2xl font-bold text-white mb-6">{currentLine}</h2>
          <div className={`grid ${GRID_CONFIGS.CATEGORIES} gap-6`}>
            {categoryNames.map((catName) => {
              const firstProduct = categories[catName][0];
              const imageUrl = firstProduct?.img_2d
                ? getProxiedImageUrl(firstProduct.img_2d)
                : null;

              return (
                <CategoryCard
                  key={catName}
                  name={catName}
                  productCount={categories[catName].length}
                  imageUrl={imageUrl}
                  onClick={() => setCurrentCategory(catName)}
                />
              );
            })}
          </div>
        </>
      );
    }

    // LÍNEAS (HOME)
    const lineNames = Object.keys(catalogDB.lines);
    if (lineNames.length === 0) {
      return (
        <p className="text-neutral-400 mt-10 text-center">
          {MESSAGES.EMPTY_CATALOG}
        </p>
      );
    }

    return (
      <>
        <h2 className="text-2xl font-bold text-white mb-6">
          {MESSAGES.OUR_LINES}
        </h2>
        <div className={`grid ${GRID_CONFIGS.LINES} gap-8`}>
          {lineNames.map((lineName) => {
            const lineData = catalogDB.lines[lineName];
            const imageUrl = lineData.lineImage
              ? getProxiedImageUrl(lineData.lineImage)
              : null;

            return (
              <LineCard
                key={lineName}
                name={lineName}
                imageUrl={imageUrl}
                onClick={() => setCurrentLine(lineName)}
              />
            );
          })}
        </div>
      </>
    );
  }, [
    catalogDB,
    searchTerm,
    filteredProducts,
    currentLine,
    currentCategory,
    handleSelectProduct,
  ]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={handleRetry} />;
  if (!catalogDB) return null;

  return (
    <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md z-40 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-white/10 bg-black/20 gap-4">
        <Breadcrumbs items={breadcrumbItems} isSearching={!!searchTerm} />
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onClear={handleClearSearch}
        />
        <button
          onClick={handleClose}
          className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all ml-2"
          aria-label="Cerrar catálogo"
        >
          <X size={32} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow p-6 overflow-hidden relative">
        {renderContent()}
      </div>
    </div>
  );
});

// ============================================================================
// EXPORTS ADICIONALES
// ============================================================================

export { ProductCard, CategoryCard, LineCard, SearchBar, Breadcrumbs };

// --- END OF FILE ---