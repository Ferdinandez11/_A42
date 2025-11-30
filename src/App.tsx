// --- START OF FILE src/App.tsx ---
import { Editor3D } from './features/editor/Editor3D';
import { useAppStore } from './stores/useAppStore';
import { Catalog } from './features/editor/ui/Catalog';

function App() {
  const { mode } = useAppStore();

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', margin: 0 }}>
      <Editor3D />
      {mode === 'catalog' && <Catalog />}
    </div>
  );
}

export default App;
// --- END OF FILE src/App.tsx ---