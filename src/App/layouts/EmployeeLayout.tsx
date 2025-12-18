import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { performLogout } from "@/App/utils/authHelpers";
import { supabase } from "@/core/lib/supabase";
import { useErrorHandler } from "@/core/hooks/useErrorHandler";

export const EmployeeLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleError } = useErrorHandler({ context: "EmployeeLayout" });
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    const checkAccess = async (): Promise<void> => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          navigate("/login", { replace: true, state: { from: location } });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_approved")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        const role = profile?.role;
        const isEmployeeOrAdmin = role === "admin" || role === "employee";

        if (!isEmployeeOrAdmin) {
          // Cliente (u otro rol) no puede acceder a /admin
          navigate("/portal", { replace: true });
          return;
        }
      } catch (error) {
        handleError(error, { showToast: false });
        navigate("/login", { replace: true, state: { from: location } });
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [navigate, location, handleError]);

  if (isChecking) {
    return (
      <div className="flex h-screen font-sans bg-zinc-950 text-zinc-200 items-center justify-center">
        <span className="text-zinc-500">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen font-sans bg-zinc-950 text-zinc-200">
      <aside className="w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-5 border-b border-zinc-800">
          <h3 className="m-0 text-white text-lg font-semibold">Intranet 🏢</h3>
          <small className="text-zinc-600">Modo Empleado</small>
        </div>

      <nav className="flex flex-col p-4 gap-1">
        <Link
          to="/admin/crm"
          className="text-white bg-zinc-800 no-underline py-2 px-3 rounded-md transition-colors text-sm block hover:bg-zinc-700"
        >
          👥 CRM (Listado)
        </Link>
        <Link
          to="/admin/calendar"
          className="text-zinc-400 no-underline py-2 px-3 rounded-md transition-colors text-sm block hover:text-white hover:bg-zinc-800"
        >
          📅 Calendario Entregas
        </Link>
        <Link
          to="/admin/erp"
          className="text-zinc-400 no-underline py-2 px-3 rounded-md transition-colors text-sm block hover:text-white hover:bg-zinc-800"
        >
          🏭 ERP (Fábrica)
        </Link>
        <Link
          to="/admin/purchases"
          className="text-zinc-400 no-underline py-2 px-3 rounded-md transition-colors text-sm block hover:text-white hover:bg-zinc-800"
        >
          🛒 Compras
        </Link>
      </nav>

      <div className="mt-auto p-5 border-t border-zinc-800 flex flex-col gap-2.5">
        <button
          onClick={performLogout}
          className="bg-transparent border-none text-red-500 cursor-pointer text-left p-0 hover:text-red-400"
        >
          Cerrar Sesión
        </button>

        <Link
          to="/"
          className="text-zinc-600 no-underline text-xs hover:text-zinc-500"
        >
          ← Volver al Visor 3D
        </Link>
      </div>
    </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};