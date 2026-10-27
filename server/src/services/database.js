import mongoose from "mongoose";
import { initializeModels } from "../models/index.js";
let pending;
export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error("MONGODB_URI is required.");
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!pending) {
    let dbName;
    try {
      if (!new URL(uri).pathname.replaceAll("/", "")) dbName = "collabhub";
    } catch {}
    pending = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 8000,
        maxPoolSize: 5,
        maxIdleTimeMS: 30000,
        ...(dbName ? { dbName } : {}),
      })
      .then(async () => {
        await initializeModels();
        return mongoose.connection;
      })
      .finally(() => {
        pending = undefined;
      });
  }
  return pending;
}
