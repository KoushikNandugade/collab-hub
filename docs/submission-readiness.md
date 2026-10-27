# End-term submission readiness

Project: **CollabHub**  
Maintainer / student name recorded in the repository: **Koushik Nandugade**  
Repository: https://github.com/KoushikNandugade/collab-hub  
Application: https://collab-hub-phi.vercel.app  
Socket service: https://collab-hub-d51v.onrender.com

The user confirmed the demo video and official submission form are already complete. This task does not record, edit, or submit them. Their links and completion time have not been independently checked.

The provided guidelines state **27 October 2026, 11:59 PM IST** as the deadline. This technical readiness record does not certify that submission occurred before that deadline.

## Requirement mapping

| Guideline                           | Evidence / status                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Technology stack                 | MERN with supporting libraries documented in the README; no mandatory stack was imposed.                                                                                             |
| 2. Functional application           | Database-backed user actions and four tested browser workflows, rather than a static page.                                                                                           |
| 3. Product understanding            | Explicit problem statement, target users, solution, and core workflows in the README.                                                                                                |
| 4. Engineering depth                | Sessions, private-resource permissions, transactions, real-time messaging, notifications, and matching.                                                                              |
| 5. Application logic                | Application/invitation acceptance enforces role openings and total capacity before granting workspace access.                                                                        |
| 6. Persistence                      | Ten indexed Mongoose models; tests verify persistent tasks, resources, membership, and messages.                                                                                     |
| 7. Authentication and authorization | Bcrypt, HTTP-only JWT sessions, session revocation, owner/member checks, and origin validation.                                                                                      |
| 8. User experience                  | Responsive layouts, navigation, validation, loading/empty/error states; desktop and mobile browser checks.                                                                           |
| 9. Error handling                   | Validation, unauthorized requests, missing resources, duplicates, capacity conflicts, failed sessions, and safe startup diagnostics.                                                 |
| 10. Security                        | Secrets excluded from Git and known-value history checks clean. Rotation of previously shared credentials still needs account access or user confirmation.                           |
| 11. Git and version control         | Genuine commit history, organized workspaces, configuration, and documentation. Initial implementation was one large commit; later history records real improvements.                |
| 12. Deployment                      | Both hosting links exist. Latest known Vercel runtime configuration error requires a successful public check and authenticated live verification before marking production complete. |
| 13. README and documentation        | Name, problem, users, solution, features, stack, architecture, setup, environment variables, deployment, testing, and supporting guides present.                                     |
| 14. Demo video                      | Complete according to the user; excluded from this task.                                                                                                                             |
| 15. AI use                          | Permitted by the guidelines; assistance and maintainer responsibility documented in engineering decisions.                                                                           |
| 16. Originality                     | Built for this project from an empty repository using declared open-source packages; no claim of an independent plagiarism audit.                                                    |
| 17. Incomplete-project exclusions   | Implemented recruitment and collaboration workflows go beyond a landing page, mock UI, basic CRUD, or API wrapper. Production readiness still requires live verification.            |
| 18. Scope                           | Five central product workflows identified in the README; optional Cloudinary uploads have a separate verification boundary.                                                          |
| 19. Evaluation                      | Evidence is mapped to the stated evaluation areas; no grade or evaluator acceptance is predicted.                                                                                    |
| 20. Final submission                | Project details are available in the README and this file. Form completion is user-reported; excluded from this task.                                                                |
| 21. Final checklist                 | Technical checks and remaining account-level items are recorded below.                                                                                                               |

## Verification evidence

- [Successful GitHub Actions run](https://github.com/KoushikNandugade/collab-hub/actions/runs/40594581510) at commit `b8550ab`: API tests, build, and both browser suites passed.
- API suite: 22 tests passed with no failures or skips.
- Browser suite: four scenarios passed on Vite/Express, and the same four passed through the function harness.
- [Architecture and API](architecture.md), [engineering decisions](engineering-decisions.md), [deployment instructions](deployment.md), and [verification boundaries](verification.md).
- Public-deployment report: produced by **Verify public deployment** in GitHub Actions; this record must reflect its actual result before declaring the published service verified.

## Remaining account-level checks

1. Verify both public health endpoints, project discovery, signed-out access protection, and Render transport/CORS with the public-deployment workflow.
2. Resolve any actual hosting variable/access failure, then check signed-in recruitment, workspace persistence, and two-account messaging on the public application.
3. Replace previously shared application database credentials on both hosts, validate the deployments, then retire the old credential. Revoke the previously shared Render API key. See [security guidance](../SECURITY.md).

These steps are not marked complete without evidence. Demo video and submission-form work remain outside this task as requested.
