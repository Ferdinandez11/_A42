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

// --- ESTILOS ---
const badgeStyle: React.CSSProperties = {
  backgroundColor: "#333",
  color: "white",
  padding: "8px 16px",
  borderRadius: "20px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
  border: "1px solid #444",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const navLinkStyle: React.CSSProperties = {
  color: "#aaa",
  textDecoration: "none",
  padding: "8px 12px",
  borderRadius: "6px",
  transition: "color 0.2s",
  fontSize: "14px",
  display: "block",
};

// --- LOGOUT ---
const performLogout = async () => {
  await supabase.auth.signOut();
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setSession(null);
  localStorage.clear();
  window.location.href = "/";
};

// ------------------------------------------------------------------------------------
// EMPLOYEE LAYOUT
const EmployeeLayout = () => (
  <div
    style={{
      display: "flex",
      height: "100vh",
      fontFamily: "sans-serif",
      background: "#121212",
      color: "#e0e0e0",
    }}
  >
    <aside
      style={{
        width: "240px",
        background: "#1e1e1e",
        borderRight: "1px solid #333",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "20px", borderBottom: "1px solid #333" }}>
        <h3 style={{ margin: 0, color: "#fff" }}>Intranet 🏢</h3>
        <small style={{ color: "#666" }}>Modo Empleado</small>
      </div>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "15px",
          gap: "5px",
        }}
      >
        <Link
          to="/admin/crm"
          style={{ ...navLinkStyle, color: "#fff", background: "#2a2a2a" }}
        >
          👥 CRM (Listado)
        </Link>
        <Link to="/admin/calendar" style={navLinkStyle}>
          📅 Calendario Entregas
        </Link>
        <Link to="/admin/erp" style={navLinkStyle}>
          🏭 ERP (Fábrica)
        </Link>
        <Link to="/admin/purchases" style={navLinkStyle}>
          🛒 Compras
        </Link>
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: "20px",
          borderTop: "1px solid #333",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <button
          onClick={performLogout}
          style={{
            background: "transparent",
            border: "none",
            color: "#e74c3c",
            cursor: "pointer",
            textAlign: "left",
            padding: 0,
          }}
        >
          Cerrar Sesión
        </button>

        <Link
          to="/"
          style={{ color: "#666", textDecoration: "none", fontSize: "13px" }}
        >
          ← Volver al Visor 3D
        </Link>
      </div>
    </aside>

    <main style={{ flex: 1, overflow: "auto" }}>
      <Outlet />
    </main>
  </div>
);

// ------------------------------------------------------------------------------------
// CLIENT PORTAL LAYOUT
const ClientPortalLayout = () => (
  <div
    style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#121212",
      color: "#e0e0e0",
      fontFamily: "sans-serif",
      overflow: "hidden",
    }}
  >
    <header
      style={{
        background: "#1e1e1e",
        borderBottom: "1px solid #333",
        padding: "15px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <h3 style={{ margin: 0, color: "#fff" }}>Portal del Cliente 👋</h3>

      <nav style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <Link to="/portal?tab=projects" style={{ color: "#fff" }}>
          Mis Proyectos
        </Link>
        <Link to="/portal?tab=budgets" style={{ color: "#bbb" }}>
          Mis Presupuestos
        </Link>
        <Link to="/portal?tab=orders" style={{ color: "#bbb" }}>
          Mis Pedidos
        </Link>
        <Link to="/portal/profile" style={{ color: "#bbb" }}>
          Mi Perfil 👤
        </Link>

        <Link
          to="/"
          style={{ ...badgeStyle, fontSize: "12px", padding: "6px 12px" }}
        >
          + Nuevo Proyecto 3D
        </Link>

        <button
          onClick={performLogout}
          style={{ background: "none", border: "none", color: "#666" }}
        >
          Salir
        </button>
      </nav>
    </header>

    <main style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            background: "#1e1e1e",
            padding: "30px",
            borderRadius: "12px",
            border: "1px solid #333",
          }}
        >
          <Outlet />
        </div>
      </div>
    </main>
  </div>
);

