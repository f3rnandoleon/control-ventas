/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const projectRoot = path.join(__dirname, "..");
const envPath = path.join(projectRoot, ".env.local");

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

  if (url.includes("cluster0.z7gxvd8.mongodb.net")) {
    const authMatch = url.match(/mongodb\+srv:\/\/([^@]+)@/);
    if (authMatch) {
      const auth = authMatch[1];
      return `mongodb://${auth}@ac-ut9r8my-shard-00-00.z7gxvd8.mongodb.net:27017,ac-ut9r8my-shard-00-01.z7gxvd8.mongodb.net:27017,ac-ut9r8my-shard-00-02.z7gxvd8.mongodb.net:27017/?ssl=true&replicaSet=atlas-110gix-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;
    }
  }

  return url;
}

async function seedCashAccounts() {
  const mongoUrl = getMongoUrl();
  console.log("Conectando a MongoDB Atlas...");
  await mongoose.connect(mongoUrl);
  console.log("¡Conexión exitosa a MongoDB Atlas!");

  try {
    const db = mongoose.connection.db;
    const sucursalesCol = db.collection("sucursals");
    const cuentasCol = db.collection("cuentadineros");

    const almCentral = await sucursalesCol.findOne({ codigo: "ALM-CENTRAL" });
    const tienda1 = await sucursalesCol.findOne({ codigo: "TDA-01" });

    if (!almCentral || !tienda1) {
      console.error("Sucursales no encontradas en la BD.");
      return;
    }

    console.log(`Almacén Central: ${almCentral._id}`);
    console.log(`Tienda 1: ${tienda1._id}`);

    // 1. Caja Chica Tienda 1
    const resTienda1 = await cuentasCol.findOneAndUpdate(
      { nombre: "Caja Chica Tienda 1" },
      {
        $set: {
          nombre: "Caja Chica Tienda 1",
          tipo: "CAJA_FISICA",
          moneda: "BOB",
          sucursalId: tienda1._id,
          activa: true,
          esPredeterminadaPOS: true,
          esPredeterminadaQR: false,
          notas: "Efectivo físico en mostrador Tienda 1",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          saldoActual: 0,
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    console.log("Caja Chica Tienda 1 configurada:", resTienda1?._id || "OK");

    // 2. Caja Almacén Central
    const resAlm = await cuentasCol.findOneAndUpdate(
      { nombre: "Caja Almacén Central" },
      {
        $set: {
          nombre: "Caja Almacén Central",
          tipo: "CAJA_FISICA",
          moneda: "BOB",
          sucursalId: almCentral._id,
          activa: true,
          esPredeterminadaPOS: false,
          esPredeterminadaQR: false,
          notas: "Caja para pagos y fletes de Almacén Central",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          saldoActual: 0,
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    console.log("Caja Almacén Central configurada:", resAlm?._id || "OK");

    // 3. Cuenta Banco / QR General
    const resBanco = await cuentasCol.findOneAndUpdate(
      { nombre: "Cuenta Banco / QR General" },
      {
        $set: {
          nombre: "Cuenta Banco / QR General",
          tipo: "BANCO",
          moneda: "BOB",
          sucursalId: null, // Cuenta global
          activa: true,
          esPredeterminadaPOS: false,
          esPredeterminadaQR: true,
          bancoNombre: "Banco Nacional",
          notas: "Cuenta para cobros digitales QR y transferencias web y tienda",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          saldoActual: 0,
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    console.log("Cuenta Banco / QR General configurada:", resBanco?._id || "OK");

    console.log("¡Cuentas de dinero iniciales creadas y configuradas con éxito!");
  } finally {
    await mongoose.disconnect();
  }
}

seedCashAccounts().catch(console.error);
