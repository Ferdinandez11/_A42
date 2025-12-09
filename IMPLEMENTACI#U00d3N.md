# 🔥 Sistema de Errores - Checklist de Implementación

## ✅ PASO 1: Instalar Dependencias (2 min)

```bash
npm install react-hot-toast
```

## ✅ PASO 2: Crear Archivos del Sistema (5 min)

Crea estos 4 archivos (ya los tienes en los artifacts):

1. **`src/lib/errorHandler.ts`** - Error handler principal
2. **`src/components/providers/ToastProvider.tsx`** - Provider de toasts
3. **`src/hooks/useErrorHandler.ts`** - Hook personalizado
4. **`src/lib/__tests__/errorHandler.test.ts`** - Tests

## ✅ PASO 3: Integrar ToastProvider en la App (2 min)

**Archivo:** `src/main.tsx`

```typescript
import { ToastProvider } from './components/providers/ToastProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
```

## ✅ PASO 4: Refactorizar App.tsx (15 min)

### Añadir el import:
```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { AppError, ErrorType } from '@/lib/errorHandler';
```

### En el componente LoginPage:
```typescript
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setSession } = useAuthStore();
  const { handleError, showSuccess } = useErrorHandler({ 
    context: 'LoginPage' 
  });
  
  // ... resto del estado
```

### Refactorizar handleAuth:
```typescript
const handleAuth = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
  e.preventDefault();
  setLoading(true);

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

    if (!result.data.user) {
      throw new AppError(
        ErrorType.AUTH,
        'No user data received',
        { userMessage: 'Error de autenticación. Intenta nuevamente.' }
      );
    }

    setUser(result.data.user as ExtendedUser);
    const session = (await supabase.auth.getSession()).data.session;
    setSession(session);

    await checkUserStatus(result.data.user.id);
    
    showSuccess(isRegistering ? '✅ Cuenta creada exitosamente' : '👋 Bienvenido');
  } catch (error) {
    handleError(error);
  } finally {
    setLoading(false);
  }
};
```

### Refactorizar checkUserStatus:
```typescript
const checkUserStatus = async (userId: string): Promise<void> => {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", userId)
      .single();

    if (error) throw error;

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
    }
  } catch (error) {
    throw error; // Re-lanzar para que handleAuth lo capture
  }
};
```

### Eliminar el estado de error local:
```typescript
// ❌ ELIMINAR
const [errorMsg, setErrorMsg] = React.useState<string>("");

// ❌ ELIMINAR del JSX
{errorMsg && (
  <div className={...}>
    {errorMsg}
  </div>
)}
```

## ✅ PASO 5: Refactorizar CrmDashboard.tsx (20 min)

### Añadir imports:
```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';
```

### En el componente:
```typescript
export const CrmDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('budgets');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientData, setNewClientData] = useState<NewClientData>(EMPTY_CLIENT_DATA);

  const { loading, dataList, clients, loadData } = useCrmData(activeTab);
  
  // ✅ AÑADIR
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'CrmDashboard'
  });
  
  // ... resto del código
```

### Refactorizar loadData en el hook useCrmData:
```typescript
const useCrmData = (activeTab: DashboardTab) => {
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<Order[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  
  // ✅ AÑADIR
  const { handleError } = useErrorHandler({ context: 'CrmDashboard.loadData' });

  const loadData = async () => {
    setLoading(true);
    
    try {
      if (activeTab === 'clients') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setClients(data || []);
      } else {
        let query = supabase
          .from('orders')
          .select(`
            *,
            profiles(company_name, email, discount_rate),
            projects(name),
            order_messages(created_at, profiles(role))
          `)
          .order('created_at', { ascending: false });

        if (activeTab === 'budgets') {
          query = query.in('status', BUDGET_STATUSES);
        } else if (activeTab === 'orders') {
          query = query.in('status', ORDER_STATUSES);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        setDataList(data || []);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  return { loading, dataList, clients, loadData };
};
```

### Refactorizar handleApproveClient:
```typescript
const handleApproveClient = async (clientId: string): Promise<void> => {
  const loadingToast = showLoading('Aprobando cliente...');
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', clientId);

    if (error) throw error;
    
    dismissToast(loadingToast);
    showSuccess('✅ Cliente aprobado correctamente');
    loadData();
  } catch (error) {
    dismissToast(loadingToast);
    handleError(error);
  }
};
```

