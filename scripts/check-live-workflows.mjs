import { randomBytes } from "node:crypto";
import { appendFile, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { io } from "socket.io-client";

if (process.env.LIVE_ACCEPTANCE_ALLOW_WRITES !== "1") {
  throw new Error(
    "Set LIVE_ACCEPTANCE_ALLOW_WRITES=1 to create labeled verification accounts and archive their test project.",
  );
}

function origin(value) {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" && !(local && url.protocol === "http:"))
  ) {
    throw new Error("Use an HTTPS origin without credentials.");
  }
  return url.origin;
}
const app = origin(process.env.APP_URL || "https://collab-hub-phi.vercel.app");
const realtime = origin(
  process.env.REALTIME_URL || "https://collab-hub-d51v.onrender.com",
);
const nonce = randomBytes(8).toString("hex");
const results = [];
const sockets = [];
let project;
let conversation;
let task;
let accountsCreated = 0;
let projectArchived = false;

function requireCondition(condition, safeDetail) {
  if (!condition) throw Object.assign(new Error(safeDetail), { safeDetail });
}
function account(label) {
  return {
    name: `Deployment Check ${label}`,
    email: `verification-${label.toLowerCase()}-${nonce}@demo.invalid`,
    password: randomBytes(32).toString("base64url"),
    cookie: "",
  };
}
const owner = account("Owner");
const member = account("Member");

async function request(client, path, method = "GET", body, expected = 200) {
  const response = await fetch(`${app}/api${path}`, {
    method,
    headers: {
      Origin: app,
      "Content-Type": "application/json",
      ...(client?.cookie ? { Cookie: client.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  requireCondition(
    response.status === expected,
    `Expected HTTP ${expected}; received ${response.status}.`,
  );
  const session = response.headers
    .getSetCookie()
    .find((value) => value.startsWith("collabhub_session="));
  if (session && client) {
    client.cookie = session.split(";")[0];
    if (client.cookie !== "collabhub_session=") {
      requireCondition(
        /HttpOnly/i.test(session),
        "Session cookie must be HTTP-only.",
      );
      if (app.startsWith("https:"))
        requireCondition(
          /;\s*Secure/i.test(session),
          "Hosted session cookie must be Secure.",
        );
    }
  }
  let data;
  try {
    data = await response.json();
  } catch {
    requireCondition(false, "Expected a JSON API response.");
  }
  return data;
}
async function step(name, operation) {
  try {
    await operation();
    results.push({ name, passed: true });
  } catch (error) {
    // Never serialize Playwright calls, request bodies, passwords, cookies, or tokens.
    results.push({
      name,
      passed: false,
      detail: error.safeDetail || "Workflow did not complete successfully.",
    });
    throw error;
  }
}
async function socketFor(client) {
  // A connected deployment may still be rolling out while this workflow starts.
  // Recheck the required live configuration before creating socket connections.
  let access;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      access = await request(client, "/realtime");
      if (
        access.mode === "external" &&
        origin(access.url) === realtime &&
        typeof access.token === "string"
      )
        break;
    } catch {}
    if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  requireCondition(
    Boolean(access),
    "The real-time access endpoint was unavailable.",
  );
  requireCondition(
    access.mode === "external",
    `Expected external socket mode; received ${["polling", "same-origin"].includes(access.mode) ? access.mode : "an unsupported mode"}.`,
  );
  requireCondition(
    origin(access.url) === realtime && typeof access.token === "string",
    "The socket URL must match the configured Render service and include scoped access.",
  );
  const socket = io(access.url, {
    autoConnect: false,
    auth: { token: access.token },
    transports: ["websocket"],
    extraHeaders: { Origin: app },
    reconnection: false,
    timeout: 20000,
  });
  sockets.push(socket);
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", () =>
      reject(
        Object.assign(new Error("Socket authentication failed."), {
          safeDetail:
            "Socket authentication or connection failed; check shared signing values and the service URL.",
        }),
      ),
    );
    socket.connect();
  });
  return socket;
}
async function emit(socket, event, payload) {
  return new Promise((resolve, reject) =>
    socket.timeout(15000).emit(event, payload, (error, response) => {
      if (error)
        reject(
          Object.assign(new Error("Socket operation timed out."), {
            safeDetail: "Socket operation timed out.",
          }),
        );
      else resolve(response);
    }),
  );
}
function received(socket, event, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(
        Object.assign(new Error("Live delivery timed out."), {
          safeDetail: "Live delivery timed out.",
        }),
      );
    }, 15000);
    function listener(value) {
      if (!predicate(value)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(value);
    }
    socket.on(event, listener);
  });
}

