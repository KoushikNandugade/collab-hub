# Verification record

Recorded on **28 October 2026 IST** for **CollabHub**. Public application: **https://collab-hub-phi.vercel.app**. Repository: **KoushikNandugade/collab-hub**.

## Latest readiness check — 29 October 2026 IST

- [Public deployment run 40776717573](https://github.com/KoushikNandugade/collab-hub/actions/runs/40776717573) passed at `a5b13d8`: application page, Vercel/Render API and database health, public discovery, signed-out protection, Render transport/CORS, demo player, and MP4 download.
- [Fresh CI run 40776717629](https://github.com/KoushikNandugade/collab-hub/actions/runs/40776717629) passed at `a5b13d8`: server/API tests, frontend build, four browser scenarios on Vite/Express, and the same four through the Vercel function. [Live acceptance run 40768408566](https://github.com/KoushikNandugade/collab-hub/actions/runs/40768408566) executed successfully after the demo assets were added at `24f4abe`; it produced the live-workflow report.
- A 1080p, 4-minute 56-second narrated demo is included under `client/public/demo/`. It records the working local application with isolated demo data; public playback/download is separately verified above.
- Commit `853c115` subsequently exposed an Atlas connection string and JWT secret in `.env.example`. The latest file was sanitized in `a5b13d8`; the exposed values remain in historical commits. Earlier clean-history statements below describe their original check time and no longer describe the entire current history. Rotation of the database/JWT credentials and revocation of the previously shared Render API key are still unconfirmed. No hosting secret values or account management settings were inspected.

## Confirmed GitHub Actions result

[Run 40604079512](https://github.com/KoushikNandugade/collab-hub/actions/runs/40604079512) completed successfully at commit `024220a`.

| Check                              | Result                                  |
| ---------------------------------- | --------------------------------------- |
| MongoDB replica-set startup        | Passed                                  |
| API / Socket.IO / serverless suite | 22 passed; 0 failed; 0 skipped          |
| Frontend build                     | Passed; output `client/dist`            |
| Vite/Express browser suite         | 4 passed in 23.7 seconds                |
| Vercel-function browser suite      | Same 4 scenarios passed in 20.6 seconds |
| Overall hosted CI                  | Success in 1 minute 46 seconds          |

The latest run for subsequent commits is visible in [GitHub Actions](https://github.com/KoushikNandugade/collab-hub/actions/workflows/ci.yml). A past green run is not a claim that every later commit or production deployment has been verified.

## Additional completed local checks

- Production Node.js 22 image built and served MongoDB health and the compiled SPA with runtime UID 1000.
- Function dependency tracing included Express, models, Mongoose, and native bcrypt, without credential files.
- Dependency audit reported zero vulnerabilities at the time it was run; this is a point-in-time result.
- Known private JWT and Atlas values were absent from Git history. Common MongoDB URI/token/private-key patterns were also checked.
- Local browser workflows passed in both manually started and Playwright-managed server modes.
- Local configuration files remain ignored by Git.

The local production container build used integrity-verified npm cache artifacts because nested Docker DNS could not resolve the registry. Integrity and TLS verification remained enabled.

## What the tests exercise

API checks cover registration/login, HTTP-only secure cookies, onboarding, public-profile privacy, owner/member permissions, discovery, duplicate applications, concurrent acceptance into a final team slot, invitations, tasks, resources, saved projects, notifications, private messaging, authenticated socket delivery, session revocation, and matching weights.

The actual Vercel handler is tested for safe startup failure, connection reuse, cookie authentication, persistence, and scoped socket tokens that cannot authenticate REST requests.

Browser scenarios cover registration/onboarding, project creation, persistent task changes, resources, discussions, logout/login, mobile discovery, application acceptance across two users, private workspace access, direct messaging, and lost-session recovery without unauthorized writes.

## CI compatibility decisions

MongoDB 8.0.34 explicitly refuses Linux kernels 6.19 and newer, citing SERVER-121912. The [published Ubuntu 22.04 runner manifest](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2204-Readme.md) reports kernel `6.8.0-1064-azure` in image `20261023.322.3`; CI therefore uses `ubuntu-22.04` and an immutable MongoDB image.

Node 22.23.3 watch mode tries to watch an optional `.env` path even when the file is missing. An empty ignored `.env` is created in CI; values remain injected by the job. This failure and the empty-file correction were reproduced in Node 22 locally. Playwright owns server startup/cleanup and waits for the proxied `/api/health` endpoint instead of relying on a background shell process.

## Public deployment verification

A separate **Verify public deployment** workflow runs `scripts/check-deployment.mjs` without account credentials or application writes. It verifies the application HTML, Vercel API/database health, public discovery, signed-out 401 behavior, Render health, and transport/CORS for the existing browser origin. It publishes a JSON artifact and readable job summary, and exits unsuccessfully when a requirement fails.

To run it yourself without creating records:

```bash
node scripts/check-deployment.mjs
```

The check retries to allow a sleeping Render instance to wake. A transport handshake does not establish authenticated message delivery. The separate signed-in live browser check below verifies registration, recruitment, workspace persistence, and two-account messaging.

## Confirmed public endpoint result

[Public deployment run 40600436400](https://github.com/KoushikNandugade/collab-hub/actions/runs/40600436400) passed all six checks at commit `24e0fe5` in 52 seconds. Both deployed APIs returned healthy database status; public discovery, signed-out 401 behavior, and Render transport/CORS also passed. The earlier Vercel configuration failure is therefore historical, not the latest observed endpoint result.

## Authenticated live acceptance

The separate **Verify live workflows** workflow runs `scripts/check-live-workflows.mjs`. It creates two clearly labeled verification accounts with random passwords kept only in memory, exercises recruitment, persistence, notifications, scoped cross-host socket authentication, live message/typing delivery, logout revocation, and the actual browser UI, then archives its project and signs the accounts out. The app has no account deletion API, so the labeled profiles remain. Its reports omit emails, passwords, cookies, tokens, response bodies, and browser traces.

This operation creates records and requires `LIVE_ACCEPTANCE_ALLOW_WRITES=1`; it is separate from the read-only endpoint check and ordinary local test suite. The live workflow follows a successful main CI run so hosting has time to deploy. It runs for application/live-check changes or an explicit manual dispatch; documentation-only commits do not create additional accounts. The executed hosted result is recorded below; a run where the test step was skipped is not counted as live verification.

## Confirmed authenticated production result

[Live acceptance run 40604285227](https://github.com/KoushikNandugade/collab-hub/actions/runs/40604285227) completed successfully against the existing Vercel and Render URLs after the successful main CI run for commit `024220a`. The dependency install, browser install, live test step, and report upload all executed; this was not a skipped test run. Total duration was 2 minutes 10 seconds.

All seven reported checks passed:

1. Register accounts, enforce session-cookie protections, and complete onboarding.
2. Publish, discover, save, and protect a project; reject invalid input and unauthorized access.
3. Apply, reject duplicate operations, accept membership, and update team capacity.
4. Persist assigned task changes, resources, and notifications.
5. Authenticate socket access across hosts, deliver and persist messages and typing, revoke access on logout, and sign in again.
6. Use the published browser UI for login, task persistence after reload, mobile discovery without horizontal overflow, live conversation connection, message delivery, and message persistence after reload.
7. Archive the verification project. Verification accounts were signed out; labeled profiles remain as documented above.

## Current production boundary

The supplied Render dashboard showed Live and Vercel completed deployment. A previous configuration error was followed by the successful hosted endpoint check above. Authenticated workflows are now independently confirmed by the executed live acceptance run above. Build, endpoint, and signed-in browser checks remain distinct evidence.

Direct requests from this workspace to the production services are blocked by its egress proxy before reaching them (`CONNECT 403`). The successful hosted endpoint and live-browser runs above provide independent verification from GitHub Actions.

No Vercel, Render, or Atlas management credential is currently available to this workspace. Credential rotation and hosting environment changes cannot be claimed complete without account access or explicit confirmation of the changes. Cloudinary upload calls remain unverified without its optional account configuration.

The demo video is now bundled and its public download is verified as recorded above. The submission form remains user-confirmed; its entries and timing are not independently verified. See [submission-readiness.md](submission-readiness.md).

## Live acceptance finding and correction

The first live-acceptance run passed account creation/onboarding, project publication/discovery/saving and access checks, application acceptance and role capacity, persistent tasks/resources, and notifications. It then failed because the API did not provide scoped access to the expected external socket service; its test project was archived. The Production Vercel function now defaults to the existing Render URL if `REALTIME_URL` is absent. Local development function runs retain polling, and an explicit environment override is still supported. The Vercel-handler integration test verifies the production URL, scoped token issuance, and rejection of that token for REST authentication. The successful executed live acceptance run above verifies this correction in production.
