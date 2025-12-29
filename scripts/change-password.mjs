// ============================================================================
// SCRIPT: Cambiar contraseña de usuario en Supabase
// ============================================================================
// INSTRUCCIONES:
//   1. Edita las 4 variables abajo (SUPABASE_URL, SERVICE_ROLE_KEY, etc.)
//   2. Ejecuta: node scripts/change-password.mjs
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// ⚙️ CONFIGURACIÓN - EDITA ESTAS 4 VARIABLES
// ============================================================================

// 1️⃣ Ve a: Supabase Dashboard → Settings → API → Project URL
const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI';

// 2️⃣ Ve a: Supabase Dashboard → Settings → API → service_role key
//    (¡CUIDADO! Es secreta, no la compartas)
const SERVICE_ROLE_KEY = 'TU_SERVICE_ROLE_KEY_AQUI';

// 3️⃣ Email del usuario
const USER_EMAIL = 'prueba@prueba.com';

// 4️⃣ Nueva contraseña (8+ chars, mayúscula, minúscula, número)
const NEW_PASSWORD = 'Prueba123';

// ============================================================================
// 🚀 NO EDITES NADA MÁS ABAJO
// ============================================================================

async function changePassword() {
  // Validar configuración
  if (!SUPABASE_URL || SUPABASE_URL === 'TU_SUPABASE_URL_AQUI') {
    console.error('❌ Error: Debes configurar SUPABASE_URL');
    console.log('');
    console.log('📋 Pasos:');
    console.log('  1. Ve a Supabase Dashboard → Settings → API');
    console.log('  2. Copia el "Project URL"');
    console.log('  3. Pégalo en la variable SUPABASE_URL del script');
    process.exit(1);
  }

  if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'TU_SERVICE_ROLE_KEY_AQUI') {
    console.error('❌ Error: Debes configurar SERVICE_ROLE_KEY');
    console.log('');
    console.log('📋 Pasos:');
    console.log('  1. Ve a Supabase Dashboard → Settings → API');
    console.log('  2. Busca "service_role" key (está más abajo, no la anon key)');
    console.log('  3. Haz clic en "Reveal" para verla');
    console.log('  4. Cópiala y pégala en SERVICE_ROLE_KEY del script');
    console.log('  ⚠️  IMPORTANTE: Esta key es SECRETA, no la compartas');
    process.exit(1);
  }

  console.log('🔧 Configuración OK');
  console.log(`🔍 Buscando usuario: ${USER_EMAIL}...`);
  console.log('');

  // Crear cliente con Service Role Key
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Buscar usuario
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error al buscar usuarios:', listError.message);
      process.exit(1);
    }

    const user = users.users.find((u) => u.email === USER_EMAIL);

    if (!user) {
      console.error(`❌ Usuario "${USER_EMAIL}" no encontrado`);
      console.log('');
      console.log('📋 Usuarios disponibles:');
      users.users.forEach((u) => {
        console.log(`   - ${u.email}`);
      });
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.id}`);
    console.log(`🔐 Cambiando contraseña...`);
    console.log('');

    // Cambiar contraseña
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD,
    });

    if (error) {
      console.error('❌ Error:', error.message);
      if (error.message.includes('Password')) {
        console.log('');
        console.log('💡 La contraseña debe cumplir:');
        console.log('   ✓ Mínimo 8 caracteres');
        console.log('   ✓ Al menos una mayúscula (A-Z)');
        console.log('   ✓ Al menos una minúscula (a-z)');
        console.log('   ✓ Al menos un número (0-9)');
      }
      process.exit(1);
    }

    console.log('✅ ¡Contraseña cambiada exitosamente!');
    console.log('');
    console.log('📝 Detalles:');
    console.log(`   Email: ${USER_EMAIL}`);
    console.log(`   Nueva contraseña: ${NEW_PASSWORD}`);
    console.log('');
    console.log('🎉 Ahora puedes iniciar sesión con esta contraseña');
    console.log('');
    console.log('⚠️  Recuerda eliminar o proteger este script después de usarlo');
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    process.exit(1);
  }
}

changePassword();

