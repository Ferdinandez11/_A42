# 🔧 Guía de Refactoring - Sistema de Errores

## 📋 Archivos a Refactorizar

### Prioridad Alta (Críticos):
1. `src/App.tsx` - Login y autenticación
2. `src/features/crm/pages/CrmDashboard.tsx` - Operaciones CRUD
3. `src/stores/auth/useAuthStore.ts` - Logout
4. `src/stores/project/useProjectStore.ts` - Carga de proyectos

### Prioridad Media:
5. Todos los demás stores
6. Componentes con llamadas a Supabase

---

## 🔄 Patrón de Refactoring

### ANTES (❌ Código actual):
```typescript
try {
  const { data, error } = await supabase
    .from('orders')
    .select('*');
  
  if (error) throw error;
  setDataList(data || []);
} catch (err) {
  console.error('[CrmDashboard] Load error:', err); // ❌ Solo log
}
```

### DESPUÉS (✅ Con sistema de errores):
```typescript
const { handleError, showSuccess } = useErrorHandler({ 
  context: 'CrmDashboard' 
});

try {
  const { data, error } = await supabase
    .from('orders')
    .select('*');
  
  if (error) throw error;
  setDataList(data || []);
} catch (err) {
  handleError(err); // ✅ Manejo centralizado + toast automático
}
```

---

## 📝 EJEMPLO 1: Refactorizar App.tsx

### ANTES:
```typescript
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
    
    // ... resto del código
  } catch (error: any) {
    setErrorMsg(error.message); // ❌
  } finally {
    setLoading(false);
  }
};
```

### DESPUÉS:
```typescript
const { handleError, showSuccess } = useErrorHandler({ 
  context: 'LoginPage' 
});

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
    
    showSuccess(isRegistering ? 'Cuenta creada exitosamente' : 'Bienvenido');
  } catch (error) {
    handleError(error); // ✅ Manejo automático
  } finally {
    setLoading(false);
  }
};
```

---

## 📝 EJEMPLO 2: Refactorizar CrmDashboard.tsx

### ANTES:
```typescript
const loadData = async () => {
  setLoading(true);
  
  try {
    if (activeTab === 'clients') {
      const { data } = await supabase
        .from('profiles')
        .select('*');
      
      setClients(data || []);
    }
  } catch (err) {
    console.error('[CrmDashboard] Load error:', err);
  } finally {
    setLoading(false);
  }
};
```

### DESPUÉS:
```typescript
const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
  context: 'CrmDashboard'
});

const loadData = async () => {
  const loadingToast = showLoading('Cargando datos...');
  
  try {
    if (activeTab === 'clients') {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setClients(data || []);
      dismissToast(loadingToast);
      showSuccess('Datos cargados correctamente');
    }
  } catch (err) {
    dismissToast(loadingToast);
    handleError(err);
  }
};
```

---

## 📝 EJEMPLO 3: Operaciones CRUD con feedback

```typescript
const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
  context: 'CrmDashboard'
});

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
    showSuccess('Registro eliminado correctamente');
    loadData(); // Recargar datos
  } catch (err) {
    dismissToast(loadingToast);
    handleError(err, {
      customMessage: 'No se pudo eliminar el registro'
    });
  }
};
```

---

## 📝 EJEMPLO 4: Refactorizar Store (useAuthStore)

### ANTES:
```typescript
logout: async () => {
  await supabase.auth.signOut();
  set({ user: null, session: null });
},
```

### DESPUÉS:
```typescript
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
```

---

## 📝 EJEMPLO 5: Validación de formularios

```typescript
import { createError, ErrorType, ErrorSeverity } from '@/lib/errorHandler';

const validateClientData = (data: NewClientData): void => {
  if (!data.email) {
    throw createError(
      ErrorType.VALIDATION,
      'Email is required',
      {
        severity: ErrorSeverity.LOW,
        userMessage: 'El email es obligatorio',
        metadata: { field: 'email' }
      }
    );
  }
  
  if (!data.email.includes('@')) {
    throw createError(
      ErrorType.VALIDATION,
      'Invalid email format',
      {
        severity: ErrorSeverity.LOW,
        userMessage: 'El email no es válido',
        metadata: { field: 'email', value: data.email }
      }
    );
  }
};

const handleCreateClient = async (): Promise<void> => {
  const { handleError, showSuccess } = useErrorHandler();
  
  try {
    validateClientData(newClientData);
    
    const { error } = await supabase
      .from('pre_clients')
      .insert([newClientData]);

    if (error) throw error;
    
    showSuccess(`Cliente ${newClientData.email} creado correctamente`);
    setShowCreateModal(false);
    setNewClientData(EMPTY_CLIENT_DATA);
    loadData();
  } catch (error) {
    handleError(error);
  }
};
```

---

## 🎯 Checklist de Refactoring

Para cada archivo que refactorices:

- [ ] Importar `useErrorHandler` en componentes
- [ ] Reemplazar `console.error` con `handleError`
- [ ] Reemplazar `alert` con `showSuccess/showError`
- [ ] Agregar toasts de carga para operaciones async
- [ ] Verificar que los errores de Supabase se lanzan correctamente
- [ ] Añadir contexto descriptivo (`context: 'ComponentName'`)
- [ ] Agregar mensajes de usuario claros y amigables
- [ ] Testear cada flujo de error

---

## 🚀 Orden Sugerido de Refactoring

1. **App.tsx** (15 min)
   - Login
   - Registro
   - Logout

2. **CrmDashboard.tsx** (20 min)
   - loadData
   - handleDeleteOrder
   - handleApproveClient
   - handleCreateClient

3. **useAuthStore.ts** (5 min)
   - logout

4. **useProjectStore.ts** (10 min)
   - loadProjectFromURL

5. **Resto de componentes** (según necesidad)

---

## 💡 Tips Importantes

1. **No elimines los try-catch**, solo mejora lo que está dentro
2. **Usa contextos descriptivos** para debugging
3. **Toasts de loading** para operaciones que tardan >500ms
4. **Mensajes claros** para el usuario (no técnicos)
5. **Testea cada cambio** antes de continuar

---

## 📊 Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| Debugging | console.log | Logs estructurados |
| UX | Sin feedback | Toasts informativos |
| Producción | Errores silenciosos | Tracking centralizado |
| Mantenimiento | Código disperso | Sistema centralizado |

---

¿Listo para empezar a refactorizar? 🚀
