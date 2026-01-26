// Script para codificar contraseñas para URLs de Supabase
// Uso: node src/scripts/encodePassword.js "tu-contraseña"

const password = process.argv[2];

if (!password) {
  console.error('❌ Por favor proporciona una contraseña como argumento');
  console.log('Uso: node src/scripts/encodePassword.js "tu-contraseña"');
  process.exit(1);
}

// Codificar la contraseña para URL (encodeURIComponent codifica correctamente todos los caracteres especiales)
const encoded = encodeURIComponent(password);
console.log('\n🔐 Codificación de contraseña para Supabase\n');
console.log(`Contraseña original: ${password}`);
console.log(`Contraseña codificada: ${encoded}\n`);
console.log('URL completa de ejemplo:');
console.log(`postgresql://postgres.xxx:${encoded}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres\n`);
console.log('⚠️  IMPORTANTE: Esta es solo la codificación. La contraseña real debe obtenerse desde el dashboard de Supabase.');
console.log('   Ve a: Settings → Database → Connection string\n');

// Mostrar caracteres especiales comunes
const specialChars = {
  '!': '%21',
  '@': '%40',
  '#': '%23',
  '$': '%24',
  '%': '%25',
  '&': '%26',
  '+': '%2B',
  '=': '%3D',
  '?': '%3F',
  '/': '%2F',
  ':': '%3A',
};

console.log('Caracteres especiales en tu contraseña:');
let found = false;
for (const [char, encoded] of Object.entries(specialChars)) {
  if (password.includes(char)) {
    console.log(`  ${char} → ${encoded}`);
    found = true;
  }
}
if (!found) {
  console.log('  (No se encontraron caracteres especiales comunes)');
}
