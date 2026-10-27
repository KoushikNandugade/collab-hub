# Engineering decisions

## Product and scope

The product connects project owners with collaborators and supports the work after recruitment. Its five central workflows are onboarding, discovery/application, team admission, private workspace collaboration, and communication. Payment processing, AI models, queues, and scheduling were not added because they are unnecessary for those workflows.

## React and Express

React handles routing, forms, and interactive workspace state. TanStack Query manages remote data and cache invalidation. Express exposes the same validated REST API in local development, standalone Node hosting, and the Vercel function, keeping authorization rules in the server instead of relying on hidden frontend controls.

## MongoDB and transactions

MongoDB models the project's users, openings, membership, tasks, and conversations. Applications and invitations need more than CRUD: admitting a member changes several related records and must not overfill a role. Admission runs in a transaction with capacity rechecks and unique indexes. A replica set is therefore required; Atlas and the supplied local setup support it.

## Sessions and permissions

Passwords are bcrypt-hashed. HTTP-only session cookies reduce direct access to session tokens from client JavaScript; production cookies are Secure. The server checks ownership and membership for private resources. Logout increments a session version to revoke existing sessions. Mutation requests validate browser origins. Client-side protected routes improve navigation but do not replace server authorization.

## Split hosting and sockets

The existing Vercel domain is retained for the application and same-origin API. A normal Render Node Web Service hosts persistent Socket.IO connections, which a Vercel function cannot maintain. The Vercel API issues short-lived socket tokens after checking the session. Both hosts share the database and signing secret. Persisted messages can still refresh every five seconds when live sockets are unavailable.

This arrangement requires separate environment settings on both hosts and verification of Render's allowed browser origin. Render free-tier sleep can delay reconnection. These are operational tradeoffs, not evidence that a published deployment has been verified.

## Matching and optional integrations

Matching uses explicit weights for skills, interests, availability, experience, and collaboration preference. It is explainable and deterministic; it is not a trained AI model. Cloudinary is optional for uploaded images, and HTTPS image URL fields work independently. Uploads must be validated with an actual Cloudinary account before claiming that integration is operational.

## Verification strategy

API tests exercise sessions, permissions, transactional admission, persistence, and socket behavior. Four browser scenarios run against Vite/Express and the Vercel function harness. A separate read-only public-deployment check verifies hosted HTTP readiness and socket transport/CORS. It does not replace authenticated live browser tests. A separate opt-in live-acceptance workflow uses two labeled accounts with random, undisclosed passwords, verifies the published workflows and browser UI, then archives its test project. The profiles remain because account deletion is outside this version’s scope; no credentials or browser traces are included in the report.

CI uses a MongoDB-compatible Ubuntu runner and creates an empty ignored `.env` for Node 22's development watcher. Values remain injected by the workflow. See [verification.md](verification.md).

## Originality, libraries, and AI assistance

CollabHub was built from an initially empty project repository for this application. No existing product repository was used as an application template. It depends on open-source packages declared in the manifests and lockfile, including React, Express, Mongoose, Socket.IO, Tailwind, and the testing tools; their licenses remain applicable.

AI assistance was used for implementation, debugging, testing, and documentation. The supplied end-term guidelines permit that use. Understanding the design, demonstrating the workflows, protecting credentials, and maintaining the final product remain the maintainer's responsibility.

The initial functional application was committed together. Subsequent genuine commits record container, serverless hosting, session handling, deployment diagnostics, documentation, and CI changes. History has been preserved rather than rewritten to imply a development sequence that did not occur.
