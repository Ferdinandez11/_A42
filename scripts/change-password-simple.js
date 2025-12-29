// ============================================================================
// SCRIPT SIMPLE: Cambiar contraseña de usuario en Supabase
// ============================================================================
// USO: 
//   1. Edita las variables SUPABASE_URL, SERVICE_ROLE_KEY, USER_EMAIL y NEW_PASSWORD abajo
//   2. Ejecuta: node scripts/change-password-simple.js
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURACIÓN - EDITA ESTOS VALORES
// ============================================================================

// 1. Ve a Supabase Dashboard → Settings → API
// 2. Copia el "Project URL" aquí:
const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI';

// 3. Copia la "service_role" key aquí (¡CUIDADO! Es secreta, no la compartas):
const SERVICE_ROLE_KEY = 'TU_SERVICE_ROLE_KEY_AQUI';

// 4. Email del usuario a cambiar:
const USER_EMAIL = 'prueba@prueba.com';

// 5. Nueva contraseña (debe cumplir: 8+ chars, mayúscula, minúscula, número):
const NEW_PASSWORD = 'Prueba123';

// ============================================================================
// NO EDITES NADA MÁS ABAJO
// ============================================================================

async function changePassword() {
  if (!SUPABASE_URL || SUPABASE_URL === 'TU_SUPABASE_URL_AQUI') {
    console.error('❌ Error: Debes configurar SUPABASE_URL en el script');
    console.log('');
    console.log('Para obtener el URL:');
    console.log('  1. Ve a Supabase Dashboard → Settings → API');
    console.log('  2. Copia el "Project URL"');
    process.exit(1);
  }

  if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'TU_SERVICE_ROLE_KEY_AQUI') {
    console.error('❌ Error: Debes configurar SERVICE_ROLE_KEY en el script');
    console.log('');
    console.log('Para obtener la Service Role Key:');
    console.log('  1. Ve a Supabase Dashboard → Settings → API');
    console.log('  2. Copia la "service_role" key (¡CUIDADO! Es secreta)');
    process.exit(1);
  }

  // Crear cliente con Service Role Key (tiene permisos de admin)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
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
      console.log('');
      console.log('Usuarios disponibles:');
      users.users.forEach((u) => {
        console.log(`  - ${u.email} (${u.id})`);
      });
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.id}`);
    console.log(`🔐 Cambiando contraseña a: ${NEW_PASSWORD}...`);

    // Cambiar contraseña usando admin API
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD,
    });

    if (error) {
      console.error('❌ Error al cambiar contraseña:', error.message);
      if (error.message.includes('Password')) {
        console.log('');
        console.log('💡 La contraseña debe cumplir:');
        console.log('  - Mínimo 8 caracteres');
        console.log('  - Al menos una mayúscula (A-Z)');
        console.log('  - Al menos una minúscula (a-z)');
        console.log('  - Al menos un número (0-9)');
      }
      process.exit(1);
    }

    console.log('');
    console.log('✅ ¡Contraseña cambiada exitosamente!');
    console.log('');
    console.log('📝 Detalles:');
    console.log(`   Email: ${USER_EMAIL}`);
    console.log(`   Nueva contraseña: ${NEW_PASSWORD}`);
    console.log('');
    console.log('🎉 Ahora puedes iniciar sesión con esta contraseña');
    console.log('');
    console.log('⚠️  IMPORTANTE: Elimina o protege este script después de usarlo');
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

// Ejecutar
changePassword();

