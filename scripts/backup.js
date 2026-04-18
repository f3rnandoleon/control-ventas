const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const backupDir = path.join(__dirname, '..', 'backups');

// Función segura para leer MONGODB_URI desde el archivo
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

// Función para actualizar LAST_BACKUP_AT en .env.local
function updateLastBackupTime() {
  let envContent = fs.readFileSync(envPath, 'utf8');
  const timestamp = new Date().toISOString();
  
  if (envContent.includes('LAST_BACKUP_AT=')) {
    envContent = envContent.replace(/^LAST_BACKUP_AT=.*$/m, `LAST_BACKUP_AT=${timestamp}`);
  } else {
    // Si la variable no existe, agregarla al final
    envContent += `\nLAST_BACKUP_AT=${timestamp}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ [OK] LAST_BACKUP_AT actualizado a: ${timestamp}`);
}

function runBackup() {
  const uri = getMongoUri();
  
  // Si la carpeta de backups no existe, crearla
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
  const archivePath = path.join(backupDir, `dump_${dateStr}.archive`);
  
  // Resolver el ejecutable (Fallback por si Windows no ha recargado el PATH)
  let mongodumpPath = 'mongodump';
  const windowsFallback = '"C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe"';
  
  try {
    // Intentar ver si existe global
    execSync('mongodump --version', { stdio: 'ignore' });
  } catch (err) {
    // Si falla, usar el fallback seguro de la instalación en Windows
    mongodumpPath = windowsFallback;
  }

  // Comando con formato archive (un solo archivo compacto)
  const cmd = `${mongodumpPath} --uri="${uri}" --archive="${archivePath}"`;
  
  console.log("⏳ Iniciando el respaldo de la base de datos...");
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ [OK] Backup completado exitosamente: ${archivePath}`);
    updateLastBackupTime();
    console.log("🚀 El sistema ahora reportará un backup completamente fresco.");
  } catch (error) {
    console.error("❌ Hubo un error al ejecutar el backup:", error.message);
    process.exit(1);
  }
}

runBackup();
