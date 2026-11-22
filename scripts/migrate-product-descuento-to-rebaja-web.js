/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Script de migración:
 * Migra el campo legado `descuento` (0..100) de la colección `productos` al subdocumento
 * estructurado `rebajaWeb` (`{ activa, tipo, valor, fechaInicio, fechaFin }`)
 * y limpia el campo legado `descuento`.
 *
 * Uso:
 *   node scripts/migrate-product-descuento-to-rebaja-web.js
 */
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const mongoose = require("mongoose");

// El driver de MongoDB usa consultas SRV. Algunos DNS de Windows o del ISP las
// rechazan aunque los resolvers públicos funcionen correctamente.
const dnsServers = (process.env.MONGODB_DNS_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);
if (dnsServers.length > 0) {
  dns.setServers(dnsServers);
}

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

function resolveMongoUrl() {
  const raw = process.env.MONGODB_URL || process.env.MONGODB_URI;
  if (!raw) {
    throw new Error("No se encontró MONGODB_URL (ni MONGODB_URI) en .env.local ni en el entorno");
  }
  return raw;
}

function buildDirectShardFallback(srvUrl) {
  if (!srvUrl.includes("cluster0.z7gxvd8.mongodb.net")) return null;
  const match = srvUrl.match(/^mongodb\+srv:\/\/([^@]+)@[^/]+(\/[^?]*)?/);
  if (!match) return null;
  const auth = match[1];
  const dbPath = match[2] || "/";
  return `mongodb://${auth}@ac-ut9r8my-shard-00-00.z7gxvd8.mongodb.net:27017,ac-ut9r8my-shard-00-01.z7gxvd8.mongodb.net:27017,ac-ut9r8my-shard-00-02.z7gxvd8.mongodb.net:27017${dbPath}?ssl=true&replicaSet=atlas-110gix-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;
}

async function connectWithFallback(uri) {
  try {
    await mongoose.connect(uri);
  } catch (err) {
    if (err && (err.code === "ECONNREFUSED" || err.syscall === "querySrv")) {
      const fallback = buildDirectShardFallback(uri);
      if (fallback) {
        console.warn("Fallo querySrv; reintentando conexión directa a shards...");
        await mongoose.connect(fallback);
        return;
      }
    }
    throw err;
  }
}

async function run() {
  loadEnvLocal();
  const uri = resolveMongoUrl();

  console.log("Conectando a MongoDB...");
  await connectWithFallback(uri);
  console.log(`Conectado a la base de datos: ${mongoose.connection.name}`);

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
