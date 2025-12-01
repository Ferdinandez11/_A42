// --- START OF FILE src/features/editor/ui/FenceProperties.tsx ---
//import React from 'react';
import { useAppStore } from '../../../stores/useAppStore';
import { FENCE_PRESETS } from '../data/fence_presets';
import { Fence, Palette } from 'lucide-react';
import { CadControl } from './CadControl';

export const FenceProperties = () => {
  const { selectedItemId, items, mode, fenceConfig, setFenceConfig, updateItemFenceConfig } = useAppStore();
  
  const selectedItem = selectedItemId ? items.find(i => i.uuid === selectedItemId) : null;
  const isEditing = selectedItem && selectedItem.type === 'fence';

  if (mode !== 'drawing_fence' && !isEditing) return null;

  const currentConfig = isEditing && selectedItem?.fenceConfig ? selectedItem.fenceConfig : fenceConfig;
  const currentPreset = FENCE_PRESETS[currentConfig.presetId] || FENCE_PRESETS['wood'];

  // --- LÓGICA MEJORADA: CONSERVAR COLORES ---
  const handlePresetChange = (key: string) => {
     const preset = FENCE_PRESETS[key];
     
     // Mezclamos los colores por defecto del nuevo preset con los que ya tienes.
     // Esto conserva tus cambios si coinciden las propiedades (ej: post, slatA).
     const newConfig = {
         presetId: key,
         colors: { 
             ...preset.defaultColors, // Base: colores por defecto del nuevo
             ...currentConfig.colors  // Sobrescribe con TUS colores actuales
         }
     };

     if (isEditing && selectedItem) {
         updateItemFenceConfig(selectedItem.uuid, newConfig);
     } else {
         setFenceConfig(newConfig);
     }
  };

  const handleColorChange = (key: 'post' | 'slatA' | 'slatB' | 'slatC', hex: string) => {
      const colorInt = parseInt(hex.replace('#', '0x'));
      const newColors = { ...currentConfig.colors, [key]: colorInt };
      
      if (isEditing && selectedItem) {
          updateItemFenceConfig(selectedItem.uuid, { colors: newColors });
      } else {
          setFenceConfig({ colors: newColors });
      }
  };

  const toHex = (num: number) => '#' + num.toString(16).padStart(6, '0');

  return (
    <div className="absolute top-20 right-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl p-4 shadow-xl z-20 w-80 animate-in fade-in slide-in-from-right-2">
      
      <CadControl />

      <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
        <Fence size={16} /> {isEditing ? 'Editar Valla' : 'Nueva Valla'}
      </h3>

      {/* SELECTOR DE MODELO */}
      <div className="mb-4">
          <label className="text-xs text-neutral-400 mb-2 block uppercase font-bold">Modelo</label>
          <div className="grid grid-cols-2 gap-2">
              {Object.entries(FENCE_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetChange(key)}
                    className={`text-xs p-2 rounded border text-left transition-all ${currentConfig.presetId === key ? 'bg-blue-600 border-blue-400 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'}`}
                  >
                      {preset.name}
                  </button>
              ))}
          </div>
      </div>

      {/* COLORES */}
      <div className="space-y-3">
         <label className="text-xs text-neutral-400 block uppercase font-bold flex items-center gap-2">
             <Palette size={12} /> Personalización
         </label>
         
         <div className="flex items-center justify-between">
             <span className="text-xs text-neutral-300">Postes / Estructura</span>
             <input 
                type="color" 
                value={toHex(currentConfig.colors.post)} 
                onChange={(e) => handleColorChange('post', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
             />
         </div>

         <div className="flex items-center justify-between">
             <span className="text-xs text-neutral-300">
                {currentPreset.isSolidPanel ? 'Panel' : 'Lamas Principales'}
             </span>
             <input 
                type="color" 
                value={toHex(currentConfig.colors.slatA)} 
                onChange={(e) => handleColorChange('slatA', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
             />
         </div>

         {currentPreset.multiColor && (
             <>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-300">Lamas Secundarias</span>
                    <input 
                        type="color" 
                        value={toHex(currentConfig.colors.slatB || currentConfig.colors.slatA)} 
                        onChange={(e) => handleColorChange('slatB', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-300">Lamas Terciarias</span>
                    <input 
                        type="color" 
                        value={toHex(currentConfig.colors.slatC || currentConfig.colors.slatA)} 
                        onChange={(e) => handleColorChange('slatC', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                    />
                </div>
             </>
         )}
      </div>

      {!isEditing && (
          <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-neutral-500 text-center">
            Clic Izq: Dibujar • Clic Dcho: Terminar
          </div>
      )}
    </div>
  );
};
// --- END OF FILE src/features/editor/ui/FenceProperties.tsx ---