### Refactorizar handleCreateClient:
```typescript
const handleCreateClient = async (): Promise<void> => {
  if (!newClientData.email) {
    handleError(
      new AppError(
        ErrorType.VALIDATION,
        'Email required',
        { 
          userMessage: 'El email es obligatorio',
          severity: ErrorSeverity.LOW 
        }
      )
    );
    return;
  }

  const loadingToast = showLoading('Creando cliente...');

  try {
    const { error } = await supabase
      .from('pre_clients')
      .insert([newClientData]);

    if (error) throw error;
    
    dismissToast(loadingToast);
    showSuccess(`✅ Cliente ${newClientData.email} creado correctamente`);
    setShowCreateModal(false);
    setNewClientData(EMPTY_CLIENT_DATA);
    loadData();
  } catch (error) {
    dismissToast(loadingToast);
    handleError(error);
  }
};
```

### Refactorizar handleDeleteClient:
```typescript
const handleDeleteClient = async (id: string): Promise<void> => {
  if (!confirm('¿Borrar cliente?')) return;
  
  const loadingToast = showLoading('Eliminando cliente...');
  
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    dismissToast(loadingToast);
    showSuccess('✅ Cliente eliminado');
    loadData();
  } catch (error) {
    dismissToast(loadingToast);
    handleError(error);
  }
};
```

### Refactorizar handleDeleteOrder:
```typescript
const handleDeleteOrder = async (id: string): Promise<void> => {
  if (!confirm('¿Borrar registro?')) return;
  
  const loadingToast = showLoading('Eliminando...');
  
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    dismissToast(loadingToast);
    showSuccess('✅ Registro eliminado');
    loadData();
  } catch (error) {
    dismissToast(loadingToast);
    handleError(error);
  }
};
```

### Refactorizar handleStatusUpdate:
```typescript
const handleStatusUpdate = async (id: string, newStatus: OrderStatus): Promise<void> => {
  if (!confirm(`¿Cambiar estado a "${newStatus.toUpperCase()}"?`)) return;

  const loadingToast = showLoading('Actualizando estado...');

  try {
    const updateData: Partial<Order> = { status: newStatus };
    const deliveryDate = calculateEstimatedDelivery(newStatus);
    
    if (deliveryDate) {
      updateData.estimated_delivery_date = deliveryDate;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    dismissToast(loadingToast);
    showSuccess('✅ Estado actualizado');
    loadData();
  } catch (error) {
    dismissToast(loadingToast);
    handleError(error);
  }
};
```

### Eliminar alerts:
```typescript
// ❌ ELIMINAR todos los alert()
// ✅ Ya están reemplazados por showSuccess/handleError
```

## ✅ PASO 6: Refactorizar useAuthStore (5 min)

**Archivo:** `src/stores/auth/useAuthStore.ts`

```typescript
import { handleError } from '@/lib/errorHandler';

// ... resto de imports

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      set({ user: null, session: null });
      localStorage.clear();
    } catch (error) {
      // Re-lanzar para que el componente lo maneje
      throw handleError(error, 'useAuthStore.logout');
    }
  },
}));
```

## ✅ PASO 7: Ejecutar Tests (5 min)

```bash
# Ejecutar tests del error handler
npm run test errorHandler

# Debería ver ~40 tests pasando
```

## ✅ PASO 8: Verificar Funcionamiento (10 min)

### Pruebas a realizar:

1. **Login con credenciales incorrectas**
   - ✅ Debe mostrar toast de error rojo
   - ✅ Mensaje amigable, no técnico

2. **Login exitoso**
   - ✅ Toast verde de "Bienvenido"
   - ✅ Navegación correcta

3. **CRM - Cargar datos**
   - ✅ Toast de loading mientras carga
   - ✅ Toast de éxito cuando termina

4. **CRM - Eliminar orden**
   - ✅ Toast de loading
   - ✅ Toast de éxito
   - ✅ Lista se actualiza

5. **Error de red** (desconectar internet)
   - ✅ Toast rojo explicando el problema
   - ✅ Mensaje claro sobre conexión

## 📊 Checklist Final

- [ ] Dependencies instaladas
- [ ] 4 archivos creados
- [ ] ToastProvider en main.tsx
- [ ] App.tsx refactorizado
- [ ] CrmDashboard.tsx refactorizado
- [ ] useAuthStore.ts refactorizado
- [ ] Tests corriendo
- [ ] Pruebas manuales OK
- [ ] Git commit

## 🎯 Resultado Esperado

Cuando termines, deberías ver:

```
✅ 151+ tests pasando (111 anteriores + 40 nuevos)
✅ Sistema de errores funcionando
✅ Toasts bonitos y funcionales
✅ Mejor experiencia de usuario
✅ Código más mantenible
```

## 💾 Git Commit

```bash
git add .
git commit -m "🔥 Sistema de errores centralizado + Toast notifications"
git push
```

---

## 🚀 ¿Listo para empezar?

Empieza por el **PASO 1** y ve marcando cada checkbox.

¡Avísame cuando termines cada paso o si tienes alguna duda! 💪
