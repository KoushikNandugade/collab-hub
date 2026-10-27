# Security

## Reporting a vulnerability

Do not include exploit details, credentials, private messages, or personal data in public issues.

If GitHub private vulnerability reporting is enabled, use **Security → Advisories → Report a vulnerability** in this repository. Otherwise, use a private contact method listed on the [maintainer's GitHub profile](https://github.com/KoushikNandugade). If no private channel is available, open an issue requesting a private reporting channel without disclosing vulnerability details.

Include affected functionality, reproduction steps, potential impact, and a minimal redacted example. Response times are not guaranteed.

## Secrets and deployment

- Store connection strings and signing secrets in private environment settings. `.env` files are excluded from Git; `.env.example` contains examples only.
- Never expose server credentials through `VITE_` variables, client bundles, logs, screenshots, or issue attachments.
- Rotate exposed database passwords, signing secrets, and hosting API keys. Updating Git history alone does not revoke a leaked credential.
- Keep MongoDB network access and database-user permissions appropriate to the deployment. Keep TLS verification enabled.
- Vercel and Render require the same database and JWT signing secret for linked socket sessions.
- Logout revokes the user's existing sessions. Changing the shared signing secret invalidates sessions for all users.

## Retiring credentials previously shared outside secure settings

For the application database, create a replacement Atlas database user/password restricted to the application database, then update `MONGODB_URI` securely on both Vercel Production and Render. Redeploy both, check their health, and verify a signed-in workflow before retiring the old application credential. Confirm the old user is not needed by another application before removing it. Keep `JWT_SECRET` identical on both hosts; changing it is a separate session-revocation operation.

Revoke the previously shared Render account API key in the account's API-key settings. A normal dashboard-managed Web Service does not need that key as an application environment variable. Do not merely delete a key from chat or Git and assume it has been revoked.

This repository documents the procedure; rotation is complete only when the corresponding Atlas and Render account operations have actually succeeded. Enter replacement values in secure account settings, never in issues or source files.

## Scope and limitations

The application uses HTTP-only cookies, production Secure cookies, origin checks for mutations, password hashing, schema validation, and access checks for private resources. These controls do not constitute an independent security audit.

Password reset, email verification, moderation, end-to-end message encryption, and file attachments are outside this version's scope. Review authentication, operational monitoring, backups, and abuse handling before expanding public usage.
