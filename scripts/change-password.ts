// ============================================================================
// SCRIPT TEMPORAL: Cambiar contraseña de usuario en Supabase
// ============================================================================
// USO: Ejecutar con: npx tsx scripts/change-password.ts
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Configuración - Reemplaza con tus valores
// Puedes obtener estos valores de:
// 1. Supabase Dashboard → Settings → API → Project URL
// 2. Supabase Dashboard → Settings → API → service_role key (¡SECRETO!)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'TU_SUPABASE_URL_AQUI';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'TU_SERVICE_ROLE_KEY_AQUI';

// Email del usuario y nueva contraseña
const USER_EMAIL = 'prueba@prueba.com';
const NEW_PASSWORD = 'Prueba123'; // Debe cumplir: 8+ chars, mayúscula, minúscula, número

async function changePassword() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Faltan variables de entorno');
    console.log('Necesitas configurar:');
    console.log('  - VITE_SUPABASE_URL');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY (Service Role Key, no la anon key)');
    console.log('');
    console.log('Para obtener la Service Role Key:');
    console.log('  1. Ve a Supabase Dashboard → Settings → API');
    console.log('  2. Copia la "service_role" key (¡CUIDADO! Es secreta)');
    process.exit(1);
  }

  // Crear cliente con Service Role Key (tiene permisos de admin)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log(`🔍 Buscando usuario: ${USER_EMAIL}...`);

    // Buscar usuario por email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error al listar usuarios:', listError.message);
      process.exit(1);
    }

    const user = users.users.find((u) => u.email === USER_EMAIL);

    if (!user) {
      console.error(`❌ Usuario ${USER_EMAIL} no encontrado`);
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.id}`);
    console.log(`🔐 Cambiando contraseña...`);

    // Cambiar contraseña usando admin API
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD,
    });

    if (error) {
      console.error('❌ Error al cambiar contraseña:', error.message);
      process.exit(1);
    }

    console.log('✅ Contraseña cambiada exitosamente!');
    console.log('');
    console.log('📝 Detalles:');
    console.log(`   Email: ${USER_EMAIL}`);
    console.log(`   Nueva contraseña: ${NEW_PASSWORD}`);
    console.log('');
    console.log('⚠️  IMPORTANTE: Elimina este script después de usarlo por seguridad');
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

// Ejecutar
changePassword();

