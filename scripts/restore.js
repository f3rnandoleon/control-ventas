const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const backupDir = path.join(__dirname, '..', 'backups');

function getMongoUri() {
  if (!fs.existsSync(envPath)) {
    console.error("❌ No se encontró el archivo .env.local");
    process.exit(1);
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^MONGODB_URL=(.*)$/m);
  if (!match) {
    console.error("❌ MONGODB_URL no está definido en .env.local");
    process.exit(1);
  }
  return match[1].trim();
}

function runRestore() {
  const args = process.argv.slice(2);
  const fileName = args[0];

  if (!fileName) {
    console.error("❌ Error: Debes proporcionar el nombre del archivo de backup generado.");
    console.log("👉 Ejemplo de uso: npm run restore dump_2026-04-18_10-00-00.archive");
    process.exit(1);
  }

  const archivePath = path.join(backupDir, fileName);

  if (!fs.existsSync(archivePath)) {
    console.error(`❌ Error: El archivo "${archivePath}" no existe.`);
    process.exit(1);
  }

  const uri = getMongoUri();
  
  // Resolver el ejecutable (Fallback por si Windows no ha recargado el PATH)
  let mongorestorePath = 'mongorestore';
  const windowsFallback = '"C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe"';
  
  try {
    execSync('mongorestore --version', { stdio: 'ignore' });
  } catch (err) {
    mongorestorePath = windowsFallback;
  }

  // Comando con formato archive y --drop
  // --drop advierte que borrará las colecciones existentes antes de reemplazarlas
  const cmd = `${mongorestorePath} --uri="${uri}" --archive="${archivePath}" --drop`;
  
  console.log(`⚠️ ATENCION: Estás a punto de reemplazar la base de datos actual usando el archivo "${fileName}". La información actual en las colecciones que existan en el dump será BORRADA y reemplazada.`);
  console.log("⏳ Iniciando la restauración de la base de datos...");
  
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ [OK] Restauración completada exitosamente desde: ${archivePath}`);
    console.log("Tú base de datos regresó a como estaba al momento del backup.");
  } catch (error) {
    console.error("❌ Hubo un error crítico al intentar la restauración:", error.message);
    process.exit(1);
  }
}

runRestore();
