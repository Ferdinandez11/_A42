-- ============================================================================
-- SCRIPT: HABILITAR SHARE EN PROYECTOS EXISTENTES
-- Fecha: Diciembre 2025
-- Objetivo: Habilitar share_enabled y generar share_token para proyectos que no lo tengan
-- ============================================================================

-- Habilitar share y generar token para proyectos existentes que no lo tengan
UPDATE public.projects
SET 
  share_enabled = true,
  share_token = gen_random_uuid()
WHERE 
  share_enabled = false 
  OR share_token IS NULL;

-- Verificar que todos los proyectos tienen share habilitado
SELECT 
  COUNT(*) as total_projects,
  COUNT(*) FILTER (WHERE share_enabled = true) as share_enabled_count,
  COUNT(*) FILTER (WHERE share_token IS NOT NULL) as has_token_count
FROM public.projects;
