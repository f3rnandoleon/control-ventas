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
  const archivoCol = db.collection("inventarios_archivo_historico");

  console.log("\n==================================================");
  console.log("PASO 1: Congelar precioCosto en TODAS las variantes");
  console.log("==================================================");

  const productos = await productosCol.find({}).toArray();
  let variantesCongeladas = 0;
  let productosModificados = 0;

  for (const p of productos) {
    let modificado = false;
    const costoBase = Number(p.precioCosto || 0);

    const variantesActualizadas = (p.variantes || []).map((v) => {
      if (v.precioCosto === undefined || v.precioCosto === null || Number(v.precioCosto) <= 0) {
        variantesCongeladas++;
        modificado = true;
        return {
          ...v,
          precioCosto: costoBase
        };
      }
      return v;
    });

    if (modificado) {
      await productosCol.updateOne(
        { _id: p._id },
        { $set: { variantes: variantesActualizadas } }
      );
      productosModificados++;
    }
  }

  console.log(`✅ Variantes que ahora tienen precioCosto explícito propio: ${variantesCongeladas}`);
  console.log(`✅ Productos actualizados: ${productosModificados}`);

  console.log("\n==================================================");
  console.log("PASO 2: Vincular movimientos huérfanos que tienen color y talla activa");
  console.log("==================================================");

  const allMovs = await inventariosCol.find({ "variante.varianteId": { $exists: true, $ne: null } }).toArray();
  let vinculados = 0;

  for (const m of allMovs) {
    const p = await productosCol.findOne({ _id: m.productoId });
    if (!p) continue;

    const existeId = (p.variantes || []).some((v) => v.varianteId === m.variante.varianteId);
    if (!existeId) {
      // Buscar si existe variante activa con mismo color y talla
      const match = (p.variantes || []).find(
        (v) =>
          v.color?.toLowerCase()?.trim() === m.variante?.color?.toLowerCase()?.trim() &&
          v.talla?.toLowerCase()?.trim() === m.variante?.talla?.toLowerCase()?.trim()
      );

      if (match) {
        await inventariosCol.updateOne(
          { _id: m._id },
          { $set: { "variante.varianteId": match.varianteId } }
        );
        vinculados++;
      }
    }
  }
  console.log(`✅ Movimientos huérfanos re-vinculados a su variante activa: ${vinculados}`);

  console.log("\n==================================================");
  console.log("PASO 3: Archivar registros arcaicos de abril 2026 (sin varianteId)");
  console.log("==================================================");

  const arcaicos = await inventariosCol.find({
    $or: [
      { "variante.varianteId": { $exists: false } },
      { "variante.varianteId": null },
      { "variante.varianteId": "" }
    ]
  }).toArray();

  if (arcaicos.length > 0) {
    // Guardar en colección de archivo histórico seguro
    await archivoCol.insertMany(arcaicos);
    // Eliminar de inventarios activos para no inflar el kardex
    await inventariosCol.deleteMany({
      _id: { $in: arcaicos.map((a) => a._id) }
    });
    console.log(`✅ Movimientos arcaicos archivados y removidos de inventario activo: ${arcaicos.length}`);
  } else {
    console.log("ℹ️ No hay movimientos arcaicos pendientes.");
  }

  console.log("\n==================================================");
  console.log("PASO 4: Archivar movimientos huérfanos de productos o variantes eliminadas");
  console.log("==================================================");

  const movsRestantes = await inventariosCol.find({}).toArray();
  const aArchivar = [];

  for (const m of movsRestantes) {
    const p = await productosCol.findOne({ _id: m.productoId });
    if (!p) {
      aArchivar.push(m);
      continue;
    }
    const existeEnProd = (p.variantes || []).some((v) => v.varianteId === m.variante?.varianteId);
    if (!existeEnProd) {
      aArchivar.push(m);
    }
  }

  if (aArchivar.length > 0) {
    await archivoCol.insertMany(aArchivar);
    await inventariosCol.deleteMany({
      _id: { $in: aArchivar.map((a) => a._id) }
    });
    console.log(`✅ Movimientos huérfanos de variantes eliminadas archivados: ${aArchivar.length}`);
  } else {
    console.log("ℹ️ No hay movimientos huérfanos restantes.");
  }

  console.log("\n==================================================");
  console.log("PASO 5: Verificación de Cuadre Perfecto Global y por Variante");
  console.log("==================================================");

  const productosFinal = await productosCol.find({}).toArray();
  let totalDescuadresGlobales = 0;
  let totalDescuadresVariantes = 0;

  for (const prod of productosFinal) {
    const totalStockProd = (prod.variantes || []).reduce((acc, v) => acc + Number(v.stock || 0), 0);

    // Global
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
      totalDescuadresGlobales++;
      console.error(`❌ Descuadre Global: ${prod.nombre} -> Real: ${totalStockProd}, Kardex: ${runningGlobal}`);
    }

    // Por variante
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
        totalDescuadresVariantes++;
        console.error(`❌ Descuadre Variante: ${prod.nombre} (${v.color}-${v.talla}) -> Real: ${stockVar}, Kardex: ${runningVar}`);
      }
    }
  }

  console.log(`\nResultado final:`);
  console.log(`- Descuadres Globales restantes: ${totalDescuadresGlobales}`);
  console.log(`- Descuadres por Variante restantes: ${totalDescuadresVariantes}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
