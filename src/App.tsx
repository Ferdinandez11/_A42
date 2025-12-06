import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";

// --- IMPORTS ---
import { Editor3D } from "./features/editor/Editor3D";
import { useAuthStore } from "@/stores/auth/useAuthStore";
import { useProjectStore } from "@/stores/project/useProjectStore";
import { CrmDashboard } from "./features/crm/pages/CrmDashboard";
import { ClientDashboard } from "./features/crm/pages/ClientDashboard";
import { ProfilePage } from "./features/crm/pages/ProfilePage";
import { BudgetDetailPage } from "./features/crm/pages/BudgetDetailPage";
import { AdminOrderDetailPage } from "./features/crm/pages/AdminOrderDetailPage";
import { AdminClientDetailPage } from "./features/crm/pages/AdminClientDetailPage";
import { AdminCalendarPage } from "./features/crm/pages/AdminCalendarPage";

// --- TYPES ---
type UserRole = "admin" | "employee" | "client";

interface ExtendedUser extends User {
  role?: UserRole;
}

interface Profile {
  role: UserRole;
  is_approved: boolean;
}

type AuthStep = "selection" | "form";
type TargetRole = "client" | "employee";

// --- LOGOUT ---
const performLogout = async (): Promise<void> => {
  await supabase.auth.signOut();
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setSession(null);
  localStorage.clear();
  window.location.href = "/";
};

