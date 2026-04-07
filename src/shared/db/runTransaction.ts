import mongoose, { type ClientSession } from "mongoose";
import {
  assertMongoTransactionsSupported,
  connectDB,
} from "@/libs/mongodb";

type TransactionCallback<T> = (session: ClientSession) => Promise<T>;

export async function runInTransaction<T>(
  callback: TransactionCallback<T>
): Promise<T> {
  await connectDB();
  await assertMongoTransactionsSupported();

  const session = await mongoose.startSession();
  let result: T | undefined;

  try {
    await session.withTransaction(async () => {
      result = await callback(session);
    });

    if (result === undefined) {
      throw new Error("La transaccion no devolvio resultado");
    }

    return result;
  } finally {
    await session.endSession();
  }
}
