# CollabHub

**Find Your People. Build Something Great.**

Project URL: [collab-hub-phi.vercel.app](https://collab-hub-phi.vercel.app) · Repository: [KoushikNandugade/collab-hub](https://github.com/KoushikNandugade/collab-hub)

A full-stack collaboration platform for students, developers, designers, and makers. Discover projects, apply for a role, recruit a team, and build together in a private workspace.

## Deploy as a normal Render Web Service

In the Render dashboard choose **New + → Web Service**, connect `KoushikNandugade/collab-hub`, select `main`, and choose the **Node** runtime. Leave Root Directory blank. Build with `npm ci --include=dev --no-audit --no-fund && npm run build` and start with `npm start`. Use the Free plan if available.

Add `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, and `CLIENT_ORIGIN=https://collab-hub-phi.vercel.app` in the service's Environment section. If no JWT secret has been created, generate a new random value and add the **same** value to both Render and Vercel. A JWT secret is created by you; it is not issued by MongoDB or Vercel.

This uses a standard Web Service through the dashboard. No Blueprint or Render API key is needed. See [the exact setup steps](docs/deployment.md). Keep the existing Vercel project and URL.

## What you can do

- Create an account with bcrypt-hashed passwords and JWT sessions in HTTP-only cookies.
- Build a profile with skills, interests, college, goals, experience, and availability.
- Discover projects using server-side search, category, skill, experience, type, and status filters, sorting, and pagination.
- Create and edit projects with multiple recruiting roles, role-specific skills, capacities, deadlines, images, and GitHub links.
- Apply to projects, withdraw an application, and accept or decline applicants. MongoDB transactions enforce role openings and team capacity even for concurrent acceptance requests.
- Find collaborators, view public profiles, invite teammates, and save interesting projects.
- Work in member-only project spaces with task assignment, a four-column Kanban board, resources, discussions, and activity history.
- Send direct and team messages with Socket.IO delivery, typing indicators, persisted history, timestamps, and unread counts.
- Receive persisted notifications for applications, decisions, invitations, project updates, messages, and task assignments.
- Discover recommendations using an explained rule-based matching score. No machine-learning claims.
- Upload profile and project images through Cloudinary when its optional credentials are configured. Image URLs work independently.

New accounts have real empty states. Sample community content is inserted only by the separate seed command; production pages always read the database.

## Stack

**Client:** JavaScript, React 19, Vite, Tailwind CSS 4, React Router, accessible reusable UI components, Lucide, Motion, TanStack Query, React Hook Form, and Zod.

**Server:** Node.js 22+, Express 5, MongoDB, Mongoose, JWT, bcrypt, Socket.IO, Cloudinary, Zod, Helmet, CORS, and rate limiting.

## Run locally

Prerequisites: Node.js 22 or newer, npm, and Docker with Compose (or a MongoDB replica set / Atlas connection).

```bash
npm ci
cp .env.example .env
```

Generate a strong signing secret and put it in `JWT_SECRET` in `.env`. Do not commit this file:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Start MongoDB and initialize its single-node replica set:

```bash
docker compose up -d mongo mongo-init
```

Wait for MongoDB to elect its primary; normally this takes a few seconds. For an existing MongoDB service, skip Docker and set `MONGODB_URI` to your replica-set connection string instead. A standalone MongoDB server cannot run the transactions used for membership changes.

```bash
npm run dev
```

The client runs on port **5173** and proxies `/api` and `/socket.io` to the server on **3001**. Open your local development server in a browser. Register and complete onboarding to begin. The backend health endpoint is `/api/health`.

Optional community sample data:

```bash
npm run seed
```

Seeding preserves existing users and projects. It inserts six clearly fictional community profiles using the reserved `demo.invalid` email domain, and six example projects. Accounts get random, undisclosed passwords by default. To enable a private demonstration login, provide `SEED_PASSWORD` through your own local or hosting environment **before the first seed**. Never seed shared, publicly known passwords into a production database. Re-running the seed does not reset passwords or modify existing records.

## Commands

| Command              | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `npm ci`             | Install exactly the locked dependency versions                      |
| `npm run dev`        | Run Vite and the API together                                       |
| `npm run build`      | Build the client into `client/dist`                                 |
| `npm start`          | Start Express, serving the built client and Socket.IO               |
| `npm test`           | Run the MongoDB-backed API and Socket.IO integration tests          |
| `npm run test:e2e`   | Run the Playwright browser workflows against a running app          |
| `npm run dev:vercel` | Exercise the Vercel function locally on port 3004                   |
| `npm run verify`     | API tests, frontend build, and browser suite (running app required) |
| `npm run seed`       | Insert optional example community records                           |
| `npm run format`     | Format application source and documentation                         |

The server reads the root `.env` through Node’s built-in environment-file support. Real injected process variables take precedence. Starting `npm start` from the repository root runs the server from its workspace; all paths to the built client are resolved relative to source files.

## Folder structure

```text
client/
  src/
    components/       # Reusable accessible controls, cards, navigation, dialogs
    lib/              # API client, authentication context, shared constants
    pages/            # Landing, auth/onboarding, dashboard, discovery, profiles,
                      # project editor/details, workspace, messaging, notifications
    main.jsx          # Providers and protected/public route trees
    styles.css        # Tailwind entry point, design system, responsive styles
server/
  src/
    controllers/      # Authentication and profile controllers
    middleware/       # JWT authentication and project authorization
    models/           # Ten indexed Mongoose models
    routes/           # Project/workspace and community/messaging REST routes
    services/         # Atomic membership, events, messaging, weighted matching
    sockets/          # Authenticated Socket.IO events
    utils/            # Pagination, ID comparison, safe public profiles
    validators/       # Zod request schemas
    app.js            # Express configuration, discovery/profile/dashboard APIs
    index.js          # Database, HTTP and Socket.IO startup; graceful shutdown
    seed.js           # Optional sample community data
  test/               # MongoDB API and Socket.IO integration tests
e2e/                  # Playwright desktop and mobile workflows
.github/workflows/    # Build, API tests and browser tests
compose.yaml          # Local transactional MongoDB and optional app container
api/index.js          # Vercel serverless entry point for the same Express API
vercel.json           # Existing Vercel project build and API/SPA rewrites
scripts/              # Local serverless-function browser-test harness
Dockerfile            # Multi-stage production image; non-root runtime
render.yaml           # Render single-service deployment blueprint
.env.example          # Configuration names and non-secret examples
```

## Data and API architecture

See [docs/architecture.md](docs/architecture.md) for schemas, API routes, transaction behavior, access controls, and the recommendation formula.

See [docs/deployment.md](docs/deployment.md) for the existing Vercel deployment, optional Render Socket.IO service, Atlas configuration, and verification steps.

## Testing

See [docs/verification.md](docs/verification.md) for the executed checks and the boundaries of local versus live verification.

Start the local MongoDB replica set first. `npm test` uses and **drops only** the isolated databases `collabhub_test_phase1`, `collabhub_test_workflows`, and `collabhub_test_vercel` on the local MongoDB service. Do not point these tests at production.

The tests cover registration, login, private route access, onboarding, profile privacy, project creation/search/filtering, editing authorization, applications, duplicate prevention, concurrent acceptance/capacity enforcement, invitations, task authorization, private message authorization, real-time authenticated delivery, saved projects, resources, notifications, and matching weights.

For browser testing, start `npm run dev`, optionally seed the database, then:

```bash
npx playwright install chromium
npm run test:e2e
```

For a machine with system Chromium:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

The browser tests register disposable accounts, complete onboarding, create a project, create/update a task, reload to verify persistence, add a resource, send a team message, log out/in, verify mobile discovery and page width, and recover a lost session through a real unauthorized API response. Test projects are archived at the end. Mobile search uses the optional CampusLoop seed project, so run `npm run seed` first.

## Deployment status and scope

Deployment configuration is included. A live deployment still requires your hosting account and a MongoDB Atlas connection string. Optional Cloudinary upload calls require your own Cloudinary configuration and have not been validated without those credentials.

This release does not include password reset, email verification, OAuth, moderation tools, end-to-end message encryption, or file attachments. Before using the service with a large public community, add operational monitoring, backup policies, and a moderation process appropriate to your deployment.

## License

MIT — see [LICENSE](LICENSE).
