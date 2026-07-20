/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const mongoose = require("mongoose");

const projectRoot = path.join(__dirname, "..");
const sourcePath = path.join(projectRoot, "data", "delivery-options.json");
const envPath = path.join(projectRoot, ".env.local");
const force = process.argv.includes("--force");

// El driver de MongoDB usa consultas SRV. Algunos DNS de Windows o del ISP las
// rechazan aunque los resolvers publicos funcionen correctamente.
const dnsServers = (process.env.MONGODB_DNS_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);
dns.setServers(dnsServers);

function getMongoUrl() {
  if (process.env.MONGODB_URL) return process.env.MONGODB_URL;
  if (!fs.existsSync(envPath)) {
    throw new Error("No se encontro .env.local ni la variable MONGODB_URL");
  }

  const match = fs.readFileSync(envPath, "utf8").match(/^MONGODB_URL=(.*)$/m);
  if (!match?.[1]?.trim()) {
    throw new Error("MONGODB_URL no esta definida en .env.local");
  }

  return match[1].trim().replace(/^['\"]|['\"]$/g, "");
}

function assertUnique(items, field, section) {
  const values = items.map((item) => String(item[field] || "").trim().toLowerCase());
  if (values.some((value) => !value) || new Set(values).size !== values.length) {
    throw new Error(`${section} contiene valores vacios o duplicados en ${field}`);
  }
}

function validate(data) {
  if (!data || typeof data !== "object") throw new Error("El JSON no contiene un objeto valido");
  for (const section of ["pickupPoints", "pickupSchedules", "shippingCompanies"]) {
    if (!Array.isArray(data[section])) throw new Error(`Falta el arreglo ${section}`);
  }

  assertUnique(data.pickupPoints, "id", "pickupPoints");
  assertUnique(data.pickupSchedules, "id", "pickupSchedules");
  assertUnique(data.shippingCompanies, "id", "shippingCompanies");

  for (const company of data.shippingCompanies) {
    if (!Array.isArray(company.departments)) {
      throw new Error(`La empresa ${company.name || company.id} no tiene departments valido`);
    }
    assertUnique(company.departments, "name", `departments de ${company.name || company.id}`);
    for (const department of company.departments) {
      if (!Array.isArray(department.branches)) {
        throw new Error(`El departamento ${department.name} no tiene branches valido`);
      }
      const branches = department.branches.map((name) => ({ name }));
      assertUnique(branches, "name", `branches de ${department.name}`);
    }
  }
}

function summarize(data) {
  const departments = data.shippingCompanies.reduce(
    (total, company) => total + company.departments.length,
    0
  );
  const branches = data.shippingCompanies.reduce(
    (total, company) =>
      total + company.departments.reduce((subtotal, department) => subtotal + department.branches.length, 0),
    0
  );
  return `${data.pickupPoints.length} puntos, ${data.pickupSchedules.length} horarios, ${data.shippingCompanies.length} empresas, ${departments} departamentos y ${branches} sucursales`;
}

async function migrate() {
  if (!fs.existsSync(sourcePath)) throw new Error(`No se encontro ${sourcePath}`);
  const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  validate(data);

  await mongoose.connect(getMongoUrl());
  const collection = mongoose.connection.collection("deliveryoptions");
  const existing = await collection.findOne({ key: "default" });

  if (existing && !force) {
    console.log("La configuracion ya existe en MongoDB. No se realizaron cambios.");
    console.log("Usa --force solamente si deseas reemplazarla con el contenido del JSON.");
    return;
  }

  const now = new Date();
  await collection.updateOne(
    { key: "default" },
    {
      $set: {
        pickupPoints: data.pickupPoints,
        pickupSchedules: data.pickupSchedules,
        shippingCompanies: data.shippingCompanies,
        updatedAt: now,
      },
      $setOnInsert: { key: "default", createdAt: now },
    },
    { upsert: true }
  );
  await collection.createIndex({ key: 1 }, { unique: true });
  console.log(`Migracion completada: ${summarize(data)}.`);
}

migrate()
  .catch((error) => {
    console.error("Error al migrar las opciones de entrega:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
