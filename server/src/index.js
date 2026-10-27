import mongoose from "mongoose";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { connectDatabase } from "./services/database.js";
import { startupDiagnostic } from "./utils/startup-diagnostic.js";
const uri = process.env.MONGODB_URI;
if (!uri || !process.env.JWT_SECRET) {
  console.error("Set MONGODB_URI and JWT_SECRET. See .env.example.");
  process.exit(1);
}
try {
  await connectDatabase(uri);
  const app = createApp({
    secret: process.env.JWT_SECRET,
    production: process.env.NODE_ENV === "production",
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  });
  const server = createServer(app);
  if (process.env.ENABLE_SOCKETS !== "false") {
    const { attachSockets } = await import("./sockets/index.js");
    attachSockets(
      server,
      process.env.JWT_SECRET,
      process.env.CLIENT_ORIGIN || "http://localhost:5173",
      app,
    );
  }
  server.listen(process.env.PORT || 3001, "0.0.0.0", () =>
    console.log("CollabHub listening on port", process.env.PORT || 3001),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => {
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    });
} catch (error) {
  console.error(JSON.stringify(startupDiagnostic(error)));
  process.exit(1);
}
