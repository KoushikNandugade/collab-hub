# Deployment — existing Vercel site and Render real-time service

The existing public URL is **https://collab-hub-phi.vercel.app**. Keep the existing Vercel project and its domain. Pushes to the connected `KoushikNandugade/collab-hub` repository can update that deployment without creating another project or changing its URL.

## Vercel application

The root `vercel.json` configures the Vite frontend, React Router fallback, and `/api/*` rewrites to a Node function in `api/index.js`. The API reuses the Express application, Mongoose models, and MongoDB connection across warm invocations. Cookies remain HTTP-only and same-origin.

In the **existing** Vercel project:

- Keep Root Directory at the repository root (blank), not `client` or `server`.
- Keep the existing Production Branch as `main`.
- Use the checked-in build settings: install `npm ci --include=dev --no-audit --no-fund`, build `npm run build`, output `client/dist`.
- Set `MONGODB_URI` to the private Atlas connection string.
- Set `JWT_SECRET` to a random value of at least 32 characters.
- Set `CLIENT_ORIGIN` to `https://collab-hub-phi.vercel.app`.
- Vercel supplies `NODE_ENV=production` and its deployment hostname. Never expose these credentials as `VITE_` variables.
- Redeploy the existing project after changing runtime variables.

The supplied Atlas URI has no database path. The connection helper selects `collabhub` in that case; an explicit database name in a connection string is preserved. Atlas network access must allow the deployment host to connect.

On Vercel alone, the REST API supports accounts, onboarding, profiles, projects, applications, invitations, saved projects, workspaces, tasks, resources, notifications, and persisted messages. Conversations refresh every five seconds. Vercel functions do not host a persistent Socket.IO server; typing indicators and immediate delivery use the Render service below.

## If `/api/health` returns a Vercel 404

A Vercel 404 means the function was not routed or the expected deployment is not active; it does not establish a MongoDB credential failure. The checked-in function is at repository-root `api/index.js`, not inside `client`.

In the existing Vercel project, check **Settings → Build and Deployment → Root Directory**. Use the repository root (blank or `./`), save, and redeploy the latest `main` commit. The root `vercel.json` supplies the frontend output directory and `/api/*` rewrite. Confirm that the deployment is Ready and that `/api/health` returns JSON. A JSON 503 after that is a separate runtime/configuration failure and should be investigated using the function logs and Atlas connectivity.

## Standard Render Web Service setup

Use **New + → Web Service** in your logged-in Render dashboard. Connect the existing GitHub repository; do not select Blueprint deployment.

| Setting            | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Repository         | `KoushikNandugade/collab-hub`                                |
| Branch             | `main`                                                       |
| Language / runtime | Node                                                         |
| Root Directory     | Leave blank (repository root)                                |
| Build Command      | `npm ci --include=dev --no-audit --no-fund && npm run build` |
| Start Command      | `npm start`                                                  |
| Plan               | Free, if available                                           |
| Health Check Path  | `/api/health`                                                |

In Environment, add:

| Name            | Value                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------- |
| `MONGODB_URI`   | Your private Atlas connection string                                                      |
| `JWT_SECRET`    | A newly generated random secret, or the existing shared secret if you already created one |
| `NODE_ENV`      | `production`                                                                              |
| `CLIENT_ORIGIN` | `https://collab-hub-phi.vercel.app`                                                       |

If `JWT_SECRET` is not in Vercel, create one instead of searching for an automatically supplied value. In Render, add the variable and use its Generate option. Alternatively, generate a value in your own terminal:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Keep that generated value private. Add the exact same value as a **new** `JWT_SECRET` variable in the existing Vercel project's Environment Variables settings, selecting the Production environment. Redeploy Vercel after saving it. Do not commit the value, put it in a URL, or share it in chat.

Click **Deploy Web Service** in Render. When it reports Live, test its own service URL with `/api/health`, then add that actual HTTPS Render URL as `REALTIME_URL` on Vercel and redeploy the existing Vercel project. Your frontend domain stays unchanged. No account API key is required for these dashboard actions.

## Connect live Socket.IO delivery without changing the Vercel link

1. Create a normal Render Web Service using the settings above. Use the **same** `MONGODB_URI` and `JWT_SECRET` values as Vercel, and set `CLIENT_ORIGIN` to the existing Vercel domain.
2. Wait for the Render `/api/health` endpoint to report healthy.
3. In the existing Vercel project, add `REALTIME_URL` with the actual HTTPS Render service URL, without a trailing slash. Redeploy that Vercel project.
4. Check that the conversation status changes from periodic refresh to **Live conversation**, two users receive messages immediately, and typing indicators work.

The Vercel API issues a five-minute, audience-restricted real-time token after checking the HTTP-only session cookie. The token stays in browser memory and is sent only to the configured HTTPS Socket.IO service. It cannot authenticate REST requests. The Render server verifies token signature, expiry, user session version, room membership, and message authorization. Outbound delivery also checks session revocation so logout on Vercel revokes delivery on Render. No third-party cookies are needed for this connection.

## Validate the Vercel entry point locally

With local MongoDB, root `.env`, a built client, and sample CampusLoop data:

```bash
npm run build
PORT=3004 NODE_ENV=development CLIENT_ORIGIN=http://localhost:3004 npm run dev:vercel
```

In another terminal:

