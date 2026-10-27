// Model Vercel's static frontend and /api rewrite using the real Node function.
const { createServer } = require("node:http");
const path = require("node:path");
const express = require("express");
const handler = require("../api/index.js");
const port = Number(process.env.PORT || 3004);
const app = express();
app.use((req, res, next) => {
  if (req.path === "/api" || req.path.startsWith("/api/"))
    return handler(req, res);
  next();
});
const dist = path.resolve(__dirname, "../client/dist");
app.use(express.static(dist));
app.get("/{*path}", (req, res) => res.sendFile(path.join(dist, "index.html")));
const server = createServer(app);
server.listen(port, "127.0.0.1", () =>
  console.log("Vercel function test server listening on port", port),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    server.close(async () => {
      const mongoose = (await import("mongoose")).default;
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
