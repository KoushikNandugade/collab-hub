# Deployment

The public application is **https://collab-hub-phi.vercel.app**. The persistent Socket.IO service is **https://collab-hub-d51v.onrender.com**. Keep the existing projects and domains when redeploying.

## Hosting architecture

Vercel serves the React build and runs `api/index.js`, which reuses the Express application and MongoDB connections across warm invocations. Browser REST requests use same-origin `/api` endpoints and HTTP-only session cookies.

Render runs a normal Node Web Service with a persistent Socket.IO server. The Vercel API issues short-lived, audience-restricted tokens for socket authentication. Both services must use the same database and signing secret. Without a socket connection, persisted messages refresh every five seconds.

## Vercel settings

Use the existing `collab-hub` project connected to `KoushikNandugade/collab-hub`, branch `main`.

| Setting          | Value                                       |
| ---------------- | ------------------------------------------- |
| Root Directory   | Repository root; leave blank                |
| Framework        | Vite                                        |
| Install Command  | `npm ci --include=dev --no-audit --no-fund` |
| Build Command    | `npm run build`                             |
| Output Directory | `client/dist`                               |

The root `vercel.json` contains the build settings, function configuration, API rewrites, and React Router fallback. The Vercel Production function uses the existing Render URL by default when `REALTIME_URL` is absent; local function runs keep polling unless an external URL is configured. If dashboard overrides are enabled, ensure they agree with these values. Do not set Root Directory to `client`: the API function and server workspace are at the repository root.

Add these variables in **Environment Variables**, selecting **Production**:

| Name            | Value                                                                            |
| --------------- | -------------------------------------------------------------------------------- |
| `MONGODB_URI`   | Private Atlas connection string; identical to Render                             |
| `JWT_SECRET`    | Private random secret, at least 32 characters; identical to Render               |
| `CLIENT_ORIGIN` | `https://collab-hub-phi.vercel.app`                                              |
| `REALTIME_URL`  | Optional override; Production defaults to `https://collab-hub-d51v.onrender.com` |

Vercel supplies `NODE_ENV=production`. Do not expose credentials through `VITE_` variables. Settings saved only for Preview or Development do not configure Production. Enter the value alone, without a `KEY=` prefix.

After saving variables, open **Deployments → latest deployment → ⋯ → Redeploy** and wait for **Ready**. Environment changes do not update existing deployments automatically.

## Render Web Service settings

Open the existing `collab-hub` service. For a fresh setup, choose **New + → Web Service**, connect the same repository, and select Node. Use a standard Web Service through the dashboard; an account API key or Blueprint is unnecessary.

| Setting           | Value                                                        |
| ----------------- | ------------------------------------------------------------ |
| Branch            | `main`                                                       |
| Runtime           | Node                                                         |
| Root Directory    | Repository root; leave blank                                 |
| Build Command     | `npm ci --include=dev --no-audit --no-fund && npm run build` |
| Start Command     | `npm start`                                                  |
| Health Check Path | `/api/health`                                                |

Inside the **service**, choose **Environment → Edit** and set:

| Name            | Value                                                              |
| --------------- | ------------------------------------------------------------------ |
| `MONGODB_URI`   | Private Atlas connection string; identical to Vercel               |
| `JWT_SECRET`    | Private random secret, at least 32 characters; identical to Vercel |
| `NODE_ENV`      | `production`                                                       |
| `CLIENT_ORIGIN` | `https://collab-hub-phi.vercel.app`                                |

Render injects `PORT`. Use **Save, rebuild, and deploy** after changing variables. Wait for **Live** and verify its health endpoint. Free instances may sleep and delay requests while waking; sockets may reconnect after inactivity.

The project's **Add environment** button creates a project environment. Runtime variables belong in the Web Service's **Environment** page.

## MongoDB Atlas and secrets

Use an Atlas database user with access to the application database. The connection helper selects `collabhub` when the URI has no database path; an explicit database name is preserved. A replica set is required for membership transactions, and Atlas supports them.

