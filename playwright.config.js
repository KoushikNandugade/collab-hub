import { defineConfig } from "@playwright/test";
// CI lets Playwright own the server lifecycle; local runs can still use an existing app.
const serverMode = process.env.E2E_START_SERVER;
if (serverMode && !["dev", "vercel"].includes(serverMode)) {
  throw new Error("E2E_START_SERVER must be dev or vercel.");
}
const baseURL =
  process.env.E2E_BASE_URL ||
  (serverMode === "vercel" ? "http://localhost:3004" : "http://localhost:5173");

export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  fullyParallel: false,
  use: {
    baseURL,
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: serverMode
    ? {
        command: serverMode === "vercel" ? "npm run dev:vercel" : "npm run dev",
        url: new URL("/api/health", baseURL).href,
        timeout: 60000,
        reuseExistingServer: false,
        env: {
          NODE_ENV: "development",
          PORT:
            serverMode === "vercel" ? new URL(baseURL).port || "3004" : "3001",
          CLIENT_ORIGIN: new URL(baseURL).origin,
        },
      }
    : undefined,
  reporter: "list",
});
