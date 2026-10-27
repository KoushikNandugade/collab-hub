import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createServer } from "node:http";
import { createApp } from "../src/app.js";
import {
  initializeModels,
  Project,
  Application,
  Notification,
  User,
} from "../src/models/index.js";
import { attachSockets } from "../src/sockets/index.js";
import { io as connect } from "socket.io-client";
import { matchProject } from "../src/services/matching.js";
const secret = "a-strong-test-secret-with-more-than-32-characters";
const projectFields = {
  title: "Open Source Campus",
  tagline: "Build a better campus together",
  description:
    "A community driven campus platform with useful tools for students.",
  category: "Web development",
  projectType: "Open source",
  difficulty: "beginner",
  duration: "4 weeks",
  maxTeamSize: 2,
  roles: [{ title: "Frontend developer", skills: ["React"], positions: 1 }],
  collaborationMode: "remote",
  availability: "part-time",
};
test("Phases 2–4: collaboration, transactions, permissions and real-time delivery", async (t) => {
  await mongoose.connect(
    "mongodb://127.0.0.1:27017/collabhub_test_workflows?replicaSet=rs0&directConnection=true",
  );
  await mongoose.connection.dropDatabase();
  await initializeModels();
  const app = createApp({ secret });
  const server = createServer(app);
  const sockets = attachSockets(server, secret, "http://localhost:5173", app);
  server.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const openSockets = [];
  t.after(async () => {
    openSockets.forEach((s) => s.disconnect());
    await new Promise((r) => sockets.close(r));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  function client() {
    const state = { cookie: "" };
    state.req = async (url, method = "GET", body) => {
      const r = await fetch(base + "/api" + url, {
        method,
        headers: { "content-type": "application/json", cookie: state.cookie },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (r.headers.get("set-cookie"))
        state.cookie = r.headers.get("set-cookie").split(";")[0];
      return { status: r.status, data: await r.json() };
    };
    return state;
  }
  const owner = client(),
    alice = client(),
    bob = client();
  for (const [c, name] of [
    [owner, "Owner"],
    [alice, "Alice"],
    [bob, "Bob"],
  ]) {
    const r = await c.req("/auth/register", "POST", {
      name,
      email: name.toLowerCase() + "@test.example",
      password: "correct-horse-password",
    });
    assert.equal(r.status, 201);
    c.id = r.data.user._id;
  }
  let project, a1, a2, winner, loser, workspace;
  await t.test("project creation and backend search/filtering", async () => {
    const r = await owner.req("/projects", "POST", projectFields);
    assert.equal(r.status, 201);
    project = r.data.project;
    assert.ok(project.roles[0]._id);
    assert.equal(
      (
        await alice.req(
          "/projects?q=Campus&category=Web+development&skill=React",
        )
      ).data.total,
      1,
    );
    assert.equal((await alice.req("/projects?q=nonexistent")).data.total, 0);
    assert.equal(
      (await alice.req("/projects?difficulty=advanced")).data.total,
      0,
    );
  });
  await t.test(
    "project editing and workspace require authorization",
    async () => {
      assert.equal(
        (await alice.req("/projects/" + project._id, "PUT", projectFields))
          .status,
        403,
      );
      assert.equal((await alice.req("/workspace/" + project._id)).status, 403);
      const r = await owner.req("/projects/" + project._id, "PUT", {
        ...projectFields,
        roles: project.roles.map((r) => ({
          _id: r._id,
          title: r.title,
          skills: r.skills,
          positions: r.positions,
        })),
      });
      assert.equal(r.status, 200);
    },
  );
  await t.test(
    "real application submission and duplicate prevention",
    async () => {
      const fields = {
        roleId: project.roles[0]._id,
        introduction: "I enjoy building accessible interfaces.",
        motivation: "I want to make campus life better.",
        experience: "React projects",
        portfolio: "",
      };
      a1 = await alice.req(
        "/projects/" + project._id + "/applications",
        "POST",
        fields,
      );
      assert.equal(a1.status, 201);
      a1 = a1.data.application;
      a2 = (
        await bob.req(
          "/projects/" + project._id + "/applications",
          "POST",
          fields,
        )
      ).data.application;
      assert.equal(
        (
          await alice.req(
            "/projects/" + project._id + "/applications",
            "POST",
            fields,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await alice.req("/applications/" + a1._id, "PUT", {
            decision: "accepted",
          })
        ).status,
        403,
      );
      assert.equal(
        (await owner.req("/projects/" + project._id + "/applications")).data
          .total,
        2,
      );
      assert.ok(
        await Notification.exists({ user: owner.id, type: "application" }),
      );
    },
  );
  await t.test(
    "concurrent acceptance atomically enforces role and team capacity",
    async () => {
      const results = await Promise.all([
        owner.req("/applications/" + a1._id, "PUT", { decision: "accepted" }),
        owner.req("/applications/" + a2._id, "PUT", { decision: "accepted" }),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      winner = results[0].status === 200 ? alice : bob;
      loser = winner === alice ? bob : alice;
      const p = await Project.findById(project._id);
      assert.equal(p.members.length, 1);
      assert.equal(p.roles[0].filled, 1);
      assert.equal(
        await Application.countDocuments({
          project: p._id,
          status: "accepted",
        }),
        1,
      );
      assert.equal((await winner.req("/workspace/" + p._id)).status, 200);
      assert.equal((await loser.req("/workspace/" + p._id)).status, 403);
    },
  );
  await t.test(
    "tasks persist and enforce project and assignee authorization",
    async () => {
      const r = await owner.req("/projects/" + project._id + "/tasks", "POST", {
        title: "Build the homepage",
        assignee: winner.id,
        priority: "high",
      });
      assert.equal(r.status, 201);
      const task = r.data.task;
      assert.equal(
        (await loser.req("/tasks/" + task._id, "PUT", { status: "completed" }))
          .status,
        403,
      );
      assert.equal(
        (await winner.req("/tasks/" + task._id, "PUT", { status: "review" }))
          .status,
        200,
      );
      assert.equal(
        (
          await owner.req("/projects/" + project._id + "/tasks", "POST", {
            title: "Invalid member",
            assignee: loser.id,
          })
        ).status,
        400,
      );
      workspace = (await winner.req("/workspace/" + project._id)).data;
      assert.equal(workspace.tasks[0].status, "review");
      assert.equal(
        (await winner.req("/tasks/" + task._id, "DELETE")).status,
        200,
      );
    },
  );
  await t.test(
    "messages persist and only authorized members can access them",
    async () => {
      const id = workspace.conversation._id;
      assert.equal(
        (await loser.req("/conversations/" + id + "/messages")).status,
        403,
      );
      assert.equal(
        (
          await loser.req("/conversations/" + id + "/messages", "POST", {
            text: "Unauthorized",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await winner.req("/conversations/" + id + "/messages", "POST", {
            text: "Hello team!",
          })
        ).status,
        201,
      );
      assert.equal(
        (await owner.req("/conversations/" + id + "/messages")).data.items[0]
          .text,
        "Hello team!",
      );
    },
  );
  await t.test(
    "Socket.IO rejects anonymous access and delivers authenticated messages",
    async () => {
      const anonymous = connect(base, {
        transports: ["websocket"],
        reconnection: false,
      });
      openSockets.push(anonymous);
      await new Promise((resolve, reject) => {
        anonymous.on("connect_error", () => resolve());
        anonymous.on("connect", () =>
          reject(new Error("Anonymous socket connected")),
        );
        setTimeout(() => reject(new Error("Socket timeout")), 3000).unref();
      });
      const socket = connect(base, {
        transports: ["websocket"],
        extraHeaders: { Cookie: owner.cookie },
        reconnection: false,
      });
      openSockets.push(socket);
      await new Promise((resolve, reject) => {
        socket.on("connect", resolve);
        socket.on("connect_error", reject);
      });
      const received = new Promise((resolve, reject) => {
        socket.once("message:new", resolve);
        setTimeout(
          () => reject(new Error("Message was not delivered")),
          3000,
        ).unref();
      });
      await winner.req(
        "/conversations/" + workspace.conversation._id + "/messages",
        "POST",
        { text: "A real-time update" },
      );
      assert.equal((await received).text, "A real-time update");
    },
  );
  await t.test(
    "invitations grant membership and saved projects persist",
    async () => {
      const p = (
        await owner.req("/projects", "POST", {
          ...projectFields,
          title: "Invitation project",
        })
      ).data.project;
      const invitation = await owner.req(
        "/projects/" + p._id + "/invitations",
        "POST",
        { recipient: loser.id, roleId: p.roles[0]._id },
      );
      assert.equal(invitation.status, 201);
      assert.equal(
        (
          await winner.req(
            "/invitations/" + invitation.data.invitation._id,
            "PUT",
            { decision: "accepted" },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await loser.req(
            "/invitations/" + invitation.data.invitation._id,
            "PUT",
            { decision: "accepted" },
          )
        ).status,
        200,
      );
      assert.equal((await loser.req("/workspace/" + p._id)).status, 200);
      assert.equal((await alice.req("/saved/" + p._id, "POST")).status, 200);
      assert.equal((await alice.req("/saved")).data.items.length, 1);
      await alice.req("/saved/" + p._id, "DELETE");
      assert.equal((await alice.req("/saved")).data.items.length, 0);
    },
  );
  await t.test(
    "resource links and notifications are backed by MongoDB",
    async () => {
      assert.equal(
        (
          await winner.req("/projects/" + project._id + "/resources", "POST", {
            title: "Repository",
            url: "https://github.com/example/repo",
          })
        ).status,
        201,
      );
      assert.equal(
        (await winner.req("/workspace/" + project._id)).data.project.resources
          .length,
        1,
      );
      const notifications = await owner.req("/notifications");
      assert.ok(notifications.data.unread > 0);
      await owner.req("/notifications/read", "PUT");
      assert.equal((await owner.req("/notifications")).data.unread, 0);
    },
  );
  await t.test("matching follows the documented weighted rules", () => {
    const score = matchProject(
      {
        onboarded: true,
        skills: ["React"],
        interests: ["Web development"],
        availability: "part-time",
        experience: "beginner",
        collaborationMode: "remote",
      },
      projectFields,
    );
    assert.equal(score.score, 100);
    assert.equal(matchProject({ onboarded: false }, projectFields), null);
  });
});
