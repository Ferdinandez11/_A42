import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/core/lib/supabase";
import { Editor3D } from "@/editor/Editor3D";
import { useAuthStore } from "@/core/stores/auth/useAuthStore";
import { useProjectStore } from "@/editor/stores/project/useProjectStore";
import { useErrorHandler } from "@/core/hooks/useErrorHandler";
import { AppError, ErrorType, ErrorSeverity } from "@/core/lib/errorHandler";
import type { ExtendedUser } from "@/App/utils/types";

export const ViewerPage: React.FC = () => {
  const isReadOnlyMode = useProjectStore((s) => s.isReadOnlyMode);
  const loadProjectFromURL = useProjectStore((s) => s.loadProjectFromURL);
  const resetProject = useProjectStore((s) => s.resetProject);
  const setProjectUser = useProjectStore((s) => s.setUser);

  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler({ context: 'ViewerPage' });

  // 🚀 Cargar usuario y sincronizar DOS STORES:
  // useAuthStore → useProjectStore
  React.useEffect(() => {
    const loadUser = async (): Promise<void> => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        
        const authUser = data.user;

        if (authUser) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", authUser.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            // PGRST116 = not found, which is acceptable (user might not have profile yet)
            throw profileError;
          }

          const extended =
            profile
              ? ({ ...authUser, role: profile.role } as ExtendedUser)
              : authUser;

          // Guardar en ambos stores
          setUser(extended);          // Auth
          setProjectUser(extended);   // Project  <-- 🔥 NECESARIO para toolbar y guardado
        }
      } catch (error) {
        // Silently handle auth errors - user might not be logged in
        if (error instanceof AppError && error.type === ErrorType.AUTH) {
          // User not authenticated is expected in viewer mode
          return;
        }
        handleError(error, { showToast: false });
      }
    };

    loadUser();
  }, [setUser, setProjectUser, handleError]);

  // Cargar proyecto desde URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("project_id");
    const isClone = params.get("mode") === "clone";

    if (projectId) {
      loadProjectFromURL(projectId)
        .then(() => {
          if (isClone) resetProject();
        })
        .catch((error) => {
          handleError(error);
        });
    }
  }, [loadProjectFromURL, resetProject, handleError]);

  const isAdminOrEmployee =
    user?.role === "admin" || user?.role === "employee";

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-black">
      <div className="absolute top-5 left-5 z-[2000] flex flex-col gap-2.5">
        {isAdminOrEmployee && (
          <button
            onClick={() => navigate("/admin/crm")}
            className="bg-orange-600 text-white py-2.5 px-5 rounded-lg border-none cursor-pointer font-bold hover:bg-orange-700 transition-colors"
          >
            ⬅️ Volver al Panel
          </button>
        )}

        {!user && !isReadOnlyMode && (
          <Link
            to="/login"
            className="bg-zinc-800 text-white py-2 px-4 rounded-full no-underline text-sm font-bold flex items-center gap-2 shadow-lg border border-zinc-700 cursor-pointer transition-all hover:bg-zinc-700"
          >
            👤 Acceso / Login
          </Link>
        )}
      </div>

      <Editor3D />
    </div>
  );
};