// --- START OF FILE src/features/editor/ui/Catalog.tsx ---
import React, { useEffect, useState, useMemo } from 'react';
import { Search, X } from 'lucide-react'; // Importamos iconos
import { useAppStore } from '../../../stores/useAppStore';
import { 
  loadCatalogData, 
  getCatalogDB, 
  getCatalogLoadStatus, 
  getProxiedImageUrl,
  type Product,
  type CatalogDB
} from '../../../catalog/catalogService';

export const Catalog = () => {
  const { setMode, setSelectedProduct } = useAppStore();
  const [catalogDB, setCatalogDB] = useState<CatalogDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navegación
  const [currentLine, setCurrentLine] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  
  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCatalog = async () => {
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
    };
    fetchCatalog();
  }, []);

  // --- LÓGICA DE BÚSQUEDA ---
  // Aplanamos el catálogo para buscar en todos los productos a la vez
  const allProducts = useMemo(() => {
    if (!catalogDB) return [];
    const products: Product[] = [];
    Object.values(catalogDB.lines).forEach(line => {
      Object.values(line.categories).forEach(catProducts => {
        products.push(...catProducts);
      });
    });
    return products;
  }, [catalogDB]);

  // Filtramos según lo que escriba el usuario
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(lowerTerm) || 
      p.id.toLowerCase().includes(lowerTerm) // Buscamos también por REF/ID
    );
  }, [searchTerm, allProducts]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setMode('placing_item');
  };

  const handleBackToLines = () => {
    setCurrentCategory(null);
    setCurrentLine(null);
    setSearchTerm(''); // Limpiar búsqueda al navegar con breadcrumbs
  };

  const handleBackToCategories = () => {
    setCurrentCategory(null);
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-neutral-900 bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 bg-neutral-900 bg-opacity-90 flex flex-col items-center justify-center z-50 p-4">
        <p className="text-red-400 text-lg mb-4">Error al cargar el catálogo:</p>
        <p className="text-red-300 text-sm text-center mb-6 max-w-lg">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Reintentar</button>
      </div>
    );
  }

  if (!catalogDB) return null;

  // --- RENDERIZADO DEL CONTENIDO ---

  const renderContent = () => {
    // 0. VISTA DE BÚSQUEDA (Si hay texto en el buscador)
    if (searchTerm) {
      if (filteredProducts.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
            <Search size={48} className="mb-4 opacity-50" />
            <p className="text-xl">No se encontraron productos para "{searchTerm}"</p>
          </div>
        );
      }
      return (
        <>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            Resultados de búsqueda ({filteredProducts.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 custom-scrollbar pr-2 pb-20" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group bg-neutral-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-neutral-700 hover:border-blue-500 cursor-pointer flex flex-col"
                onClick={() => handleSelectProduct(product)}
              >
                <div className="aspect-square bg-white/5 p-4 flex items-center justify-center relative overflow-hidden">
                  {product.img_2d ? (
                    <img src={getProxiedImageUrl(product.img_2d)} alt={product.name} className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <span className="text-neutral-500 text-sm">Sin imagen</span>
                  )}
                  {/* Etiqueta pequeña para saber de qué línea viene al buscar */}
                  <span className="absolute top-2 right-2 bg-black/60 text-xs px-2 py-1 rounded text-white/70 backdrop-blur-sm">
                    {product.category}
                  </span>
                </div>
                <div className="p-4 flex-grow flex flex-col justify-between bg-neutral-800">
                  <h3 className="text-white font-medium text-lg leading-tight mb-2">{product.name}</h3>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-neutral-500">{product.id}</span>
                    <p className="text-green-400 font-bold">{product.price.toLocaleString()} €</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }

    // 1. VISTA DE PRODUCTOS DE CATEGORÍA
    if (currentLine && currentCategory) {
      const products = catalogDB.lines[currentLine]?.categories[currentCategory];
      
      if (!products || products.length === 0) return <p className="text-neutral-400 mt-10 text-center">No hay productos disponibles aquí.</p>;

      return (
        <>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="opacity-50">{currentLine} /</span> {currentCategory}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 custom-scrollbar pr-2 pb-20" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {products.map((product) => (
              <div
                key={product.id}
                className="group bg-neutral-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-neutral-700 hover:border-blue-500 cursor-pointer flex flex-col"
                onClick={() => handleSelectProduct(product)}
              >
                <div className="aspect-square bg-white/5 p-4 flex items-center justify-center relative overflow-hidden">
                  {product.img_2d ? (
                    <img src={getProxiedImageUrl(product.img_2d)} alt={product.name} className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <span className="text-neutral-500 text-sm">Sin imagen</span>
                  )}
                </div>
                <div className="p-4 flex-grow flex flex-col justify-between bg-neutral-800">
                  <h3 className="text-white font-medium text-lg leading-tight mb-2">{product.name}</h3>
                  <p className="text-green-400 font-bold">{product.price.toLocaleString()} €</p>
                </div>
              </div>
            ))}
          </div>
        </>
      );

    // 2. VISTA DE CATEGORÍAS
    } else if (currentLine) {
      const categories = catalogDB.lines[currentLine]?.categories;
      const categoryNames = Object.keys(categories || {});

      if (categoryNames.length === 0) return <p className="text-neutral-400 mt-10 text-center">No hay categorías en esta línea.</p>;

      return (
        <>
          <h2 className="text-2xl font-bold text-white mb-6">{currentLine}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categoryNames.map((catName) => {
              const firstProduct = categories[catName][0];
              const bgImage = firstProduct?.img_2d ? getProxiedImageUrl(firstProduct.img_2d) : null;

              return (
                <div
                  key={catName}
                  onClick={() => setCurrentCategory(catName)}
                  className="relative h-48 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-blue-500/50 transition-all duration-300 group border border-neutral-700"
                >
                  {bgImage ? (
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url(${bgImage})` }} />
                  ) : (
                    <div className="absolute inset-0 bg-neutral-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute bottom-0 left-0 p-6 w-full">
                    <h3 className="text-white text-2xl font-bold group-hover:translate-x-2 transition-transform">{catName}</h3>
                    <p className="text-neutral-300 text-sm mt-1 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                      {categories[catName].length} productos
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );

    // 3. VISTA DE LÍNEAS (Home)
    } else {
      const lineNames = Object.keys(catalogDB.lines);
      if (lineNames.length === 0) return <p className="text-neutral-400 mt-10 text-center">El catálogo está vacío.</p>;

      return (
        <>
          <h2 className="text-2xl font-bold text-white mb-6">Nuestras Líneas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lineNames.map((lineName) => {
              const lineData = catalogDB.lines[lineName];
              const bgImage = lineData.lineImage ? getProxiedImageUrl(lineData.lineImage) : null;

              return (
                <div
                  key={lineName}
                  onClick={() => setCurrentLine(lineName)}
                  className="relative h-64 rounded-2xl overflow-hidden cursor-pointer shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 group border border-neutral-700"
                >
                  {bgImage ? (
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${bgImage})` }} />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-700" />
                  )}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                    <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider drop-shadow-lg transform group-hover:-translate-y-2 transition-transform duration-300">
                      {lineName}
                    </h3>
                    <span className="mt-4 px-4 py-1 border border-white/30 rounded-full text-xs font-semibold text-white/80 uppercase tracking-widest backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                      Ver Colección
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    }
  };

  return (
    <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md z-40 flex flex-col animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-white/10 bg-black/20 gap-4">
        {/* Breadcrumbs (Navegación) */}
        <div className="flex items-center space-x-3 overflow-hidden flex-grow min-w-0">
          <button 
            onClick={() => { setCurrentLine(null); setCurrentCategory(null); setSearchTerm(''); }}
            className={`text-2xl font-bold transition-colors ${(!currentLine && !searchTerm) ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            Catálogo
          </button>
          
          {currentLine && !searchTerm && (
            <>
              <span className="text-neutral-600 text-2xl">/</span>
              <button
                onClick={handleBackToLines}
                className={`text-2xl font-bold whitespace-nowrap transition-colors ${!currentCategory ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                {currentLine}
              </button>
            </>
          )}
          
          {currentCategory && !searchTerm && (
            <>
              <span className="text-neutral-600 text-2xl">/</span>
              <span className="text-2xl font-bold text-white whitespace-nowrap truncate">
                {currentCategory}
              </span>
            </>
          )}
        </div>

        {/* BUSCADOR */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-neutral-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2 border border-neutral-700 rounded-full leading-5 bg-neutral-900/50 text-white placeholder-neutral-500 focus:outline-none focus:bg-neutral-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all"
            placeholder="Buscar por nombre o ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* BOTÓN CERRAR */}
        <button
          onClick={() => setMode('idle')}
          className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all ml-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      {/* BODY */}
      <div className="flex-grow p-6 overflow-hidden relative">
        {renderContent()}
      </div>
    </div>
  );
};
// --- END OF FILE src/features/editor/ui/Catalog.tsx ---