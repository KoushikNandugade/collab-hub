import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { initializeModels, User } from "../src/models/index.js";
test("Phase 1: MongoDB authentication, onboarding, profiles and dashboard", async (t) => {
  await mongoose.connect(
    "mongodb://127.0.0.1:27017/collabhub_test_phase1?replicaSet=rs0&directConnection=true",
  );
  await mongoose.connection.dropDatabase();
  await initializeModels();
  const server = createApp({
    secret: "test-secret-with-more-than-thirty-two-characters",
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const base = "http://127.0.0.1:" + server.address().port;
  let cookie = "";
  async function req(url, method = "GET", body) {
    const r = await fetch(base + "/api" + url, {
      method,
      headers: { "content-type": "application/json", cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.headers.get("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return { status: r.status, data: await r.json() };
  }
  assert.equal((await req("/auth/me")).status, 401);
  const registered = await req("/auth/register", "POST", {
    name: "Phase One",
    email: "phase1@example.com",
    password: "correct-password",
  });
  assert.equal(registered.status, 201);
  assert.equal(registered.data.user.password, undefined);
  assert.ok(await User.exists({ email: "phase1@example.com" }));
  assert.equal((await req("/auth/me")).status, 200);
  assert.equal(
    (
      await req("/profile", "PUT", {
        name: "Phase One",
        college: "Example Institute",
        role: "Developer",
        skills: ["React"],
        interests: ["Web development"],
        experience: "beginner",
        availability: "part-time",
        collaborationMode: "remote",
      })
    ).data.user.onboarded,
    true,
  );
  assert.deepEqual((await req("/dashboard")).data.projects, []);
  const people = (await req("/people")).data.items;
  assert.equal(people.length, 1);
  assert.equal(people[0].email, undefined);
  await req("/auth/logout", "POST");
  assert.equal((await req("/auth/me")).status, 401);
  assert.equal(
    (
      await req("/auth/login", "POST", {
        email: "phase1@example.com",
        password: "wrong-password",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await req("/auth/login", "POST", {
        email: "phase1@example.com",
        password: "correct-password",
      })
    ).status,
    200,
  );
});
