-- ============================================================================
-- SCRIPT DE CORRECCIÓN RLS - A42
-- Fecha: Diciembre 2025
-- Objetivo: Cerrar agujeros de seguridad y permitir share público seguro
-- ============================================================================

-- ============================================================================
-- PARTE 1: PREPARAR COLUMNAS DE SHARE TOKEN
-- ============================================================================

-- Habilitar extensión para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Añadir columnas de share (si no existen)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Índice único para búsqueda rápida por token
CREATE UNIQUE INDEX IF NOT EXISTS projects_share_token_uk 
  ON public.projects (share_token) 
  WHERE share_enabled = true;

-- ============================================================================
-- PARTE 2: FUNCIÓN HELPER PARA VERIFICAR ROL ADMIN
-- ============================================================================

-- Función helper para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$;

-- Función helper para verificar si el usuario es employee o admin
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role IN ('admin', 'employee')
  );
$$;

-- ============================================================================
-- PARTE 3: RPC PARA PROYECTO COMPARTIDO (PUBLICO/QR)
-- ============================================================================

-- Eliminar función existente si tiene diferente firma (por si acaso)
DROP FUNCTION IF EXISTS public.get_shared_project(UUID, UUID);

-- Función RPC para obtener proyecto compartido (solo lectura, anónimo permitido)
CREATE OR REPLACE FUNCTION public.get_shared_project(
  project_id UUID, 
  token UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  data JSONB,
  thumbnail_url TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    p.id, 
    p.name, 
    p.data,
    p.thumbnail_url
  FROM public.projects p
  WHERE p.id = project_id
    AND p.share_enabled = true
    AND p.share_token = token
  LIMIT 1;
$$;

-- Permitir ejecución a anónimos y autenticados
GRANT EXECUTE ON FUNCTION public.get_shared_project(UUID, UUID) 
  TO anon, authenticated;

-- ============================================================================
-- PARTE 4: ELIMINAR POLICIES PELIGROSAS
-- ============================================================================

-- Eliminar policies abiertas de order_attachments
DROP POLICY IF EXISTS "Acceso total adjuntos" ON public.order_attachments;

-- Eliminar policies abiertas de order_observations
DROP POLICY IF EXISTS "Acceso total observaciones" ON public.order_observations;

-- Eliminar policies abiertas de order_messages
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver mensajes" ON public.order_messages;
DROP POLICY IF EXISTS "Usuarios autenticados pueden escribir mensajes" ON public.order_messages;

-- Eliminar policy anon de projects (ya no necesaria con RPC)
DROP POLICY IF EXISTS "Enable read access for anon" ON public.projects;

-- Eliminar policies abiertas de storage.objects (attachments)
DROP POLICY IF EXISTS "Usuarios pueden ver archivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden subir archivos" ON storage.objects;

-- Eliminar policies redundantes/duplicadas de orders (limpiar)
DROP POLICY IF EXISTS "Admin view all" ON public.orders;
DROP POLICY IF EXISTS "Admin update all" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Empleados ven todos los pedidos" ON public.orders;
DROP POLICY IF EXISTS "Empleados editan pedidos" ON public.orders;

-- Eliminar policies redundantes de profiles
DROP POLICY IF EXISTS "Admin view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Ver mi propio perfil" ON public.profiles;

-- Eliminar policies redundantes de projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Clientes ven sus proyectos" ON public.projects;
DROP POLICY IF EXISTS "Clientes crean sus proyectos" ON public.projects;
DROP POLICY IF EXISTS "Clientes actualizan sus proyectos" ON public.projects;
DROP POLICY IF EXISTS "Clientes borran sus proyectos" ON public.projects;

-- Eliminar policies redundantes de order_items
DROP POLICY IF EXISTS "Admins can view all items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;

-- ============================================================================
-- PARTE 5: CREAR POLICIES CORRECTAS - ORDERS
-- ============================================================================

-- Clientes ven solo sus pedidos
CREATE POLICY "clientes_ven_sus_pedidos"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR is_admin()
  );

-- Clientes crean sus propios pedidos
CREATE POLICY "clientes_crean_pedidos"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Clientes editan solo sus pedidos (si no tienen orders asociados)
CREATE POLICY "clientes_editan_sus_pedidos"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND NOT EXISTS (
      SELECT 1 FROM public.orders o2 
      WHERE o2.id = orders.id 
        AND o2.status IN ('presupuestado', 'pedido', 'en_proceso', 'enviado', 'entregado')
    )
  );

-- Admin/Employee pueden editar cualquier pedido
CREATE POLICY "admin_employee_editan_pedidos"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (is_employee())
  WITH CHECK (is_employee());

-- Clientes borran solo sus pedidos (si no están en estados avanzados)
CREATE POLICY "clientes_borran_sus_pedidos"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND status IN ('pendiente', 'rechazado', 'cancelado')
  );

-- Admin/Employee pueden borrar cualquier pedido
CREATE POLICY "admin_employee_borran_pedidos"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (is_employee());

-- ============================================================================
-- PARTE 6: CREAR POLICIES CORRECTAS - PROJECTS
-- ============================================================================

-- Clientes ven solo sus proyectos (o admin ve todos)
CREATE POLICY "clientes_ven_sus_proyectos"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR is_admin()
  );

-- Clientes crean sus propios proyectos
CREATE POLICY "clientes_crean_proyectos"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Clientes editan solo sus proyectos (si no tienen orders asociados)
CREATE POLICY "clientes_editan_sus_proyectos"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND NOT EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.project_id = projects.id
    )
  )
  WITH CHECK (auth.uid() = user_id);

-- Admin puede editar cualquier proyecto
CREATE POLICY "admin_edita_proyectos"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clientes borran solo sus proyectos (si no tienen orders asociados)
CREATE POLICY "clientes_borran_sus_proyectos"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND NOT EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.project_id = projects.id
    )
  );

