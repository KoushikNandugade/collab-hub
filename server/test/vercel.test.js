import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import mongoose from "mongoose";
import handler from "../../api/index.js";
import { createApp } from "../src/app.js";
import { authenticateToken } from "../src/middleware/auth.js";

const secret = "vercel-test-only-signing-key-with-more-than-32-characters";
test("Vercel entry point reuses connections, protects sessions, and persists a project", async (t) => {
  process.env.MONGODB_URI =
    "mongodb://127.0.0.1:27017/collabhub_test_vercel?replicaSet=rs0&directConnection=true";
  process.env.NODE_ENV = "production";
  delete process.env.JWT_SECRET;
  const server = createServer(handler).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  let cookie = "";
  const request = async (path, method = "GET", body) => {
    const response = await fetch(base + "/api" + path, {
      method,
      headers: { "content-type": "application/json", cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.headers.get("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    return {
      status: response.status,
      headers: response.headers,
      data: await response.json(),
    };
  };
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState === 1)
      await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  await t.test(
    "missing deployment secrets produce a safe 503 response",
    async () => {
      const response = await request("/health");
      assert.equal(response.status, 503);
      assert.doesNotMatch(JSON.stringify(response.data), /mongodb:\/\//);
    },
  );
  process.env.JWT_SECRET = secret;
  await t.test(
    "concurrent warm requests reuse the MongoDB connection",
    async () => {
      const results = await Promise.all([
        request("/health"),
        request("/projects"),
        request("/people"),
      ]);
      assert.ok(results.every((r) => r.status === 200));
      assert.equal(mongoose.connection.name, "collabhub_test_vercel");
    },
  );
  let user;
  await t.test(
    "HTTP-only secure cookies authenticate the same-origin serverless API",
    async () => {
      assert.equal((await request("/auth/me")).status, 401);
      const response = await request("/auth/register", "POST", {
        name: "Vercel Builder",
        email: `vercel-${Date.now()}@example.com`,
        password: "strong-vercel-test-password",
      });
      assert.equal(response.status, 201);
      user = response.data.user;
      assert.match(response.headers.get("set-cookie"), /HttpOnly/);
      assert.match(response.headers.get("set-cookie"), /Secure/);
      assert.equal((await request("/auth/me")).data.user._id, user._id);
      const access = (await request("/realtime")).data;
      assert.equal(access.mode, "external");
      assert.equal(access.url, "https://collab-hub-d51v.onrender.com");
      assert.equal(typeof access.token, "string");
      await assert.rejects(() => authenticateToken(access.token, secret));
    },
  );
  await t.test(
    "projects persist through separate function requests",
    async () => {
      const response = await request("/projects", "POST", {
        title: "Serverless collaboration",
        tagline: "A real project persisted through the Vercel entry point.",
        description:
          "A meaningful project that verifies serverless authentication and actual MongoDB persistence.",
        category: "Web development",
        projectType: "Side project",
        difficulty: "beginner",
        duration: "2 weeks",
        maxTeamSize: 3,
        roles: [{ title: "Developer", skills: ["React"], positions: 2 }],
        collaborationMode: "remote",
        availability: "part-time",
      });
      assert.equal(response.status, 201);
      const project = response.data.project;
      assert.equal(
        (await request("/workspace/" + project._id)).data.project.title,
        "Serverless collaboration",
      );
      assert.equal((await request("/projects?q=Serverless")).data.total, 1);
    },
  );
  await t.test(
    "external real-time access is short-lived and cannot authenticate REST requests",
    async () => {
      const realtimeApp = createApp({
        secret,
        realtimeUrl: "https://realtime.example.com",
      });
      const realtimeServer = createServer(realtimeApp).listen(0, "127.0.0.1");
      await new Promise((resolve) => realtimeServer.once("listening", resolve));
      try {
        const response = await fetch(
          "http://127.0.0.1:" + realtimeServer.address().port + "/api/realtime",
          { headers: { cookie } },
        );
        const data = await response.json();
        assert.equal(response.status, 200);
        assert.equal(data.mode, "external");
        assert.equal(data.url, "https://realtime.example.com");
        const payload = JSON.parse(
          Buffer.from(data.token.split(".")[1], "base64url").toString(),
        );
        assert.equal(payload.aud, "collabhub-realtime");
        assert.ok(payload.exp - payload.iat <= 300);
        await assert.rejects(
          authenticateToken(data.token, secret),
          (error) => error.status === 401,
        );
        assert.equal(
          String(
            (await authenticateToken(data.token, secret, { realtime: true }))
              ._id,
          ),
          user._id,
        );
      } finally {
        await new Promise((resolve) => realtimeServer.close(resolve));
      }
    },
  );
});
