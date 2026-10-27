// Log only driver metadata and fixed guidance. Never serialize error messages,
// stacks, connection strings, server addresses, or environment variable values.
const safeName = (value) =>
  typeof value === "string" && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(value)
    ? value
    : "Error";
const safeCode = (value) =>
  typeof value === "number"
    ? value
    : typeof value === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(value)
      ? value
      : undefined;
export function startupDiagnostic(error = {}) {
  const servers =
    error.reason?.servers instanceof Map
      ? [...error.reason.servers.values()]
      : [];
  const serverErrors = servers.slice(0, 10).map((server) => ({
    name: safeName(server.error?.name),
    code: safeCode(server.error?.code),
    causeCode: safeCode(server.error?.cause?.code),
  }));
  const code = safeCode(error.code || error.cause?.code);
  const authentication =
    code === 18 ||
    error.codeName === "AuthenticationFailed" ||
    serverErrors.some((item) => item.code === 18);
  const dns =
    ["ENOTFOUND", "ESERVFAIL", "EREFUSED"].includes(code) ||
    (typeof error.syscall === "string" && error.syscall.startsWith("query"));
  const selection = error.name === "MongooseServerSelectionError";
  const configuration =
    typeof error.message === "string" &&
    /^(JWT_SECRET|MONGODB_URI)\b/.test(error.message);
  const category = authentication
    ? "authentication"
    : dns
      ? "dns"
      : selection
        ? "server-selection"
        : configuration
          ? "configuration"
          : "startup";
  const hints = {
    authentication:
      "Check the Atlas database user, password, permissions, and URI encoding in MONGODB_URI.",
    dns: "Check the Atlas cluster hostname, cluster status, and DNS access from the hosting service.",
    "server-selection":
      "Check that the Atlas cluster is running and its IP access list allows this hosting service outbound IP addresses. Also verify the URI hostname and inspect the driver error codes below.",
    configuration:
      "Set MONGODB_URI and a JWT_SECRET of at least 32 characters in the hosting service Environment settings.",
    startup:
      "Check the hosting service Environment settings and database connectivity.",
  };
  const topology = [
    "Unknown",
    "Single",
    "ReplicaSetNoPrimary",
    "ReplicaSetWithPrimary",
    "Sharded",
    "LoadBalanced",
  ].includes(error.reason?.type)
    ? error.reason.type
    : undefined;
  return {
    event: "startup_failed",
    category,
    name: safeName(error.name),
    code,
    topology,
    serverErrors,
    hint: hints[category],
  };
}
