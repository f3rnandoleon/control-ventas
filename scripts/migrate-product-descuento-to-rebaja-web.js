/**
 * Script de migración:
 * Migra el campo legado `descuento` (0..100) de la colección `productos` al subdocumento
 * estructurado `rebajaWeb` (`{ activa, tipo, valor, fechaInicio, fechaFin }`)
 * y limpia el campo legado `descuento`.
 *
 * Uso:
 *   node scripts/migrate-product-descuento-to-rebaja-web.js
 */
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

async function run() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URL;
  if (!uri) {
    console.error("ERROR: MONGODB_URI no está definida en el entorno ni en .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection("productos");

  const cursor = collection.find({ descuento: { $exists: true } });
  let scanned = 0;
  let migratedActive = 0;
  let migratedInactive = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned++;
    const legacyPct = Number(doc.descuento || 0);
    const alreadyHasRebaja = Boolean(doc.rebajaWeb && typeof doc.rebajaWeb === "object");

    const updateOps = { $unset: { descuento: "" } };

    if (!alreadyHasRebaja) {
      if (legacyPct > 0 && legacyPct < 100) {
        updateOps.$set = {
          rebajaWeb: {
            activa: true,
            tipo: "PORCENTAJE",
            valor: Math.min(95, legacyPct),
            fechaInicio: null,
            fechaFin: null,
          },
        };
        migratedActive++;
      } else {
        updateOps.$set = {
          rebajaWeb: {
            activa: false,
            tipo: "PORCENTAJE",
            valor: 0,
            fechaInicio: null,
            fechaFin: null,
          },
        };
        migratedInactive++;
      }
    }

    await collection.updateOne({ _id: doc._id }, updateOps);
  }

  console.log(
    `Migración completada. Escaneados: ${scanned}, Activos migrados: ${migratedActive}, Inactivos inicializados: ${migratedInactive}`
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error en migración de descuento -> rebajaWeb:", err);
  process.exit(1);
});
