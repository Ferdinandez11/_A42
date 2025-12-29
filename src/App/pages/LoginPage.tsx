import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/core/lib/supabase";
import { useAuthStore } from "@/core/stores/auth/useAuthStore";
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from "@/core/lib/errorHandler";
import type { AuthStep, TargetRole, Profile} from "@/App/utils/types";
import { LoginSchema, getFirstError } from "@/core/lib/formSchemas";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setSession } = useAuthStore();
  const { handleError, showSuccess } = useErrorHandler({ 
  context: 'LoginPage' 
  });

  const [step, setStep] = React.useState<AuthStep>("selection");
  const [targetRole, setTargetRole] = React.useState<TargetRole>("client");
  const [isRegistering, setIsRegistering] = React.useState<boolean>(false);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  

  const selectRole = (role: TargetRole): void => {
    setTargetRole(role);
    setStep("form");
  };

const checkUserStatus = async (userId: string): Promise<void> => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", userId)
      .single();

    if (error) {
      console.error('[LoginPage] Error al obtener perfil:', error);
      throw error;
    }

    if (!profile) {
      console.error('[LoginPage] Perfil no encontrado para userId:', userId);
      throw new AppError(
        ErrorType.NOT_FOUND,
        'Profile not found',
        {
          severity: ErrorSeverity.HIGH,
          userMessage: 'Perfil de usuario no encontrado. Contacta a soporte.',
          metadata: { userId },
        }
      );
    }

    const typedProfile = profile as Profile;
    
    if (typedProfile.role === "admin" || typedProfile.role === "employee") {
      navigate("/admin/crm");
      return;
    }

    if (typedProfile.is_approved) {
      navigate("/portal");
    } else {
      await supabase.auth.signOut();
      showSuccess('✅ Cuenta creada. Pendiente de aprobación.');
      throw new AppError(
        ErrorType.PERMISSION,
        'Account pending approval',
        { 
          severity: ErrorSeverity.LOW,
          userMessage: 'Tu cuenta está pendiente de validación por un administrador.' 
        }
      );
    }
};
const handleAuth = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
  e.preventDefault();
  setErrors({});
  setLoading(true);

  try {
    // Validar formulario con Zod
    const validation = LoginSchema.safeParse({ email, password });
    
    if (!validation.success) {
      const formErrors: { email?: string; password?: string } = {};
      
      // Zod siempre tiene validation.error.errors como array
      // Pero verificamos por seguridad
      const zodErrors = validation.error?.errors;
      
      if (zodErrors && Array.isArray(zodErrors) && zodErrors.length > 0) {
        zodErrors.forEach((err) => {
          const field = err.path && Array.isArray(err.path) && err.path.length > 0 
            ? err.path[0] as 'email' | 'password' 
            : undefined;
          
          if (field) {
            // Si ya hay un error para este campo, mantener el primero o combinar
            if (!formErrors[field]) {
              formErrors[field] = err.message || 'Error de validación';
            }
          }
        });
      } else {
        // Fallback: si no hay errores estructurados, mostrar error genérico
        console.error('[LoginPage] Error de validación sin estructura:', validation.error);
        formErrors.email = 'Error de validación. Verifica tus datos.';
      }
      
      setErrors(formErrors);
      setLoading(false);
      return;
    }

    const { email: validatedEmail, password: validatedPassword } = validation.data;

    let result;

    if (isRegistering) {
      result = await supabase.auth.signUp({
        email: validatedEmail,
        password: validatedPassword,
        options: { data: { requested_role: targetRole } },
      });
      if (result.error) throw result.error;

      await checkUserStatus(result.data?.user?.id || "");
    } else {
      result = await supabase.auth.signInWithPassword({ 
        email: validatedEmail, 
        password: validatedPassword 
      });
      
      // Verificar errores de autenticación
      if (result.error) {
        console.error('[LoginPage] Error de Supabase Auth:', result.error);
        throw result.error;
      }

      // Verificar que tenemos datos de usuario
      if (!result.data || !result.data.user) {
        console.error('[LoginPage] No se recibieron datos de usuario');
        throw new AppError(
          ErrorType.AUTH,
          'No user data received',
          {
            severity: ErrorSeverity.HIGH,
            userMessage: 'Error de autenticación. No se recibieron datos del usuario.',
          }
        );
      }

      setUser(result.data.user);
      setSession(result.data.session);

      await checkUserStatus(result.data.user.id);
    }
  } catch (error) {
    // Ignorar errores de extensiones del navegador
    if (error instanceof Error && error.message.includes('message channel closed')) {
      setLoading(false);
      return;
    }
    
    // Log del error completo SIEMPRE (para debugging)
    try {
      console.group('[LoginPage] Error de autenticación');
      console.error('Error completo:', error);
      console.error('Tipo de error:', typeof error);
      console.error('Es instancia de Error:', error instanceof Error);
      
      if (error && typeof error === 'object') {
        try {
          console.error('Propiedades del error:', Object.keys(error));
        } catch (e) {
          console.error('No se pudieron obtener las propiedades del error');
        }
        
        if ('code' in error) {
          console.error('Código de error:', (error as { code: string }).code);
        }
        if ('message' in error) {
          console.error('Mensaje de error:', (error as { message: string }).message);
        }
        if ('status' in error) {
          console.error('Status:', (error as { status: number }).status);
        }
        if ('statusCode' in error) {
          console.error('Status Code:', (error as { statusCode: number }).statusCode);
        }
        
        // Intentar acceder a propiedades comunes de Supabase Auth de forma segura
        try {
          const errorObj = error as Record<string, unknown>;
          console.error('Error como objeto:', JSON.stringify(errorObj, null, 2));
        } catch (e) {
          console.error('No se pudo serializar el error');
        }
      }
      console.groupEnd();
    } catch (logError) {
      // Si falla el logging, al menos mostrar algo
      console.error('[LoginPage] Error al hacer log:', logError);
      console.error('[LoginPage] Error original:', error);
    }
    
    // Manejar el error de forma segura
    try {
      handleError(error);
    } catch (handleErrorError) {
      // Si falla el manejo de errores, mostrar un mensaje genérico
      console.error('[LoginPage] Error al manejar el error:', handleErrorError);
      setErrors({ 
        email: 'Error inesperado. Por favor, intenta de nuevo.',
        password: undefined 
      });
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      {step === "selection" ? (
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
        <div className="flex flex-col justify-center items-center h-screen bg-black text-white font-sans">
          <div className="p-12 bg-zinc-900 rounded-2xl border border-zinc-800 text-center min-w-[350px]">
            <h2 className="mb-1.5 text-2xl">
              {targetRole === "employee"
                ? "Acceso Empleados"
                : isRegistering
                ? "Nuevo Registro"
                : "Acceso Clientes"}
            </h2>



            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`p-3 rounded-md border bg-zinc-800 text-white w-full ${
                    errors.email 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-zinc-700 focus:border-blue-500 focus:ring-blue-500'
                  } focus:outline-none focus:ring-1`}
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`p-3 rounded-md border bg-zinc-800 text-white w-full ${
                    errors.password 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-zinc-700 focus:border-blue-500 focus:ring-blue-500'
                  } focus:outline-none focus:ring-1`}
                />
                {errors.password && (
                  <p className="text-red-400 text-sm mt-1">{errors.password}</p>
                )}
              </div>

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