// ------------------------------------------------------------------------------------
// LOGIN PAGE (como la tenías)
const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser, setSession } = useAuthStore();

  const [step, setStep] = React.useState<"selection" | "form">("selection");
  const [targetRole, setTargetRole] = React.useState<"client" | "employee">(
    "client"
  );
  const [isRegistering, setIsRegistering] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  const selectRole = (role: "client" | "employee") => {
    setTargetRole(role);
    setStep("form");
    setErrorMsg("");
  };

  const checkUserStatus = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", userId)
      .single();

    if (profile) {
      if (profile.role === "admin" || profile.role === "employee") {
        navigate("/admin/crm");
        return;
      }

      if (profile.is_approved) {
        navigate("/portal");
      } else {
        await supabase.auth.signOut();
        throw new Error("🔒 Cuenta creada. Pendiente de validación.");
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
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

      setUser(result.data.user);
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
        // pantalla selección
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            background: "#000",
            color: "#fff",
          }}
        >
          <div
            style={{
              padding: "3rem",
              background: "#1e1e1e",
              borderRadius: "16px",
              border: "1px solid #333",
              textAlign: "center",
              minWidth: "350px",
            }}
          >
            <h2 style={{ marginBottom: "10px" }}>Bienvenido</h2>

            <div
              style={{
                display: "flex",
                gap: "15px",
                justifyContent: "center",
                margin: "30px 0",
              }}
            >
              <button
                onClick={() => selectRole("client")}
                style={{
                  ...badgeStyle,
                  flexDirection: "column",
                  padding: "20px",
                  width: "140px",
                  background: "#333",
                }}
              >
                <span style={{ fontSize: "30px" }}>👋</span>
                <span>Soy Cliente</span>
              </button>

              <button
                onClick={() => selectRole("employee")}
                style={{
                  ...badgeStyle,
                  flexDirection: "column",
                  padding: "20px",
                  width: "140px",
                  background: "#222",
                  border: "1px solid #555",
                }}
              >
                <span style={{ fontSize: "30px" }}>🏢</span>
                <span>Soy Empleado</span>
              </button>
            </div>

            <button
              onClick={() => navigate("/")}
              style={{
                background: "transparent",
                border: "none",
                color: "#666",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Volver al Visor 3D
            </button>
          </div>
        </div>
      ) : (
        // --- FORMULARIO ORIGINAL ----
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            background: "#000",
            color: "#fff",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              padding: "3rem",
              background: "#1e1e1e",
              borderRadius: "16px",
              border: "1px solid #333",
              textAlign: "center",
              minWidth: "350px",
            }}
          >
            <h2 style={{ marginBottom: "5px" }}>
              {targetRole === "employee"
                ? "Acceso Empleados"
                : isRegistering
                ? "Nuevo Registro"
                : "Acceso Clientes"}
            </h2>

            {errorMsg && (
              <div
                style={{
                  background: errorMsg.includes("validación")
                    ? "rgba(39, 174, 96, 0.2)"
                    : "rgba(231, 76, 60, 0.2)",
                  color: errorMsg.includes("validación")
                    ? "#2ecc71"
                    : "#e74c3c",
                  padding: "10px",
                  borderRadius: "6px",
                  marginBottom: "15px",
                  fontSize: "13px",
                }}
              >
                {errorMsg}
              </div>
            )}

            <form
              onSubmit={handleAuth}
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #444",
                  background: "#2a2a2a",
                  color: "white",
                }}
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #444",
                  background: "#2a2a2a",
                  color: "white",
                }}
                required
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...badgeStyle,
                  justifyContent: "center",
                  backgroundColor:
                    targetRole === "employee" ? "#e67e22" : "#3b82f6",
                  border: "none",
                  padding: "12px",
                  marginTop: "10px",
                }}
              >
                {loading
                  ? "Procesando..."
                  : isRegistering
                  ? "Crear Cuenta"
                  : "Entrar"}
              </button>
            </form>

            {targetRole === "client" && (
              <div
                style={{
                  marginTop: "15px",
                  fontSize: "13px",
                  color: "#888",
                }}
              >
                {isRegistering ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
                <button
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setErrorMsg("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#3b82f6",
                    cursor: "pointer",
                    fontWeight: "bold",
                    textDecoration: "underline",
                  }}
                >
                  {isRegistering ? "Inicia Sesión" : "Regístrate aquí"}
                </button>
              </div>
            )}

            <button
              onClick={() => setStep("selection")}
              style={{
                marginTop: "20px",
                background: "transparent",
                border: "none",
                color: "#666",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              ← Volver
            </button>
          </div>
        </div>
      )}
    </>
  );
};


// VISOR 3D PAGE
const ViewerPage = () => {
  // Stores correctos (SIN useAppStore)
  const isReadOnlyMode = useProjectStore((s) => s.isReadOnlyMode);

  const loadProjectFromURL = useProjectStore((s) => s.loadProjectFromURL);
  const resetProject = useProjectStore((s) => s.resetProject);




  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  // cargar usuario
  React.useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;

      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authUser.id)
          .single();

        setUser(profile ? { ...authUser, role: profile.role } : authUser);
      }
    };
    loadUser();
  }, [setUser]);

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
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {isAdminOrEmployee && (
          <button
            onClick={() => navigate("/admin/crm")}
            style={{
              background: "#e67e22",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ⬅️ Volver al Panel
          </button>
        )}

        {!user && !isReadOnlyMode && (
          <Link to="/login" style={badgeStyle}>
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
function App() {
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
}

export default App;