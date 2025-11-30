// --- START OF FILE src/App.tsx ---

import { Editor3D } from './features/editor/Editor3D';
import { useAppStore } from './stores/useAppStore'; // Importar useAppStore
import { Catalog } from './features/editor/ui/Catalog'; // Importar Catalog

function App() {
  const { mode, setMode } = useAppStore(); // Obtener mode y setMode del store

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', margin: 0 }}>
      <Editor3D />
      
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', zIndex: 10, fontFamily: 'sans-serif' }}>
        <h1>🏗️ A42 Engine (React Beta)</h1>
      </div>

      {/* SE HA ELIMINADO EL BOTÓN "Abrir Catálogo" DUPLICADO. */}
      {/* El botón de la Toolbar ya se encarga de abrir el catálogo. */}

      {/* Renderiza el Catálogo cuando el modo es 'catalog' */}
      {mode === 'catalog' && <Catalog />}
    </div>
  );
}

export default App;
// --- END OF FILE src/App.tsx ---