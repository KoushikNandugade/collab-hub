# End-term submission readiness

Project: **CollabHub**  
Maintainer / student name recorded in the repository: **Koushik Nandugade**  
Repository: https://github.com/KoushikNandugade/collab-hub  
Application: https://collab-hub-phi.vercel.app  
Socket service: https://collab-hub-d51v.onrender.com

A 4-minute 56-second narrated demo is now included at `client/public/demo/CollabHub-Demo.mp4`, with captions, transcript, chapter timestamps, and a public browser player. The official submission form is complete according to the user; its entries and submission time have not been independently checked.

The provided guidelines state **27 October 2026, 11:59 PM IST** as the deadline. This technical readiness record does not certify that submission occurred before that deadline.

## Current result

The implementation and authenticated production workflows have passed hosted verification. The fresh [public-deployment run 40776717573](https://github.com/KoushikNandugade/collab-hub/actions/runs/40776717573) passed on 29 October 2026 IST, including both API/database health endpoints and the public demo player and MP4 download. **Credential rotation remains incomplete:** commit `853c115` added an Atlas URI with a password and a non-placeholder JWT secret to the tracked `.env.example`. Commit `a5b13d8` restored placeholders; this does not revoke those credentials or remove them from history. Hosting/account management access is unavailable to this workspace.

## Requirement mapping

| Guideline                           | Evidence / status                                                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Technology stack                 | MERN with supporting libraries documented in the README; no mandatory stack was imposed.                                                                                                                             |
| 2. Functional application           | Database-backed user actions and four tested browser workflows, rather than a static page.                                                                                                                           |
| 3. Product understanding            | Explicit problem statement, target users, solution, and core workflows in the README.                                                                                                                                |
| 4. Engineering depth                | Sessions, private-resource permissions, transactions, real-time messaging, notifications, and matching.                                                                                                              |
| 5. Application logic                | Application/invitation acceptance enforces role openings and total capacity before granting workspace access.                                                                                                        |
| 6. Persistence                      | Ten indexed Mongoose models; tests verify persistent tasks, resources, membership, and messages.                                                                                                                     |
| 7. Authentication and authorization | Bcrypt, HTTP-only JWT sessions, session revocation, owner/member checks, and origin validation.                                                                                                                      |
| 8. User experience                  | Responsive layouts, navigation, validation, loading/empty/error states; desktop and mobile browser checks.                                                                                                           |
| 9. Error handling                   | Validation, unauthorized requests, missing resources, duplicates, capacity conflicts, failed sessions, and safe startup diagnostics.                                                                                 |
| 10. Security                        | Latest example values are placeholders again. Commit `853c115` exposed database/JWT credentials in history; rotation and account cleanup remain required.                                                            |
| 11. Git and version control         | Genuine commit history, organized workspaces, configuration, and documentation. Initial implementation was one large commit; later history records real improvements.                                                |
| 12. Deployment                      | Both hosting links passed the public deployment check, including database readiness and signed-out protection. Authenticated API and browser workflows also passed in the executed live-acceptance run linked below. |
| 13. README and documentation        | Name, problem, users, solution, features, stack, architecture, setup, environment variables, deployment, testing, and supporting guides present.                                                                     |
| 14. Demo video                      | Narrated 1080p MP4, captions, transcript, chapters, and public browser player are included; the live player/download passed the fresh endpoint check.                                                                |
| 15. AI use                          | Permitted by the guidelines; assistance and maintainer responsibility documented in engineering decisions.                                                                                                           |
| 16. Originality                     | Built for this project from an empty repository using declared open-source packages; no claim of an independent plagiarism audit.                                                                                    |
| 17. Incomplete-project exclusions   | Implemented recruitment and collaboration workflows go beyond a landing page, mock UI, basic CRUD, or API wrapper. Core production workflows passed the executed live-acceptance run.                                |
| 18. Scope                           | Five central product workflows identified in the README; optional Cloudinary uploads have a separate verification boundary.                                                                                          |
| 19. Evaluation                      | Evidence is mapped to the stated evaluation areas; no grade or evaluator acceptance is predicted.                                                                                                                    |
| 20. Final submission                | Project details are available in the README and this file. Form completion is user-reported; excluded from this task.                                                                                                |
| 21. Final checklist                 | Technical checks and remaining account-level items are recorded below.                                                                                                                                               |

## Verification evidence

- [Fresh successful GitHub Actions run](https://github.com/KoushikNandugade/collab-hub/actions/runs/40776717629) at commit `a5b13d8`: API tests, build, and both browser suites passed; the job completed in 1 minute 32 seconds.
- API suite: 22 tests passed with no failures or skips.
- Browser suite: four scenarios passed on Vite/Express, and the same four passed through the function harness.
- [Architecture and API](architecture.md), [engineering decisions](engineering-decisions.md), [deployment instructions](deployment.md), and [verification boundaries](verification.md).
- [Fresh public-deployment run 40776717573](https://github.com/KoushikNandugade/collab-hub/actions/runs/40776717573) passed all eight endpoint checks, including both API health endpoints, Render transport/CORS, the demo player, and MP4 download.
- [Executed live acceptance run 40604285227](https://github.com/KoushikNandugade/collab-hub/actions/runs/40604285227) passed all seven checks, including the actual browser UI, cross-host messaging, logout revocation, and test-project archival.

## Final checklist

- [x] Functional application with meaningful recruitment and collaboration workflows.
- [x] Explicit problem, users, solution, and five central workflows.
- [x] Persistent data, access checks, transactions, and relevant failure handling.
- [x] Public source, genuine Git history, project configuration, and documentation.
- [x] Restore non-secret placeholders in the latest tracked `.env.example`.
- [ ] Rotate the database password and JWT secret exposed in commit `853c115`; the historical commit still contains the old values.
- [x] Both deployment links and the authenticated live workflows verified.
- [x] Demo video is bundled in the project, linked in the README, and publicly downloadable.
- [x] Submission form complete according to the user; not changed or independently reviewed here.
- [ ] Save replacement `MONGODB_URI` and a new identical `JWT_SECRET` in Vercel Production and Render, redeploy both, verify health/login/messaging, and retire the exposed database credential.
- [ ] Revoke the previously shared Render account API key.

The credential operations require the account owner's signed-in settings or secure management access. Editing `.env.example` does not configure either hosting service. After revocation, review GitHub's sensitive-data removal procedure for repository history; do not treat deleting values from the latest file as complete remediation. See [SECURITY.md](../SECURITY.md) for the staged procedure. Current API/database health is verified; this does not establish that replacement values have been applied. Do not paste secret values into chat. Optional Cloudinary upload verification remains outside the five core workflows and requires its account configuration.
