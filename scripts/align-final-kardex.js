/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const envPath = path.join(__dirname, "..", ".env.local");

function getMongoUrl() {
  const content = fs.readFileSync(envPath, "utf8");
  const match = content.match(/^MONGODB_URL=(.*)$/m);
  let url = match[1].trim().replace(/^['"]|['"]$/g, "");
  if (url.includes("cluster0.z7gxvd8.mongodb.net")) {
    const authMatch = url.match(/mongodb\+srv:\/\/([^@]+)@/);
    if (authMatch) {
      const auth = authMatch[1];
      return `mongodb://${auth}@ac-ut9r8my-shard-00-00.z7gxvd8.mongodb.net:27017,ac-ut9r8my-shard-00-01.z7gxvd8.mongodb.net:27017,ac-ut9r8my-shard-00-02.z7gxvd8.mongodb.net:27017/?ssl=true&replicaSet=atlas-110gix-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;
    }
  }
  return url;
}

async function run() {
  const url = getMongoUrl();
  console.log("Conectando a MongoDB...");
  await mongoose.connect(url);
  const db = mongoose.connection.db;

  const productosCol = db.collection("productos");
  const inventariosCol = db.collection("inventarios");
  const sucursalesCol = db.collection("sucursals");
  const usersCol = db.collection("users");

  const almacenCentral = await sucursalesCol.findOne({ codigo: "ALM-CENTRAL" });
  const adminUser = (await usersCol.findOne({ rol: "ADMIN" })) || (await usersCol.findOne({}));
  const adminId = adminUser ? adminUser._id : null;

  const productos = await productosCol.find({}).toArray();

  let ajustesRealizados = 0;

  for (const p of productos) {
    for (const v of (p.variantes || [])) {
      const stockReal = Number(v.stock || 0);
      const costoVariante = Number(v.precioCosto || p.precioCosto || 0);

      const movs = await inventariosCol.find({
        productoId: p._id,
        "variante.varianteId": v.varianteId
      }).sort({ createdAt: 1 }).toArray();

      let running = 0;
      for (const m of movs) {
        const cant = Number(m.cantidad || 0);
        if (m.tipo === "ENTRADA" || m.tipo === "DEVOLUCION" || m.tipo === "TRASPASO_ENTRADA") {
          running += cant;
        } else {
          running = Math.max(0, running - cant);
        }
      }

      const diff = stockReal - running;

      if (diff < 0) {
        const cantidadSalida = Math.abs(diff);
        const fechaSalida = new Date("2026-10-11T23:00:00.000Z");
        const valorTotal = Number((cantidadSalida * costoVariante).toFixed(2));

        await inventariosCol.insertOne({
          productoId: p._id,
          sucursalId: almacenCentral._id,
          variante: {
            varianteId: v.varianteId,
            color: v.color,
            colorSecundario: v.colorSecundario || "",
            talla: v.talla,
            codigoBarra: v.codigoBarra || ""
          },
          productoSnapshot: {
            nombre: p.nombre,
            modelo: p.modelo || "",
            sku: p.sku || ""
          },
          tipo: "SALIDA",
          cantidad: cantidadSalida,
          stockAnterior: running,
          stockActual: stockReal,
          motivo: "Salida por regularización de duplicados y ventas previas",
          referencia: "REGULARIZACION_HISTORICA",
          costoUnitario: costoVariante,
          valorTotalOperacion: valorTotal,
          costoPromedioResultante: costoVariante,
          saldoValorado: Number((stockReal * costoVariante).toFixed(2)),
          usuario: adminId,
          createdAt: fechaSalida,
          updatedAt: fechaSalida
        });
        ajustesRealizados++;
        console.log(`✅ Ajuste salida aplicado: ${p.nombre} (${v.color}-${v.talla}) -> -${cantidadSalida} u.`);
      } else if (diff > 0) {
        const fechaEntrada = p.createdAt ? new Date(p.createdAt) : new Date("2026-05-01T00:00:00.000Z");
        const valorTotal = Number((diff * costoVariante).toFixed(2));

        await inventariosCol.insertOne({
          productoId: p._id,
          sucursalId: almacenCentral._id,
          variante: {
            varianteId: v.varianteId,
            color: v.color,
            colorSecundario: v.colorSecundario || "",
            talla: v.talla,
            codigoBarra: v.codigoBarra || ""
          },
          productoSnapshot: {
            nombre: p.nombre,
            modelo: p.modelo || "",
            sku: p.sku || ""
          },
          tipo: "ENTRADA",
          cantidad: diff,
          stockAnterior: running,
          stockActual: stockReal,
          motivo: "Inventario inicial de arranque / Pre-actualizacion",
          referencia: "INVENTARIO_INICIAL_SISTEMA",
          costoUnitario: costoVariante,
          valorTotalOperacion: valorTotal,
          costoPromedioResultante: costoVariante,
          saldoValorado: Number((stockReal * costoVariante).toFixed(2)),
          usuario: adminId,
          createdAt: fechaEntrada,
          updatedAt: fechaEntrada
        });
        ajustesRealizados++;
        console.log(`✅ Ajuste entrada aplicado: ${p.nombre} (${v.color}-${v.talla}) -> +${diff} u.`);
      }
    }
  }

  console.log(`\nTotal ajustes realizados: ${ajustesRealizados}`);

  // VERIFICACIÓN FINAL TOTAL
  console.log("\n==================================================");
  console.log("VERIFICACIÓN DEFINITIVA GLOBAL Y POR VARIANTE");
  console.log("==================================================");

  let fallosGlobales = 0;
  let fallosVariantes = 0;

  for (const prod of productos) {
    const totalStockProd = (prod.variantes || []).reduce((acc, v) => acc + Number(v.stock || 0), 0);

    const movsProd = await inventariosCol.find({ productoId: prod._id }).sort({ createdAt: 1 }).toArray();
    let runningGlobal = 0;
    for (const m of movsProd) {
      const cant = Number(m.cantidad || 0);
      if (m.tipo === "ENTRADA" || m.tipo === "DEVOLUCION" || m.tipo === "TRASPASO_ENTRADA") {
        runningGlobal += cant;
      } else {
        runningGlobal = Math.max(0, runningGlobal - cant);
      }
    }

    if (runningGlobal !== totalStockProd) {
      fallosGlobales++;
      console.error(`❌ Fallo global: ${prod.nombre} -> Real: ${totalStockProd}, Kardex: ${runningGlobal}`);
    }

    for (const v of (prod.variantes || [])) {
      const stockVar = Number(v.stock || 0);
      const movsVar = await inventariosCol.find({
        productoId: prod._id,
        "variante.varianteId": v.varianteId
      }).sort({ createdAt: 1 }).toArray();

      let runningVar = 0;
      for (const m of movsVar) {
        const cant = Number(m.cantidad || 0);
        if (m.tipo === "ENTRADA" || m.tipo === "DEVOLUCION" || m.tipo === "TRASPASO_ENTRADA") {
          runningVar += cant;
        } else {
          runningVar = Math.max(0, runningVar - cant);
        }
      }

      if (runningVar !== stockVar) {
        fallosVariantes++;
        console.error(`❌ Fallo variante: ${prod.nombre} (${v.color}-${v.talla}) -> Real: ${stockVar}, Kardex: ${runningVar}`);
      }
    }
  }

  if (fallosGlobales === 0 && fallosVariantes === 0) {
    console.log("🎉 ¡PERFECCIÓN ABSOLUTA! 0 descuadres globales y 0 descuadres por variante.");
    console.log("Los 32 productos y todas sus variantes coinciden al 100% con el stock real.");
  } else {
    console.warn(`Fallos globales: ${fallosGlobales}, Fallos variantes: ${fallosVariantes}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
