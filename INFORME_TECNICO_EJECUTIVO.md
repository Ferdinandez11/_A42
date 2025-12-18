# INFORME TÉCNICO EJECUTIVO
## Proyecto A42 - Estado Técnico Actual

**Fecha:** Diciembre 2025  
**Versión del Proyecto:** 0.0.0  
**Estado:** Producto en desarrollo (MVP avanzado)  
**Autor:** Principal Software Architect

---

## 1. RESUMEN EJECUTIVO

A42 es una aplicación web que combina **editor 3D** (Three.js) con **CRM** (clientes/presupuestos/pedidos) y **generación de PDF**, apoyándose en **Supabase** (Auth + PostgreSQL + Storage). El sistema permite diseñar proyectos 3D, convertirlos en solicitudes y gestionar el ciclo de vida desde portal cliente y panel admin.

**Indicadores actuales (medidos):**
- **Tests:** 509 total → **499 passing**, **10 skipped**, **0 failing**
- **Coverage real (v8):** Stmts **52.86%**, Branch **43.21%**, Funcs **59.64%**, Lines **53.74%**
- **TypeScript:** compilación sin errores (según pipeline local actual)

---

## 2. ARQUITECTURA ACTUAL

### 2.1 Módulos
La aplicación sigue una arquitectura modular con separación explícita:
- **`domain/`**: tipos y contratos compartidos.
- **`core/`**: infraestructura (Supabase, error handling, stores globales, servicios compartidos).
- **`editor/`**: motor 3D, managers, stores, UI, exportación y AR.
- **`pdf/`**: utilidades de presupuestos, precios y generación PDF.
- **`crm/`**: portal admin/cliente, hooks y componentes para pedidos/presupuestos.
- **`erp/`**: reservado para evolución.

### 2.2 Integraciones críticas
- **Editor↔CRM**: el “proyecto” 3D se relaciona con pedidos/presupuestos; cuando un proyecto tiene pedidos asociados se fuerza modo “solo lectura”.
- **CRM↔PDF↔Storage**: generación de PDF de presupuesto + subida a Supabase Storage y registro como adjunto.
- **AR (WebXR)**: soporte de sesión AR con manejo de transparencia y overlay.

---

## 3. CALIDAD TÉCNICA

### 3.1 Estado actual
- **Arquitectura:** sólida y coherente, con límites de módulos prácticos.
- **Testing:** suite estable (0 fallos) y coverage real generado.
- **Deuda técnica:** moderada, principalmente por contratos de datos dinámicos y componentes grandes.

### 3.2 Observaciones relevantes
- Existen **warnings no bloqueantes** en tests sobre `act(...)` (conviene reducirlos para evitar fragilidad).
- Algunos flujos dependen de **datos dinámicos** (project data/items), lo que reduce garantías de TypeScript en puntos clave.

---

## 4. TESTING & FIABILIDAD

### 4.1 Resumen
- **Suite de tests:** estable y ejecutable para CI.
- **Coverage real:** en torno a 53-60% según métrica, con ramas más bajas (43%).

### 4.2 Recomendación de evolución
- Subir thresholds gradualmente, empezando por **líneas** y **statements**, y reforzar coverage en:
  - CRM pages críticas
  - hooks de sincronización
  - lógica de pricing/BOM

---

## 5. RIESGOS TÉCNICOS (3–6 meses)

1. **Contrato débil del “Project Data”** (datos dinámicos): riesgo de romper pricing/PDF/editor.
2. **Coverage moderado con branches bajas**: riesgo de regresiones en condiciones de borde.
3. **Componentes grandes** (UI+negocio mezclados): mantenimiento lento y diffs grandes.
4. **AR sensible a CSS/layout**: cambios de estilos pueden reintroducir fondo opaco.

---

## 6. RECOMENDACIONES PRIORITARIAS

1. Definir y centralizar el **contrato tipado** del dato de proyecto (shape estable + migraciones si cambia).
2. Reducir warnings de `act(...)` en tests más críticos.
3. Incrementar coverage en CRM/pages y flujos de negocio (presupuesto→pedido→PDF).

---

**Documento actualizado:** Diciembre 2025
