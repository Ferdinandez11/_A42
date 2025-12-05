import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useEditorStore } from '@/stores/editor/useEditorStore';
import { useSceneStore } from '@/stores/scene/useSceneStore';
import { useProjectStore } from '@/stores/project/useProjectStore';
import { useUserStore } from '@/stores/user/useUserStore';
import { useEngine } from '../context/EngineContext';

export const useProjectActions = () => {
  const engine = useEngine();
  const [isSaving, setIsSaving] = useState(false);

  // Editor
  const { requestInput, cameraType } = useEditorStore();

  // Scene
  const items = useSceneStore((s) => s.items); // solo items

  // Project Store
  const projectId = useProjectStore((s) => s.projectId);
  const projectName = useProjectStore((s) => s.projectName);
  const isReadOnlyMode = useProjectStore((s) => s.isReadOnlyMode);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);

  // User Store (REAL origen del usuario)
  const user = useUserStore.getState().user;

  // Total Price debe venir del ProjectStore
  const totalPrice = useProjectStore((s) => s.totalPrice ?? 0);

  const saveProject = async () => {
    if (isReadOnlyMode)
      return alert("⚠️ Modo Solo Lectura. No puedes sobrescribir este proyecto.");

    if (!user)
      return alert("🔒 Inicia sesión para guardar tu proyecto.");

    if (!engine) return;

    // 1. GENERAR THUMBNAIL
    engine.renderer.render(engine.scene, engine.activeCamera);
    const thumbnailBase64 = engine.renderer.domElement.toDataURL("image/jpeg", 0.5);

    // 2. Datos del proyecto
    const projectData = {
      items,
      camera: cameraType,
    };

    // 3. Nombre del proyecto
    let nameToSave = projectName;
    let isOverwrite = false;

    if (projectId) {
      if (confirm(`¿Sobreescribir el proyecto "${projectName}"?`)) {
        isOverwrite = true;
      } else {
        const newName = await requestInput(
          "Guardar como nuevo:",
          projectName + " (Copia)"
        );
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
      if (isOverwrite && projectId) {
        // === ACTUALIZAR EXISTENTE ===
        const { error } = await supabase
          .from("projects")
          .update({
            name: nameToSave,
            data: projectData,
            thumbnail_url: thumbnailBase64,
            total_price: totalPrice,
            updated_at: new Date(),
          })
          .eq("id", projectId);

        if (error) throw error;

        alert("✅ Proyecto actualizado correctamente.");
      } else {
        // === CREAR NUEVO ===
        const { data, error } = await supabase
          .from("projects")
          .insert([
            {
              user_id: user.id,
              name: nameToSave,
              data: projectData,
              thumbnail_url: thumbnailBase64,
              total_price: totalPrice,
            },
          ])
          .select()
          .single();

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

  // ================================
  // IMPORTAR GLB
  // ================================
  const importGLB = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const fileName = file.name.replace(/\.(glb|gltf)$/i, "");

    useSceneStore.getState().addItem({
      uuid: crypto.randomUUID(),
      productId: "custom_upload",
      name: fileName,
      price: 0,
      type: "model",
      data: {},
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      modelUrl: url,
    } as any);

    event.target.value = "";
  };

  return {
    saveProject,
    importGLB,
    isSaving,
  };
};
