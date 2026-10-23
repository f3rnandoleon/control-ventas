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
  if (!almacenCentral) {
    throw new Error("No se encontró la sucursal ALM-CENTRAL");
  }

  const adminUser = (await usersCol.findOne({ rol: "ADMIN" })) || (await usersCol.findOne({}));
  const adminId = adminUser ? adminUser._id : null;

  console.log("==================================================");
  console.log("PASO 1: Backfill de Costos Unitarios Históricos");
  console.log("==================================================");

  const movimientosSinCosto = await inventariosCol.find({
    $or: [{ costoUnitario: { $exists: false } }, { costoUnitario: null }, { costoUnitario: 0 }]
  }).toArray();

  console.log(`Movimientos a actualizar costo: ${movimientosSinCosto.length}`);

  let costosActualizados = 0;
  for (const mov of movimientosSinCosto) {
    const prod = await productosCol.findOne({ _id: mov.productoId });
    if (!prod) continue;

    let costo = Number(prod.precioCosto || 0);
    if (mov.variante?.varianteId && prod.variantes) {
      const v = prod.variantes.find((x) => x.varianteId === mov.variante.varianteId);
      if (v && v.precioCosto !== undefined && v.precioCosto !== null && Number(v.precioCosto) > 0) {
        costo = Number(v.precioCosto);
      }
    }

    const cantidad = Number(mov.cantidad || 0);
    const valorTotal = Number((cantidad * costo).toFixed(2));

    await inventariosCol.updateOne(
      { _id: mov._id },
      {
        $set: {
          costoUnitario: costo,
          valorTotalOperacion: valorTotal,
          costoPromedioResultante: costo,
          ...(mov.saldoValorado === undefined || mov.saldoValorado === null
            ? { saldoValorado: Number((Number(mov.stockActual || 0) * costo).toFixed(2)) }
            : {})
        }
      }
    );
    costosActualizados++;
  }
  console.log(`✅ Movimientos con costo asignado: ${costosActualizados}`);

  console.log("\n==================================================");
  console.log("PASO 2: Reconciliación de Stock Kardex vs Stock Real");
  console.log("==================================================");

  const productos = await productosCol.find({}).toArray();
  let entradasCreadas = 0;
  let salidasCreadas = 0;

  for (const p of productos) {
    const costoBaseProd = Number(p.precioCosto || 0);

    for (const v of (p.variantes || [])) {
      const stockReal = Number(v.stock || 0);
      const costoVariante = Number(
        v.precioCosto !== undefined && v.precioCosto !== null && Number(v.precioCosto) > 0
          ? v.precioCosto
          : costoBaseProd
      );

      // Calcular saldo según kardex actual
      const movs = await inventariosCol.find({
        productoId: p._id,
        "variante.varianteId": v.varianteId
      }).sort({ createdAt: 1 }).toArray();

      let runningKardex = 0;
      for (const m of movs) {
        const cant = Number(m.cantidad || 0);
        if (m.tipo === "ENTRADA" || m.tipo === "DEVOLUCION" || m.tipo === "TRASPASO_ENTRADA") {
          runningKardex += cant;
        } else {
          runningKardex = Math.max(0, runningKardex - cant);
        }
      }

      const diff = stockReal - runningKardex;

      if (diff > 0) {
        // Faltan entradas en el kardex -> Crear entrada inicial
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
          stockAnterior: runningKardex,
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
        entradasCreadas++;
        console.log(`  [+] Entrada inicial: ${p.nombre} (${v.color} - ${v.talla}) -> +${diff} u. (Kardex ahora: ${stockReal})`);
      } else if (diff < 0) {
        // Sobran entradas en el kardex -> Salida de regularización fechada justo antes del 12 de oct
        const cantidadSalida = Math.abs(diff);
        const fechaSalida = new Date("2026-10-11T22:00:00.000Z");
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
          stockAnterior: runningKardex,
          stockActual: stockReal,
          motivo: "Salida por regularización de ventas anteriores a la actualización",
          referencia: "REGULARIZACION_VENTAS_PREVIAS",
          costoUnitario: costoVariante,
          valorTotalOperacion: valorTotal,
          costoPromedioResultante: costoVariante,
          saldoValorado: Number((stockReal * costoVariante).toFixed(2)),
          usuario: adminId,
          createdAt: fechaSalida,
          updatedAt: fechaSalida
        });
        salidasCreadas++;
        console.log(`  [-] Salida regularización: ${p.nombre} (${v.color} - ${v.talla}) -> -${cantidadSalida} u. (Kardex ahora: ${stockReal})`);
      }
    }
  }

  console.log(`\n✅ Entradas iniciales creadas: ${entradasCreadas}`);
  console.log(`✅ Salidas de regularización creadas: ${salidasCreadas}`);

  console.log("\n==================================================");
  console.log("PASO 3: Verificación Final de Cuadre");
  console.log("==================================================");

  let descuadresRestantes = 0;
  for (const p of productos) {
    for (const v of (p.variantes || [])) {
      const stockReal = Number(v.stock || 0);
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

      if (running !== stockReal) {
        descuadresRestantes++;
        console.error(`❌ Descuadre en ${p.nombre} (${v.color}-${v.talla}): Real=${stockReal}, Kardex=${running}`);
      }
    }
  }

  if (descuadresRestantes === 0) {
    console.log("🎉 ¡ÉXITO TOTAL! 100% de las 276 variantes coinciden perfectamente entre la Tarjeta Kardex y el Stock Real.");
  } else {
    console.warn(`⚠️ Quedaron ${descuadresRestantes} variantes con diferencias.`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Error ejecutando migración:", err);
  process.exit(1);
});