```bash
E2E_BASE_URL=http://localhost:3004 npm run test:e2e
```

This runs the same browser workflows through the actual Vercel function with its periodic message refresh. It does not simulate Vercel's edge routing, Atlas connectivity, or a published deployment; verify those against the existing public URL after deployment.

---

# Standalone Render deployment

CollabHub deploys as one Node web service. Express serves the React build, REST API, and Socket.IO on the same origin. No separate frontend deployment is required.

## 1. Create the database

In your MongoDB Atlas account, create a cluster and an application database user with access to the CollabHub database. Obtain its `mongodb+srv://` connection string. Use Atlas network controls to permit your hosting service’s outbound addresses. Follow your host’s documented outbound-address guidance and keep the database credentials private.

Store the URI in the hosting environment as `MONGODB_URI`. Atlas is a replica set and supports the transactions required by application and invitation acceptance.

## 2. Create the Render service

Connect this GitHub repository through **New + → Web Service**, choose the Node runtime, and use:

- Branch: `main`
- Root directory: repository root
- Build: `npm ci --include=dev --no-audit --no-fund && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- Node.js: 22 or newer

Choose the Free plan if available; confirm its current availability and limits in Render. Sleeping free instances can take time to wake and interrupt live connections. Select a plan appropriate for a continuously available service.

## 3. Set environment variables

| Variable                | Required     | Value                                                                                         |
| ----------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | Yes          | `production`                                                                                  |
| `MONGODB_URI`           | Yes          | Private Atlas connection string                                                               |
| `JWT_SECRET`            | Yes          | Random secret at least 32 characters; use the same value as Vercel when linking the two hosts |
| `CLIENT_ORIGIN`         | Yes          | Your actual HTTPS service URL, without trailing slash                                         |
| `PORT`                  | Host-managed | Render injects this automatically                                                             |
| `CLOUDINARY_CLOUD_NAME` | For uploads  | Cloudinary account cloud name                                                                 |
| `CLOUDINARY_API_KEY`    | For uploads  | Cloudinary API key                                                                            |
| `CLOUDINARY_API_SECRET` | For uploads  | Cloudinary API secret, used locally for signed uploads                                        |

Enter credentials only in secure hosting/environment settings. Do not paste them into issues, source files, or chat. Cloudinary’s API secret and JWT signing secret must be real runtime values; outbound proxy placeholder credentials cannot replace values used for local cryptographic signing.

Cloudinary is optional to run the core platform. Without its configuration, upload controls show a clear configuration error and users can use HTTPS image URLs. Uploads must be verified separately once your account is configured.

## Troubleshoot Atlas connection failures at startup

If Render reports **Build successful** and then `MongooseServerSelectionError` when running `npm start`, the frontend build completed but the backend could not select a MongoDB server. This alone does not identify a bad password. The `../.env not found. Continuing without it.` notice is expected on Render because runtime values come from the Environment settings.

Check these prerequisites:

1. In the Render service, open **Connect → Outbound** and copy its outbound IP addresses/CIDR ranges.
2. In the Atlas project, open **Security → Network Access → IP Access List**. Add those Render outbound ranges and wait for the entries to become Active.
3. Confirm the Atlas cluster is running and `MONGODB_URI` in Render is the intended connection string for an Atlas database user.
4. Redeploy the existing Render service after the access rules are active.

Startup logs now contain a `startup_failed` JSON event with a category, driver error codes, topology type, and fixed troubleshooting guidance. They omit error messages, stack traces, server addresses, URI values, passwords, and JWT secrets. `server-selection` points to cluster/network connectivity checks; `authentication` points to the database user/URI credentials; `dns` points to hostname/discovery access; `configuration` points to missing runtime values. TLS verification remains enabled.

## 4. Verify the live service

1. Confirm the build succeeds and the host reports `/api/health` healthy.
2. Open the live HTTPS URL and register a new account.
3. Complete onboarding; create a project and task; reload to verify persistence.
4. In a separate browser profile, create a second user, apply to the project, and accept from the owner account.
5. Confirm the accepted user can access the workspace and the role count changes.
6. Send a team/direct message and confirm another signed-in browser receives it.
7. Log out and verify protected pages require login.
8. Verify Cloudinary upload if configured.

Do not use fictional seed accounts with a known password on a public deployment. To add example projects without enabling account login, run the seed command with no `SEED_PASSWORD` value.

## Docker alternative

Build the production image:

```bash
docker build -t collabhub .
```

Run it with your secure environment file and port mapping:

```bash
docker run --rm -p 3001:3001 --env-file .env.production collabhub
```

For the included local Compose application service, use an HTTPS reverse proxy in front of the production app. Production cookies require HTTPS. For ordinary local browser development use `npm run dev` and the development `.env` instead.

## Repository rename

The application does not depend on its repository name. If you rename it to `collabhub` in GitHub settings, update repository references and the hosting repository connection if your provider requires it. The repository is now `KoushikNandugade/collab-hub`; the Vercel domain remains unchanged. Preserve the existing history; a new repository is unnecessary.

## Current verification boundary

Local MongoDB, REST, Socket.IO, browser workflows, and the frontend build are testable without external accounts. Live Render deployment, Atlas network access, and Cloudinary upload verification require your account configuration. A checked-in blueprint is not evidence of a published deployment.
