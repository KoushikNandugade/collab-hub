import { test } from "node:test";
import assert from "node:assert/strict";
import { startupDiagnostic } from "../src/utils/startup-diagnostic.js";

test("database selection failures explain network access without leaking connection details", () => {
  const password = "private-test-password";
  const uri =
    "mongodb+srv://private-user:" + password + "@private-host.example/database";
  const report = startupDiagnostic({
    name: "MongooseServerSelectionError",
    message: uri,
    stack: uri,
    reason: {
      type: "ReplicaSetNoPrimary",
      servers: new Map([
        [
          uri,
          {
            error: {
              name: "MongoNetworkError",
              message: uri,
              cause: { code: "ETIMEDOUT", message: password },
            },
          },
        ],
      ]),
    },
  });
  assert.equal(report.category, "server-selection");
  assert.equal(report.topology, "ReplicaSetNoPrimary");
  assert.equal(report.serverErrors[0].causeCode, "ETIMEDOUT");
  assert.match(report.hint, /outbound IP addresses/);
  const serialized = JSON.stringify(report);
  for (const marker of [password, uri, "private-user", "private-host"])
    assert.ok(!serialized.includes(marker));
});
test("authentication failures point to database credentials without printing passwords", () => {
  const report = startupDiagnostic({
    name: "MongoServerError",
    code: 18,
    codeName: "AuthenticationFailed",
    message: "private-test-password",
  });
  assert.equal(report.category, "authentication");
  assert.match(report.hint, /Atlas database user/);
  assert.ok(!JSON.stringify(report).includes("private-test-password"));
});
test("SRV discovery failures are distinguished from authentication failures", () => {
  const report = startupDiagnostic({
    name: "Error",
    code: "ECONNREFUSED",
    syscall: "querySrv",
    message: "private-host.example",
  });
  assert.equal(report.category, "dns");
  assert.match(report.hint, /DNS/);
  assert.ok(!JSON.stringify(report).includes("private-host.example"));
});
test("configuration failures identify required variable names without their values", () => {
  const report = startupDiagnostic({
    name: "Error",
    message: "JWT_SECRET is required.",
  });
  assert.equal(report.category, "configuration");
  assert.match(report.hint, /JWT_SECRET/);
  assert.match(report.hint, /32 characters/);
});
