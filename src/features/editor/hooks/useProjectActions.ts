import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditorStore } from '@/stores/editor/useEditorStore';
import { useSceneStore } from '@/stores/scene/useSceneStore';
import { useProjectStore } from '@/stores/project/useProjectStore';
import { useEngine } from '../context/EngineContext';

export const useProjectActions = () => {
  const engine = useEngine();
  const [isSaving, setIsSaving] = useState(false);
  
  const { requestInput, cameraType } = useEditorStore();
  const { items, fenceConfig, totalPrice, addItem } = useSceneStore();
  const { user, currentProjectId, currentProjectName, isReadOnlyMode, setProjectInfo } = useProjectStore();

  const saveProject = async () => {
    if (isReadOnlyMode) return alert("⚠️ Modo de Solo Lectura. No puedes sobrescribir este proyecto.");
    if (!user) return alert("🔒 Inicia sesión para guardar tu proyecto.");
    if (!engine) return;

    // 1. Generar Thumbnail
    engine.renderer.render(engine.scene, engine.activeCamera);
    const thumbnailBase64 = engine.renderer.domElement.toDataURL('image/jpeg', 0.5);

    // 2. Preparar Datos JSON
    const projectData = {
      items,
      fenceConfig,
      camera: cameraType
    };

    // 3. Determinar Nombre y Modo (Sobrescribir vs Nuevo)
    let nameToSave = currentProjectName;
    let isOverwrite = false;

    if (currentProjectId) {
      if (confirm(`¿Sobreescribir proyecto "${currentProjectName}"?`)) {
        isOverwrite = true;
      } else {
        const newName = await requestInput("Guardar como nuevo:", currentProjectName + " (Copia)");
        if (!newName) return; 
        nameToSave = newName;
        isOverwrite = false;
      }
    } else {
      const newName = await requestInput("Nombre del Proyecto:", "Mi Parque Nuevo");
      if (!newName) return;
      nameToSave = newName;
      isOverwrite = false;
    }

    setIsSaving(true);
    try {
      if (isOverwrite && currentProjectId) {
        // ACTUALIZAR
        const { error } = await supabase.from('projects').update({
          name: nameToSave,
          data: projectData,
          thumbnail_url: thumbnailBase64,
          total_price: totalPrice,
          updated_at: new Date()
        }).eq('id', currentProjectId);
        
        if (error) throw error;
        alert("✅ Proyecto actualizado correctamente.");
      } else {
        // CREAR NUEVO
        const { data, error } = await supabase.from('projects').insert([{
          user_id: user.id,
          name: nameToSave,
          data: projectData,
          thumbnail_url: thumbnailBase64,
          total_price: totalPrice
        }]).select().single();
        
        if (error) throw error;
        alert("💾 Proyecto guardado correctamente.");
        
        if (data) setProjectInfo(data.id, data.name);
      }
    } catch (err: any) {
      console.error(err);
      alert("❌ Error al guardar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const importGLB = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; 
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const fileName = file.name.replace(/\.(glb|gltf)$/i, '');
    
    // Crear item modelo
    addItem({ 
        uuid: crypto.randomUUID(), 
        productId: 'custom_upload', 
        name: fileName, 
        price: 0, 
        type: 'model', 
        modelUrl: url, 
        position: [0, 0, 0], 
        rotation: [0, 0, 0], 
        scale: [1, 1, 1] 
    } as any);

    // Limpiar input para permitir subir el mismo archivo de nuevo
    event.target.value = '';
  };

  return {
    saveProject,
    importGLB,
    isSaving
  };
};