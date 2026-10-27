// Vercel Node Function: reuse the database connection and Express app on warm requests.
let application;
let lastStartupLog = 0;
module.exports = async function handler(req, res) {
  try {
    const { connectDatabase } =
      await import("../server/src/services/database.js");
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
      throw new Error("JWT_SECRET is required.");
    await connectDatabase();
    if (!application) {
      application = (async () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32)
          throw new Error("JWT_SECRET is required.");
        const { createApp } = await import("../server/src/app.js");
        return createApp({
          secret,
          serveClient: false,
          production: process.env.NODE_ENV === "production",
          origin:
            process.env.CLIENT_ORIGIN ||
            `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL}`,
          realtimeUrl: process.env.REALTIME_URL || "",
        });
      })().catch((error) => {
        application = undefined;
        throw error;
      });
    }
    const app = await application;
    return app(req, res);
  } catch (error) {
    if (Date.now() - lastStartupLog >= 60000) {
      lastStartupLog = Date.now();
      const { startupDiagnostic } =
        await import("../server/src/utils/startup-diagnostic.js");
      console.error(JSON.stringify(startupDiagnostic(error)));
    }
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify({
        error:
          "The API is unavailable. Check database access and server environment settings.",
      }),
    );
  }
};