// ------------------------------------------------------------------------------------
// EMPLOYEE LAYOUT
const EmployeeLayout: React.FC = () => (
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

// ------------------------------------------------------------------------------------
// CLIENT PORTAL LAYOUT
const ClientPortalLayout: React.FC = () => (
  <div className="h-screen flex flex-col bg-zinc-950 text-zinc-200 font-sans overflow-hidden">
    <header className="bg-zinc-900 border-b border-zinc-800 py-4 px-10 flex justify-between items-center flex-shrink-0">
      <h3 className="m-0 text-white text-lg font-semibold">
        Portal del Cliente 👋
      </h3>

      <nav className="flex gap-5 items-center">
        <Link to="/portal?tab=projects" className="text-white hover:text-zinc-300">
          Mis Proyectos
        </Link>
        <Link to="/portal?tab=budgets" className="text-zinc-400 hover:text-white">
          Mis Presupuestos
        </Link>
        <Link to="/portal?tab=orders" className="text-zinc-400 hover:text-white">
          Mis Pedidos
        </Link>
        <Link to="/portal/profile" className="text-zinc-400 hover:text-white">
          Mi Perfil 👤
        </Link>

        <Link
          to="/"
          className="bg-zinc-800 text-white py-1.5 px-3 rounded-full no-underline text-xs font-bold flex items-center gap-2 shadow-lg border border-zinc-700 hover:bg-zinc-700 transition-all"
        >
          + Nuevo Proyecto 3D
        </Link>

        <button
          onClick={performLogout}
          className="bg-transparent border-none text-zinc-600 cursor-pointer hover:text-zinc-500"
        >
          Salir
        </button>
      </nav>
    </header>

    <main className="flex-1 overflow-y-auto p-10">
      <div className="max-w-6xl mx-auto">
        <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800">
          <Outlet />
        </div>
      </div>
    </main>
  </div>
);

// ------------------------------------------------------------------------------------
// LOGIN PAGE
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setSession } = useAuthStore();

  const [step, setStep] = React.useState<AuthStep>("selection");
  const [targetRole, setTargetRole] = React.useState<TargetRole>("client");
  const [isRegistering, setIsRegistering] = React.useState<boolean>(false);

  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  const selectRole = (role: TargetRole): void => {
    setTargetRole(role);
    setStep("form");
    setErrorMsg("");
  };

  const checkUserStatus = async (userId: string): Promise<void> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", userId)
      .single();

    if (profile) {
      const typedProfile = profile as Profile;
      
      if (typedProfile.role === "admin" || typedProfile.role === "employee") {
        navigate("/admin/crm");
        return;
      }

      if (typedProfile.is_approved) {
        navigate("/portal");
      } else {
        await supabase.auth.signOut();
        throw new Error("🔒 Cuenta creada. Pendiente de validación.");
      }
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      let result;

      if (isRegistering) {
        result = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: "client" } },
        });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) throw result.error;

      if (!result.data.user) throw new Error("Error desconocido.");

      setUser(result.data.user as ExtendedUser);
      const session = (await supabase.auth.getSession()).data.session;
      setSession(session);

      await checkUserStatus(result.data.user.id);
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {step === "selection" ? (
        // Pantalla de selección
        <div className="flex flex-col justify-center items-center h-screen bg-black text-white">
          <div className="p-12 bg-zinc-900 rounded-2xl border border-zinc-800 text-center min-w-[350px]">
            <h2 className="mb-2.5 text-2xl">Bienvenido</h2>

            <div className="flex gap-4 justify-center my-8">
              <button
                onClick={() => selectRole("client")}
                className="bg-zinc-800 text-white py-5 px-5 rounded-2xl no-underline text-sm font-bold flex flex-col items-center gap-2 shadow-lg border border-zinc-700 cursor-pointer transition-all w-36 hover:bg-zinc-700"
              >
                <span className="text-3xl">👋</span>
                <span>Soy Cliente</span>
              </button>

              <button
                onClick={() => selectRole("employee")}
                className="bg-zinc-900 text-white py-5 px-5 rounded-2xl no-underline text-sm font-bold flex flex-col items-center gap-2 shadow-lg border border-zinc-700 cursor-pointer transition-all w-36 hover:bg-zinc-800"
              >
                <span className="text-3xl">🏢</span>
                <span>Soy Empleado</span>
              </button>
            </div>

            <button
              onClick={() => navigate("/")}
              className="bg-transparent border-none text-zinc-600 cursor-pointer underline hover:text-zinc-500"
            >
              Volver al Visor 3D
            </button>
          </div>
        </div>
      ) : (
        // Formulario de autenticación
        <div className="flex flex-col justify-center items-center h-screen bg-black text-white font-sans">
          <div className="p-12 bg-zinc-900 rounded-2xl border border-zinc-800 text-center min-w-[350px]">
            <h2 className="mb-1.5 text-2xl">
              {targetRole === "employee"
                ? "Acceso Empleados"
                : isRegistering
                ? "Nuevo Registro"
                : "Acceso Clientes"}
            </h2>

            {errorMsg && (
              <div
                className={`${
                  errorMsg.includes("validación")
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                } p-2.5 rounded-md mb-4 text-xs`}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-3 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-3 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className={`${
                  targetRole === "employee" ? "bg-orange-600" : "bg-blue-600"
                } text-white py-3 px-4 rounded-2xl border-none font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all mt-2.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading
                  ? "Procesando..."
                  : isRegistering
                  ? "Crear Cuenta"
                  : "Entrar"}
              </button>
            </form>

            {targetRole === "client" && (
              <div className="mt-4 text-xs text-zinc-500">
                {isRegistering ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
                <button
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setErrorMsg("");
                  }}
                  className="bg-transparent border-none text-blue-500 cursor-pointer font-bold underline hover:text-blue-400"
                >
                  {isRegistering ? "Inicia Sesión" : "Regístrate aquí"}
                </button>
              </div>
            )}

            <button
              onClick={() => setStep("selection")}
              className="mt-5 bg-transparent border-none text-zinc-600 cursor-pointer underline hover:text-zinc-500"
            >
              ← Volver
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ------------------------------------------------------------------------------------
// VISOR 3D PAGE
const ViewerPage: React.FC = () => {
  const isReadOnlyMode = useProjectStore((s) => s.isReadOnlyMode);
  const loadProjectFromURL = useProjectStore((s) => s.loadProjectFromURL);
  const resetProject = useProjectStore((s) => s.resetProject);

  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  // Cargar usuario
  React.useEffect(() => {
    const loadUser = async (): Promise<void> => {
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;

      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authUser.id)
          .single();

        setUser(
          profile
            ? ({ ...authUser, role: profile.role } as ExtendedUser)
            : authUser
        );
      }
    };
    loadUser();
  }, [setUser]);

  // Cargar proyecto desde URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("project_id");
    const isClone = params.get("mode") === "clone";

    if (projectId) {
      loadProjectFromURL(projectId).then(() => {
        if (isClone) resetProject();
      });
    }
  }, [loadProjectFromURL, resetProject]);

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

// ------------------------------------------------------------------------------------
// APP ROOT
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ViewerPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/admin" element={<EmployeeLayout />}>
          <Route index element={<CrmDashboard />} />
          <Route path="crm" element={<CrmDashboard />} />
          <Route path="order/:id" element={<AdminOrderDetailPage />} />
          <Route path="client/:id" element={<AdminClientDetailPage />} />
          <Route path="calendar" element={<AdminCalendarPage />} />
        </Route>

        <Route path="/portal" element={<ClientPortalLayout />}>
          <Route index element={<ClientDashboard />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="order/:id" element={<BudgetDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;