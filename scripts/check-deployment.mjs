import { appendFile, writeFile } from "node:fs/promises";

function target(name, fallback) {
  const url = new URL(process.env[name] || fallback);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" && !(local && url.protocol === "http:"))
  ) {
    throw new Error(`${name} must be an HTTPS origin without credentials.`);
  }
  return url.origin;
}

const app = target("APP_URL", "https://collab-hub-phi.vercel.app");
const realtime = target("REALTIME_URL", "https://collab-hub-d51v.onrender.com");
const attempts = Number(process.env.DEPLOYMENT_CHECK_ATTEMPTS || 3);
if (!Number.isInteger(attempts) || attempts < 1 || attempts > 6) {
  throw new Error("DEPLOYMENT_CHECK_ATTEMPTS must be between 1 and 6.");
}

function requireCondition(condition, detail, status) {
  if (!condition) throw Object.assign(new Error(detail), { status });
}

async function json(response) {
  try {
    return await response.json();
  } catch {
    throw Object.assign(new Error("Expected a JSON response."), {
      status: response.status,
    });
  }
}

const checks = [
  {
    name: "Public application page",
    url: `${app}/`,
    verify: async (response) => {
      requireCondition(
        response.status === 200,
        "Expected HTTP 200.",
        response.status,
      );
      const body = await response.text();
      requireCondition(
        response.headers.get("content-type")?.includes("text/html") &&
          /id=["']root["']/.test(body),
        "Expected the application HTML entry point.",
        response.status,
      );
    },
  },
  ...[
    { name: "Vercel API health", origin: app, sockets: false },
    { name: "Render API health", origin: realtime, sockets: true },
  ].map(({ name, origin, sockets }) => ({
    name,
    url: `${origin}/api/health`,
    verify: async (response) => {
      requireCondition(
        response.status === 200,
        "Expected HTTP 200.",
        response.status,
      );
      const body = await json(response);
      requireCondition(
        body.status === "ok",
        "Database is not ready.",
        response.status,
      );
      requireCondition(
        body.realtime === sockets,
        "Socket hosting mode does not match this service.",
        response.status,
      );
    },
  })),
  {
    name: "Public demo player",
    url: `${app}/demo/index.html`,
    verify: async (response) => {
      requireCondition(
        response.status === 200,
        "Expected HTTP 200.",
        response.status,
      );
      const body = await response.text();
      requireCondition(
        response.headers.get("content-type")?.includes("text/html") &&
          body.includes("CollabHub-Demo.mp4") &&
          body.includes("<video"),
        "Expected the demo video player page.",
        response.status,
      );
    },
  },
  {
    name: "Public demo video download",
    url: `${app}/demo/CollabHub-Demo.mp4`,
    headers: { Range: "bytes=0-63" },
    verify: async (response) => {
      requireCondition(
        response.status === 200 || response.status === 206,
        "Expected a downloadable video response.",
        response.status,
      );
      const bytes = new Uint8Array(await response.arrayBuffer());
      requireCondition(
        response.headers.get("content-type")?.includes("video/mp4") &&
          new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp",
        "Expected MP4 data rather than the application HTML.",
        response.status,
      );
    },
  },
  {
    name: "Public project discovery",
    url: `${app}/api/projects?limit=1`,
    verify: async (response) => {
      requireCondition(
        response.status === 200,
        "Expected HTTP 200.",
        response.status,
      );
      requireCondition(
        Array.isArray((await json(response)).items),
        "Expected a project collection.",
        response.status,
      );
    },
  },
  {
    name: "Signed-out session protection",
    url: `${app}/api/auth/me`,
    verify: async (response) => {
      requireCondition(
        response.status === 401,
        "Expected HTTP 401 when signed out.",
        response.status,
      );
      requireCondition(
        typeof (await json(response)).error === "string",
        "Expected an authentication error response.",
        response.status,
      );
    },
  },
  {
    name: "Render transport and allowed browser origin",
    url: `${realtime}/socket.io/?EIO=4&transport=polling`,
    headers: { Origin: app },
    verify: async (response) => {
      requireCondition(
        response.status === 200,
        "Expected HTTP 200.",
        response.status,
      );
      requireCondition(
        response.headers.get("access-control-allow-origin") === app &&
          response.headers.get("access-control-allow-credentials") === "true",
        "Render must allow the application origin with credentials.",
        response.status,
      );
      const body = await response.text();
      let open;
      try {
        open = body.startsWith("0") ? JSON.parse(body.slice(1)) : undefined;
      } catch {}
      requireCondition(
        typeof open?.sid === "string",
        "Expected an Engine.IO transport handshake.",
        response.status,
      );
    },
  },
];

async function check(definition) {
  const { name, url, headers } = definition;
  let failure;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(30000),
        redirect: "follow",
      });
      await definition.verify(response);
      return { name, passed: true, status: response.status, attempts: attempt };
    } catch (error) {
      failure = {
        name,
        passed: false,
        status: Number.isInteger(error.status) ? error.status : null,
        // Only our fixed validation messages are reported; never remote bodies.
        detail: error.status
          ? error.message
          : "Network request failed or timed out.",
        attempts: attempt,
      };
      if (attempt < attempts)
        await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
  return failure;
}

const results = await Promise.all(checks.map(check));
const report = {
  checkedAt: new Date().toISOString(),
  targets: { application: app, realtime },
  passed: results.every((result) => result.passed),
  checks: results,
};
console.log(JSON.stringify(report, null, 2));
if (process.env.DEPLOYMENT_REPORT_PATH) {
  await writeFile(
    process.env.DEPLOYMENT_REPORT_PATH,
    JSON.stringify(report, null, 2) + "\n",
  );
}
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## Public deployment verification\n\nChecked: ${report.checkedAt}\n\n` +
      "| Check | Result | HTTP status |\n| --- | --- | --- |\n" +
      results
        .map(
          (result) =>
            `| ${result.name} | ${result.passed ? "Passed" : "Failed"} | ${result.status ?? "Unreachable"} |`,
        )
        .join("\n") +
      "\n\nThese requests do not create accounts or modify application records. Authenticated browser workflows require separate verification.\n",
  );
}
for (const result of results.filter((item) => !item.passed)) {
  console.error(
    `::error title=${result.name}::${result.detail} HTTP status: ${result.status ?? "unreachable"}.`,
  );
}
if (!report.passed) process.exitCode = 1;