try {
  await step(
    "Register, protect sessions, and complete onboarding",
    async () => {
      for (const client of [owner, member]) {
        const data = await request(
          client,
          "/auth/register",
          "POST",
          { name: client.name, email: client.email, password: client.password },
          201,
        );
        client.id = data.user._id;
        accountsCreated++;
        await request(client, "/profile", "PUT", {
          name: client.name,
          role: "Developer",
          college: "Automated deployment verification",
          bio: "Automated deployment verification account; not a real collaborator.",
          skills: ["React"],
          interests: ["Web development"],
          experience: "beginner",
          availability: "part-time",
          collaborationMode: "remote",
        });
        requireCondition(
          (await request(client, "/auth/me")).user._id === client.id,
          "The session did not authenticate the created account.",
        );
      }
    },
  );
  await step("Publish, discover, save, and protect a project", async () => {
    await request(owner, "/projects", "POST", { title: "" }, 400);
    project = (
      await request(
        owner,
        "/projects",
        "POST",
        {
          title: `Deployment verification ${nonce}`,
          tagline: "Automated acceptance check; this project will be archived.",
          description:
            "A clearly labeled automated acceptance fixture for recruitment, persistence, and messaging. This is not a real recruiting project.",
          category: "Web development",
          projectType: "Side project",
          difficulty: "beginner",
          duration: "Verification only",
          maxTeamSize: 2,
          roles: [
            {
              title: "Verification collaborator",
              skills: ["React"],
              positions: 1,
            },
          ],
          deadline: new Date(Date.now() + 10 * 60000).toISOString(),
          collaborationMode: "remote",
          availability: "part-time",
        },
        201,
      )
    ).project;
    const found = await request(
      null,
      `/projects?q=${encodeURIComponent(project.title)}`,
    );
    requireCondition(
      found.items.some((item) => item._id === project._id),
      "Published project was not discoverable.",
    );
    await request(member, `/workspace/${project._id}`, "GET", undefined, 403);
    await request(null, `/workspace/${project._id}`, "GET", undefined, 401);
    await request(member, `/saved/${project._id}`, "POST", {});
    requireCondition(
      (await request(member, "/saved")).items.some(
        (item) => item._id === project._id,
      ),
      "Saved project was not retained.",
    );
  });
  await step(
    "Apply, reject duplicates, accept membership, and enforce capacity",
    async () => {
      const application = {
        roleId: project.roles[0]._id,
        introduction: "Automated verification of the deployment workflow.",
        motivation:
          "Verify recruitment, permissions, and persistence with isolated test accounts.",
      };
      const submitted = await request(
        member,
        `/projects/${project._id}/applications`,
        "POST",
        application,
        201,
      );
      await request(
        member,
        `/projects/${project._id}/applications`,
        "POST",
        application,
        409,
      );
      await request(
        owner,
        `/applications/${submitted.application._id}`,
        "PUT",
        { decision: "accepted" },
      );
      const workspace = await request(member, `/workspace/${project._id}`);
      requireCondition(
        workspace.project.members.length === 1 &&
          workspace.project.roles[0].filled === 1,
        "Membership or role capacity did not update.",
      );
    },
  );
  await step(
    "Persist assigned tasks, resources, and notifications",
    async () => {
      task = (
        await request(
          owner,
          `/projects/${project._id}/tasks`,
          "POST",
          { title: "Verify deployed persistence", assignee: member.id },
          201,
        )
      ).task;
      await request(member, `/tasks/${task._id}`, "PUT", { status: "review" });
      await request(
        owner,
        `/projects/${project._id}/resources`,
        "POST",
        {
          title: "Verification repository",
          url: "https://github.com/KoushikNandugade/collab-hub",
        },
        201,
      );
      const workspace = await request(member, `/workspace/${project._id}`);
      requireCondition(
        workspace.tasks.some(
          (item) => item._id === task._id && item.status === "review",
        ),
        "Task changes were not persisted.",
      );
      requireCondition(
        workspace.project.resources.some(
          (item) => item.title === "Verification repository",
        ),
        "Resource was not persisted.",
      );
      requireCondition(
        (await request(member, "/notifications")).items.length > 0,
        "Expected notifications for the verified account.",
      );
      conversation = (
        await request(member, "/conversations", "POST", { recipient: owner.id })
      ).conversation;
    },
  );
  await step(
    "Authenticate across hosts and deliver live messages and typing",
    async () => {
      const sender = await socketFor(member);
      const recipient = await socketFor(owner);
      for (const socket of [sender, recipient])
        requireCondition(
          (
            await emit(socket, "conversation:join", {
              conversationId: conversation._id,
            })
          ).ok,
          "Conversation join was rejected.",
        );
      const text = `Live transport verification ${nonce}`;
      const [, ack] = await Promise.all([
        received(
          recipient,
          "message:new",
          (message) =>
            message.text === text && message.conversation === conversation._id,
        ),
        emit(sender, "message:send", {
          conversationId: conversation._id,
          text,
        }),
      ]);
      requireCondition(
        Boolean(ack.message),
        "Live message was not acknowledged.",
      );
      requireCondition(
        (
          await request(owner, `/conversations/${conversation._id}/messages`)
        ).items.some((message) => message.text === text),
        "Live message was not persisted.",
      );
      const typing = received(
        recipient,
        "typing",
        (event) => event.conversationId === conversation._id && event.typing,
      );
      sender.emit("typing", { conversationId: conversation._id, typing: true });
      await typing;
      await request(member, "/auth/logout", "POST", {});
      await request(member, "/auth/me", "GET", undefined, 401);
      const denied = await emit(sender, "message:send", {
        conversationId: conversation._id,
        text: "Revoked session must not send this.",
      });
      requireCondition(
        typeof denied.error === "string",
        "Logged-out socket retained write access.",
      );
      await request(member, "/auth/login", "POST", {
        email: member.email,
        password: member.password,
      });
    },
  );
  await step(
    "Use the deployed browser UI for login, persistence, mobile discovery, and live chat",
    async () => {
      const browser = await chromium.launch({
        headless: true,
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
          : {}),
      });
      let browserStage = "login";
      try {
        const contexts = await Promise.all([
          browser.newContext(),
          browser.newContext(),
        ]);
        const pages = [];
        for (let index = 0; index < contexts.length; index++) {
          const page = await contexts[index].newPage();
          const client = [owner, member][index];
          await page.goto(`${app}/login`, { waitUntil: "domcontentloaded" });
          await page.getByLabel("Email address").fill(client.email);
          await page
            .getByLabel("Password", { exact: true })
            .fill(client.password);
          await page
            .getByRole("button", { name: "Log in", exact: true })
            .click();
          await expect(
            page
              .getByRole("link", { name: "Create project", exact: true })
              .first(),
          ).toBeVisible({ timeout: 15000 });
          pages.push(page);
        }
        const [ownerPage, memberPage] = pages;
        browserStage = "workspace persistence";
        await ownerPage.goto(`${app}/app/workspace/${project._id}?tab=tasks`);
        await expect(
          ownerPage.getByLabel(`Status of ${task.title}`),
        ).toHaveValue("review");
        await ownerPage.reload();
        await expect(
          ownerPage.getByLabel(`Status of ${task.title}`),
        ).toHaveValue("review");
        browserStage = "mobile discovery";
        await ownerPage.setViewportSize({ width: 390, height: 844 });
        await ownerPage.goto(`${app}/explore`);
        await ownerPage
          .getByRole("textbox", { name: "Search projects" })
          .fill(project.title);
        await expect(
          ownerPage.getByRole("heading", { name: project.title, exact: true }),
        ).toBeVisible();
        requireCondition(
          await ownerPage.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          "Mobile discovery has horizontal overflow.",
        );
        browserStage = "live browser chat";
        await ownerPage.setViewportSize({ width: 1280, height: 900 });
        for (const [index, page] of pages.entries()) {
          browserStage =
            index === 0 ? "owner chat connection" : "member chat connection";
          await page.goto(
            `${app}/app/messages?conversation=${conversation._id}`,
          );
          await expect(
            page.getByText("Live conversation", { exact: true }),
          ).toBeVisible({ timeout: 20000 });
        }
        browserStage = "live browser message delivery";
        const message = `Browser delivery verification ${nonce}`;
        await memberPage.getByLabel("Message", { exact: true }).fill(message);
        await memberPage
          .getByRole("button", { name: "Send message", exact: true })
          .click();
        await expect(
          ownerPage
            .locator(".message-history")
            .getByText(message, { exact: true }),
        ).toBeVisible({ timeout: 15000 });
        browserStage = "browser message persistence after reload";
        await ownerPage.reload();
        await expect(
          ownerPage
            .locator(".message-history")
            .getByText(message, { exact: true }),
        ).toBeVisible({ timeout: 15000 });
      } catch (error) {
        if (!error.safeDetail)
          error.safeDetail = `Browser verification failed during ${browserStage}.`;
        throw error;
      } finally {
        await browser.close();
      }
    },
  );
} catch {
  // The failing step records a fixed, credential-safe diagnostic above.
} finally {
  sockets.forEach((socket) => socket.disconnect());
  if (project && owner.cookie) {
    for (let attempt = 0; attempt < 3 && !projectArchived; attempt++) {
      try {
        await request(owner, `/projects/${project._id}`, "DELETE");
        projectArchived = true;
      } catch {}
    }
    results.push({
      name: "Archive the verification project",
      passed: projectArchived,
    });
  }
  for (const client of [owner, member]) {
    if (!client.cookie) continue;
    try {
      if (project) await request(client, `/saved/${project._id}`, "DELETE");
    } catch {}
    try {
      await request(client, "/auth/logout", "POST", {});
    } catch {}
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  application: app,
  realtime,
  passed: results.length === 7 && results.every((result) => result.passed),
  accountsCreated,
  projectArchived,
  note: "Labeled test accounts remain; random credentials were never logged or saved. The app has no account deletion endpoint.",
  checks: results,
};
console.log(JSON.stringify(report, null, 2));
if (process.env.LIVE_ACCEPTANCE_REPORT_PATH)
  await writeFile(
    process.env.LIVE_ACCEPTANCE_REPORT_PATH,
    JSON.stringify(report, null, 2) + "\n",
  );
if (process.env.GITHUB_STEP_SUMMARY)
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    "## Live workflow verification\n\n" +
      results
        .map(
          (result) =>
            `- ${result.passed ? "Passed" : "Failed"}: ${result.name}`,
        )
        .join("\n") +
      `\n\nProject archived: ${projectArchived}. Labeled verification accounts created: ${accountsCreated}. No credentials are included in the report.\n`,
  );
for (const result of results.filter((item) => !item.passed))
  console.error(
    `::error title=${result.name}::${result.detail || "Verification cleanup did not complete."}`,
  );
if (!report.passed) process.exitCode = 1;
