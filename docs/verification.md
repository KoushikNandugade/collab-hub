# Verification record

Verified locally on 28 October 2026. The existing public URL remains **https://collab-hub-phi.vercel.app** and the renamed repository is **KoushikNandugade/collab-hub**.

## Results

| Check                                                  | Result                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `npm test`                                             | 22 passed, 0 failed, 0 skipped                                                                |
| `npm run build`                                        | Passed; client pages split into separate bundles                                              |
| Browser suite against Vite + Express                   | 4 passed                                                                                      |
| Same browser suite against the Vercel function harness | 4 passed                                                                                      |
| `npm audit --audit-level=high`                         | 0 vulnerabilities                                                                             |
| Node.js 22 production container                        | Built; MongoDB health and built SPA requests passed; runtime UID 1000                         |
| Function dependency trace                              | Express, database helper, models, Mongoose and native bcrypt present; credential files absent |
| `git diff --check`                                     | Passed                                                                                        |

The container build used already-verified npm cache artifacts because this cloud environment's nested Docker network cannot resolve the npm registry. Lockfile integrity checks remained enabled.

## Workflows exercised

The API tests use isolated local replica-set databases. They cover registration/login, HTTP-only secure cookies, protected endpoints, onboarding, public-profile privacy, project creation and search, owner authorization, duplicate application prevention, concurrent acceptance into the final team slot, invitations, membership, task authorization and persistence, resource links, notifications, saved projects, authenticated Socket.IO delivery, session revocation, and matching weights.

Serverless-specific checks exercise the actual `api/index.js` handler: missing configuration returns a safe 503, concurrent requests reuse a database connection, cookies authenticate across function requests, projects persist, and short-lived real-time tokens cannot authenticate REST calls.

The browser suites exercise registration, onboarding, project creation, task changes surviving reload, resource creation, persisted discussion messages, logout/login, mobile discovery, two separate users applying and accepting membership, private workspace access, bidirectional direct messages, and recovering a lost session without creating unauthorized data. The Vercel harness separately models static frontend serving and API routing; conversations there use periodic refresh.

## Deployment boundaries

Requests from this cloud environment to the production Vercel domain were blocked by its egress proxy before reaching the application (`CONNECT 403`). Consequently, these results do **not** establish that the deployed Vercel build, its runtime variables, Atlas access, or its edge rewrites are healthy. The exact Vercel hostname has been added to the saved environment network draft; applying the draft is a separate user action.

The user confirmed that Render has not been deployed. Persistent Socket.IO delivery on the Vercel frontend requires an existing Render service configured with the same MongoDB URI and JWT secret, its `CLIENT_ORIGIN` set to the unchanged Vercel URL, and its actual HTTPS URL saved as `REALTIME_URL` on Vercel. Until then, persisted messaging uses five-second refresh rather than live sockets.

Cloudinary upload calls remain unverified without that account's credentials. The URI-based image fields work independently.

## Required production checks

After the existing Vercel project deploys this commit, verify:

1. `/api/health` returns JSON with `status: "ok"`.
2. `/api/projects` returns JSON containing an `items` array.
3. `/api/auth/me` returns JSON 401 when signed out.
4. Register, onboard, create a project and task, and reload.
5. Apply and accept using two separate browser profiles.
6. Confirm persisted messages and, when Render is configured, live delivery and typing indicators.

Use the existing Vercel project and domain. No new frontend project or domain is required. See [deployment instructions](deployment.md).

## Startup failure diagnostics follow-up

A supplied Render log showed a successful build followed by `MongooseServerSelectionError` at startup. Safe structured diagnostics were added to distinguish network/server selection, DNS, authentication, and missing configuration without logging connection strings or secrets. Four additional tests verify those categories and credential non-disclosure; the full API/integration suite now passes 22 tests. Atlas network access from the actual Render service remains a required external check.
