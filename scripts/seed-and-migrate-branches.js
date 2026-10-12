/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const mongoose = require("mongoose");

const projectRoot = path.join(__dirname, "..");
const envPath = path.join(projectRoot, ".env.local");

// Si se especifica un servidor DNS personalizado, usarlo; de lo contrario, usar el DNS del sistema operativo
if (process.env.MONGODB_DNS_SERVERS) {
  const dnsServers = process.env.MONGODB_DNS_SERVERS
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
  }
}

function getMongoUrl() {
  let url = process.env.MONGODB_URL;
  if (!url && fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/^MONGODB_URL=(.*)$/m);
    if (match?.[1]?.trim()) {
      url = match[1].trim().replace(/^['\"]|['\"]$/g, "");
    }
  }

  if (!url) {
    throw new Error("No se encontró MONGODB_URL en .env.local");
  }

  // Si la URL es mongodb+srv para cluster0.z7gxvd8.mongodb.net, resolver directamente a los shards
  // para evitar fallos de DNS SRV/TXT en Windows
  if (url.includes("cluster0.z7gxvd8.mongodb.net")) {
    const authMatch = url.match(/mongodb\+srv:\/\/([^@]+)@/);
    if (authMatch) {
      const auth = authMatch[1];
      return `mongodb://${auth}@ac-ut9r8my-shard-00-00.z7gxvd8.mongodb.net:27017,ac-ut9r8my-shard-00-01.z7gxvd8.mongodb.net:27017,ac-ut9r8my-shard-00-02.z7gxvd8.mongodb.net:27017/?ssl=true&replicaSet=atlas-110gix-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;
    }
  }

  return url;
}

async function runMigration() {
  const mongoUrl = getMongoUrl();
  console.log("Conectando a MongoDB...");
  await mongoose.connect(mongoUrl);
  console.log("Conexión exitosa a la base de datos.");

  const db = mongoose.connection.db;

  // 1. Colecciones directas
  const sucursalesCol = db.collection("sucursals");
  const nivelStockCol = db.collection("nivelstocks");
  const productosCol = db.collection("productos");
  const usersCol = db.collection("users");
  const inventariosCol = db.collection("inventarios");

  console.log("\n==================================================");
  console.log("PASO 1: Creación / Verificación de Sucursales Base");
  console.log("==================================================");

  let almacenCentral = await sucursalesCol.findOne({ codigo: "ALM-CENTRAL" });
  if (!almacenCentral) {
    const res = await sucursalesCol.insertOne({
      nombre: "Almacén Central",
      codigo: "ALM-CENTRAL",
      tipo: "ALMACEN_CENTRAL",
      direccion: "Centro Principal de Distribución y Almacenaje",
      ciudad: "La Paz",
      telefono: "S/N",
      permiteVentaPOS: false,
      permiteDespachoWeb: true,
      permiteRetiroCliente: false,
      activa: true,
      esAlmacenPrincipal: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    almacenCentral = await sucursalesCol.findOne({ _id: res.insertedId });
    console.log("✅ Creada sucursal: Almacén Central (ALM-CENTRAL)");
  } else {
    console.log("ℹ️ Ya existe sucursal: Almacén Central (ALM-CENTRAL)");
  }

  let tienda1 = await sucursalesCol.findOne({ codigo: "TDA-01" });
  if (!tienda1) {
    const res = await sucursalesCol.insertOne({
      nombre: "Tienda 1",
      codigo: "TDA-01",
      tipo: "TIENDA_FISICA",
      direccion: "Sucursal Comercial 1",
      ciudad: "La Paz",
      telefono: "S/N",
      permiteVentaPOS: true,
      permiteDespachoWeb: false,
      permiteRetiroCliente: true,
      activa: true,
      esAlmacenPrincipal: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    tienda1 = await sucursalesCol.findOne({ _id: res.insertedId });
    console.log("✅ Creada sucursal: Tienda 1 (TDA-01)");
  } else {
    console.log("ℹ️ Ya existe sucursal: Tienda 1 (TDA-01)");
  }

  console.log("\n==================================================");
  console.log("PASO 2: Asignación de Vendedores a Tienda 1");
  console.log("==================================================");

  const vendedoresResult = await usersCol.updateMany(
    { rol: "VENDEDOR", $or: [{ sucursalAsignadaId: { $exists: false } }, { sucursalAsignadaId: null }] },
    { $set: { sucursalAsignadaId: tienda1._id, updatedAt: new Date() } }
  );
  console.log(`✅ Vendedores asignados a Tienda 1: ${vendedoresResult.modifiedCount}`);

  console.log("\n==================================================");
  console.log("PASO 3: Migración de Stock a Almacén Central");
  console.log("==================================================");

  const productos = await productosCol.find({}).toArray();
  console.log(`Analizando ${productos.length} productos en catálogo...`);

  let nivelesCreadosAlmacen = 0;
  let nivelesCreadosTienda1 = 0;
  let totalPrendasMigradas = 0;

  for (const prod of productos) {
    const variantes = prod.variantes || [];

    for (const v of variantes) {
      const stockActual = Math.max(0, Number(v.stock || 0));
      const stockReservado = Math.max(0, Number(v.stockReservado || 0));

      // 1. Nivel de Stock en Almacén Central
      const existeAlmacen = await nivelStockCol.findOne({
        sucursalId: almacenCentral._id,
        varianteId: v.varianteId,
      });

      if (!existeAlmacen) {
        await nivelStockCol.insertOne({
          sucursalId: almacenCentral._id,
          productoId: prod._id,
          varianteId: v.varianteId,
          stockFisico: stockActual,
          stockReservado: stockReservado,
          stockMinimo: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        nivelesCreadosAlmacen++;
        totalPrendasMigradas += stockActual;
      }

      // 2. Nivel de Stock en Tienda 1 (inicializado en 0)
      const existeTienda1 = await nivelStockCol.findOne({
        sucursalId: tienda1._id,
        varianteId: v.varianteId,
      });

      if (!existeTienda1) {
        await nivelStockCol.insertOne({
          sucursalId: tienda1._id,
          productoId: prod._id,
          varianteId: v.varianteId,
          stockFisico: 0,
          stockReservado: 0,
          stockMinimo: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        nivelesCreadosTienda1++;
      }
    }
  }

  console.log(`✅ Registros de stock creados en Almacén Central: ${nivelesCreadosAlmacen}`);
  console.log(`✅ Registros de stock inicializados en Tienda 1: ${nivelesCreadosTienda1}`);
  console.log(`✅ Total de prendas físicas migradas al Almacén Central: ${totalPrendasMigradas}`);

  console.log("\n==================================================");
  console.log("PASO 4: Vinculación histórica de Inventarios");
  console.log("==================================================");

  const inventariosResult = await inventariosCol.updateMany(
    { $or: [{ sucursalId: { $exists: false } }, { sucursalId: null }] },
    { $set: { sucursalId: almacenCentral._id } }
  );
  console.log(`✅ Movimientos históricos de kárdex asignados a Almacén Central: ${inventariosResult.modifiedCount}`);

  console.log("\n==================================================");
  console.log("🎉 MIGRACIÓN MULTI-SUCURSAL COMPLETADA CON ÉXITO");
  console.log("==================================================");
  console.log(`- Almacén Central ID: ${almacenCentral._id}`);
  console.log(`- Tienda 1 ID: ${tienda1._id}`);
  console.log("==================================================\n");

  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error("❌ Error durante la migración:", err);
  process.exit(1);
});
