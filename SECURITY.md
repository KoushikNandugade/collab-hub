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

## Scope and limitations

The application uses HTTP-only cookies, production Secure cookies, origin checks for mutations, password hashing, schema validation, and access checks for private resources. These controls do not constitute an independent security audit.

Password reset, email verification, moderation, end-to-end message encryption, and file attachments are outside this version's scope. Review authentication, operational monitoring, backups, and abuse handling before expanding public usage.
