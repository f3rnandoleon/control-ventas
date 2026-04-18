import mongoose from "mongoose";
import { AppError } from "@/shared/errors/AppError";

const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  throw new Error("⚠️ La variable MONGODB_URL no está definida en .env.local");
}

const mongoUri: string = MONGODB_URL;


type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  runtimeInfo: MongoRuntimeInfo | null;
};

export type MongoTopology = "REPLICA_SET" | "SHARDED" | "STANDALONE" | "UNKNOWN";

export type MongoRuntimeInfo = {
  connected: boolean;
  transactionsSupported: boolean;
  topology: MongoTopology;
  dbName: string | null;
  serverStatus: string;
};

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? {
  conn: null,
  promise: null,
  runtimeInfo: null,
};

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(mongoUri)
      .then((m) => m)
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  global.mongoose = cached;

  return cached.conn;
}

function mapMongoTopology(hello: Record<string, unknown>): MongoTopology {
  if (hello.msg === "isdbgrid") {
    return "SHARDED";
  }

  if (typeof hello.setName === "string" && hello.setName.length > 0) {
    return "REPLICA_SET";
  }

  if (hello.isWritablePrimary === true || hello.ismaster === true) {
    return "STANDALONE";
  }

  return "UNKNOWN";
}

export async function getMongoRuntimeInfo(options?: { refresh?: boolean }) {
  await connectDB();

  if (cached.runtimeInfo && !options?.refresh) {
    return cached.runtimeInfo;
  }

  const admin = mongoose.connection.db?.admin();

  if (!admin) {
    cached.runtimeInfo = {
      connected: false,
      transactionsSupported: false,
      topology: "UNKNOWN",
      dbName: null,
      serverStatus: "disconnected",
    };

    return cached.runtimeInfo;
  }

  const hello = await admin.command({ hello: 1 });
  const topology = mapMongoTopology(hello as Record<string, unknown>);
  const transactionsSupported =
    topology === "REPLICA_SET" || topology === "SHARDED";

  cached.runtimeInfo = {
    connected: mongoose.connection.readyState === 1,
    transactionsSupported,
    topology,
    dbName: mongoose.connection.name || null,
    serverStatus:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  };

  return cached.runtimeInfo;
}

export async function assertMongoTransactionsSupported() {
  const runtimeInfo = await getMongoRuntimeInfo();

  if (runtimeInfo.transactionsSupported) {
    return runtimeInfo;
  }

  throw new AppError(
    "La base de datos actual no soporta transacciones MongoDB. Usa replica set o cluster sharded antes de habilitar operaciones criticas.",
    503,
    "MONGO_TRANSACTIONS_UNAVAILABLE"
  );
}