Atlas Network Access must permit connections from **both hosting services**. For Render, obtain outbound addresses under **Connect → Outbound** and add those ranges to the Atlas IP Access List. Use your providers' current outbound-network guidance. An existing `0.0.0.0/0` entry allows all IPv4 sources and still requires authentication; restrict access where your hosting network permits it. Wait for access-list entries to become Active.

A JWT secret is created by you, rather than issued by MongoDB or Vercel. If you do not already have one, generate it privately:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Store the exact same value on both hosts. Rotating it invalidates existing sessions; coordinate updates to both services. Never commit credentials, include them in URLs, or paste them into issues. Replace any database passwords or account API keys previously disclosed publicly.

Cloudinary uploads additionally require `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` on the host handling the REST API. These are optional for the core application and need separate validation.

## Troubleshooting

| Symptom                                       | Check                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `STATIC_BUILD_NO_OUT_DIR`, looking for `dist` | Root Directory must be repository root; Output Directory must be `client/dist`. Save and redeploy.                             |
| Vercel `/api/health` returns 404              | Latest deployment must be Ready and active, with root `vercel.json` and `api/index.js` included.                               |
| JSON 503: API unavailable                     | Open Vercel **Logs**, request `/api/health`, and inspect the `startup_failed` event.                                           |
| `category: configuration`                     | `MONGODB_URI` is missing, or `JWT_SECRET` is missing/shorter than 32 characters. Check Production scope and redeploy.          |
| `category: server-selection`                  | Confirm cluster status, Atlas access-list rules, and the URI hostname. This alone does not prove the password is wrong.        |
| `category: authentication`                    | Check the database user, permissions, password, and URI encoding.                                                              |
| `category: dns`                               | Check the cluster hostname, cluster status, and DNS access.                                                                    |
| Render says `../.env not found`               | Expected when runtime variables come from Render's Environment settings. Check the actual startup error if the process exits.  |
| Messages persist but live delivery fails      | Confirm `REALTIME_URL`, both hosts' matching database and JWT values, Render `CLIENT_ORIGIN`, and socket-service availability. |

Safe startup diagnostics omit secrets, connection strings, server addresses, stack traces, and raw driver messages. Do not disable TLS verification to work around connectivity errors.

## Live verification

Open both health endpoints:

- https://collab-hub-phi.vercel.app/api/health
- https://collab-hub-d51v.onrender.com/api/health

Each should return HTTP 200 with `status: "ok"`. The `realtime` field indicates whether that process hosts a Socket.IO server: `false` is expected for the Vercel function, and `true` for Render. It does not itself verify the browser's socket connection.

Then check `/api/projects` returns an `items` array and signed-out `/api/auth/me` returns JSON 401. Follow the [demo checklist](demo.md) for browser workflows, including two-account messaging and private workspace access.

## Local function verification

With local MongoDB, a private root `.env`, and sample data:

```bash
npm run build
PORT=3004 NODE_ENV=development CLIENT_ORIGIN=http://localhost:3004 npm run dev:vercel
```

In another terminal:

```bash
E2E_BASE_URL=http://localhost:3004 npm run test:e2e
```

The harness tests the actual function and frontend separately. It does not reproduce Vercel edge routing or verify Atlas connectivity.

## Docker and standalone hosting

The Express server can also serve the entire built application, API, and sockets from one origin:

```bash
docker build -t collabhub .
docker run --rm -p 3001:3001 --env-file .env.production collabhub
```

Prepare the private `.env.production` file with the required variables and set `CLIENT_ORIGIN` to that standalone deployment's public HTTPS origin. Production cookies require HTTPS, so put the service behind an HTTPS proxy. For ordinary local browser development, use `npm run dev` with `NODE_ENV=development`.

## Current verification boundary

The [hosted public-deployment check](https://github.com/KoushikNandugade/collab-hub/actions/runs/40600436400) passed all six endpoint checks at commit `24e0fe5`. This supersedes the earlier Vercel configuration failure. Direct requests from this workspace remain blocked by its outbound proxy; the hosted check provides public endpoint evidence. Authenticated live workflows and account-level credential rotation are tracked separately in [verification.md](verification.md).
