# Demo and acceptance checklist

Use your own test accounts. The steps create real records, so use a development database for repeatable practice. Seed content is optional and does not provide public login credentials.

## Preflight

1. Both hosting services have matching `MONGODB_URI` and `JWT_SECRET` values.
2. Vercel has `REALTIME_URL=https://collab-hub-d51v.onrender.com`.
3. Render has `CLIENT_ORIGIN=https://collab-hub-phi.vercel.app`.
4. Both `/api/health` endpoints return HTTP 200 with `status: "ok"`.
5. Open the Vercel app in two separate browser profiles or a normal and private window.

## Owner account

1. Register and complete onboarding with skills, interests, and availability.
2. Create a project with a clear pitch and an open team role.
3. Open its workspace and create a task, then move it to Review.
4. Reload and confirm the task remains in Review.
5. Add a resource link and a project discussion message.

## Collaborator account

1. Register in the second browser and complete onboarding.
2. Find the owner's project through discovery and review its open role.
3. Save the project, then apply for that role.
4. Switch to the owner account and accept the application.
5. Return to the collaborator account and confirm access to the private workspace and updated team membership.

## Messaging and access checks

1. Send project and direct messages between the accounts.
2. With Render connected, confirm **Live conversation**, immediate delivery, and typing indicators. Otherwise, confirm messages appear through periodic refresh.
3. Reload and verify message history is preserved.
4. Confirm notifications and unread counts update as events occur.
5. Log out. Protected pages should require login; a signed-out API call to `/api/auth/me` should return 401.
6. Sign in again and confirm account and project data remain available.

## Presentation notes

Explain the React frontend, Express REST API, MongoDB persistence and transactions, and persistent Socket.IO service. Recommendations are weighted rules, not a trained AI model. Describe the application's actual verification status; successful deployment alone does not establish that runtime configuration is healthy.

Cloudinary upload can be shown only after its optional credentials and upload behavior have been verified. Render's free service can take time to wake after inactivity, so open its health endpoint before beginning a demonstration.
