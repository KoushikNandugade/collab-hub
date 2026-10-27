# Deployment — Render + MongoDB Atlas

CollabHub deploys as one Node web service. Express serves the React build, REST API, and Socket.IO on the same origin. No separate frontend deployment is required.

## 1. Create the database

In your MongoDB Atlas account, create a cluster and an application database user with access to the CollabHub database. Obtain its `mongodb+srv://` connection string. Use Atlas network controls to permit your hosting service’s outbound addresses. Follow your host’s documented outbound-address guidance and keep the database credentials private.

Store the URI in the hosting environment as `MONGODB_URI`. Atlas is a replica set and supports the transactions required by application and invitation acceptance.

## 2. Create the Render service

Connect this GitHub repository to Render. You can create a Blueprint from `render.yaml`, or a Node web service with:

- Branch: `main`
- Root directory: repository root
- Build: `npm ci --include=dev --no-audit --no-fund && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- Node.js: 22 or newer

The blueprint uses the free plan; confirm current availability and limits in Render. Sleeping free instances can take time to wake and interrupt live connections. Select a plan appropriate for a continuously available service.

## 3. Set environment variables

| Variable                | Required     | Value                                                            |
| ----------------------- | ------------ | ---------------------------------------------------------------- |
| `NODE_ENV`              | Yes          | `production`                                                     |
| `MONGODB_URI`           | Yes          | Private Atlas connection string                                  |
| `JWT_SECRET`            | Yes          | Random secret at least 32 characters; the blueprint generates it |
| `CLIENT_ORIGIN`         | Yes          | Your actual HTTPS service URL, without trailing slash            |
| `PORT`                  | Host-managed | Render injects this automatically                                |
| `CLOUDINARY_CLOUD_NAME` | For uploads  | Cloudinary account cloud name                                    |
| `CLOUDINARY_API_KEY`    | For uploads  | Cloudinary API key                                               |
| `CLOUDINARY_API_SECRET` | For uploads  | Cloudinary API secret, used locally for signed uploads           |

Enter credentials only in secure hosting/environment settings. Do not paste them into issues, source files, or chat. Cloudinary’s API secret and JWT signing secret must be real runtime values; outbound proxy placeholder credentials cannot replace values used for local cryptographic signing.

Cloudinary is optional to run the core platform. Without its configuration, upload controls show a clear configuration error and users can use HTTPS image URLs. Uploads must be verified separately once your account is configured.

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

The application does not depend on its repository name. If you rename it to `collabhub` in GitHub settings, update the README/footer GitHub link, the local remote URL, and the hosting repository connection if your provider requires it. Preserve the existing history; a new repository is unnecessary.

## Current verification boundary

Local MongoDB, REST, Socket.IO, browser workflows, and the frontend build are testable without external accounts. Live Render deployment, Atlas network access, and Cloudinary upload verification require your account configuration. A checked-in blueprint is not evidence of a published deployment.