-- Admin puede borrar cualquier proyecto
CREATE POLICY "admin_borra_proyectos"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- PARTE 7: CREAR POLICIES CORRECTAS - ORDER_ITEMS
-- ============================================================================

-- Ver items: solo si el order pertenece al usuario o es admin
CREATE POLICY "ver_items_de_mis_pedidos"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR is_admin())
    )
  );

-- Insertar items: solo si el order pertenece al usuario o es admin
CREATE POLICY "insertar_items_en_mis_pedidos"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR is_admin())
    )
  );

-- Actualizar items: solo si el order pertenece al usuario o es admin
CREATE POLICY "actualizar_items_de_mis_pedidos"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR is_admin())
    )
  );

-- Borrar items: solo si el order pertenece al usuario o es admin
CREATE POLICY "borrar_items_de_mis_pedidos"
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR is_admin())
    )
  );

-- ============================================================================
-- PARTE 8: CREAR POLICIES CORRECTAS - ORDER_MESSAGES
-- ============================================================================

-- Ver mensajes: solo si el order pertenece al usuario o es admin/employee
CREATE POLICY "ver_mensajes_de_mis_pedidos"
  ON public.order_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_messages.order_id
        AND (o.user_id = auth.uid() OR is_employee())
    )
  );

-- Insertar mensajes: solo si el order pertenece al usuario o es admin/employee
CREATE POLICY "escribir_mensajes_en_mis_pedidos"
  ON public.order_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_messages.order_id
        AND (o.user_id = auth.uid() OR is_employee())
    )
  );

-- ============================================================================
-- PARTE 9: CREAR POLICIES CORRECTAS - ORDER_OBSERVATIONS
-- ============================================================================

-- Ver observaciones: solo si el order pertenece al usuario o es admin/employee
CREATE POLICY "ver_observaciones_de_mis_pedidos"
  ON public.order_observations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_observations.order_id
        AND (o.user_id = auth.uid() OR is_employee())
    )
  );

-- Insertar observaciones: solo si el order pertenece al usuario o es admin/employee
CREATE POLICY "escribir_observaciones_en_mis_pedidos"
  ON public.order_observations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_observations.order_id
        AND (o.user_id = auth.uid() OR is_employee())
    )
  );

-- Actualizar observaciones: solo admin/employee
CREATE POLICY "admin_employee_editan_observaciones"
  ON public.order_observations
  FOR UPDATE
  TO authenticated
  USING (is_employee())
  WITH CHECK (is_employee());

-- Borrar observaciones: solo admin/employee
CREATE POLICY "admin_employee_borran_observaciones"
  ON public.order_observations
  FOR DELETE
  TO authenticated
  USING (is_employee());

-- ============================================================================
-- PARTE 10: CREAR POLICIES CORRECTAS - ORDER_ATTACHMENTS
-- ============================================================================

-- Ver adjuntos: solo si el order pertenece al usuario o es admin/employee
CREATE POLICY "ver_adjuntos_de_mis_pedidos"
  ON public.order_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_attachments.order_id
        AND (o.user_id = auth.uid() OR is_employee())
    )
  );

-- Insertar adjuntos: solo si el order pertenece al usuario o es admin/employee
CREATE POLICY "subir_adjuntos_en_mis_pedidos"
  ON public.order_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_attachments.order_id
        AND (o.user_id = auth.uid() OR is_employee())
    )
  );

-- Borrar adjuntos: solo admin/employee
CREATE POLICY "admin_employee_borran_adjuntos"
  ON public.order_attachments
  FOR DELETE
  TO authenticated
  USING (is_employee());

-- ============================================================================
-- PARTE 11: CREAR POLICIES CORRECTAS - PROFILES
-- ============================================================================

-- Ver perfil propio o admin ve todos
CREATE POLICY "ver_mi_perfil_o_admin_todos"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR is_admin()
  );

-- Actualizar perfil propio
CREATE POLICY "actualizar_mi_perfil"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin puede actualizar cualquier perfil
CREATE POLICY "admin_actualiza_perfiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin puede borrar perfiles
CREATE POLICY "admin_borra_perfiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- PARTE 12: CREAR POLICIES CORRECTAS - STORAGE.OBJECTS (ATTACHMENTS)
-- ============================================================================

-- Ver archivos de attachments: solo si pertenecen a un order del usuario o es admin/employee
CREATE POLICY "ver_archivos_adjuntos_privados"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attachments'
    AND (
      is_employee()
      OR EXISTS (
        SELECT 1 
        FROM public.order_attachments oa
        JOIN public.orders o ON o.id = oa.order_id
        WHERE oa.file_url LIKE '%' || storage.objects.name
          AND o.user_id = auth.uid()
      )
    )
  );

-- Subir archivos a attachments: solo autenticados (luego se valida en order_attachments)
CREATE POLICY "subir_archivos_adjuntos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attachments'
  );

-- Actualizar archivos: solo admin/employee
CREATE POLICY "admin_employee_actualizan_adjuntos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'attachments'
    AND is_employee()
  )
  WITH CHECK (
    bucket_id = 'attachments'
    AND is_employee()
  );

-- Borrar archivos: solo admin/employee
CREATE POLICY "admin_employee_borran_adjuntos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments'
    AND is_employee()
  );

-- ============================================================================
-- PARTE 13: MANTENER POLICIES DE STORAGE (THUMBNAILS) - PÚBLICAS
-- ============================================================================

-- Thumbnails siguen siendo públicos (ya están bien configurados)
-- No tocamos esas policies

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- Verificar que RLS está habilitado en todas las tablas críticas
-- (Ya debería estar, pero por si acaso)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;
