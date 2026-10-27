# Architecture

The Vite client calls same-origin `/api` REST endpoints. Development proxies the API and Socket.IO through Vite. In deployment, Express serves `client/dist` alongside the API and Socket.IO so authentication cookies stay same-origin.

## MongoDB schemas

All models have consistent `createdAt` / `updatedAt` timestamps. Relationships use ObjectId references.

| Model        | Main fields and constraints                                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User         | Unique normalized email; hidden bcrypt password and token version; name, college, graduation year, role, bio, skills, interests, experience, availability, goals, collaboration preference, avatar and portfolio links; onboarding flag     |
| Project      | Owner, members with role IDs, recruiting roles with skills and filled/total positions, title, pitch, description, category/type/difficulty, duration, maximum team size, deadline, mode, availability, image, GitHub URL, resources, status |
| Application  | Project/user references, role ID, introduction, motivation, experience, portfolio and status; unique project/user pair                                                                                                                      |
| Invitation   | Project/sender/recipient references, role ID and state; unique project/recipient pair                                                                                                                                                       |
| Task         | Project/creator/assignee references, title, description, priority, due date and four-stage status                                                                                                                                           |
| Conversation | Direct/project type, participant references, optional project reference, unique normalized direct pair key, last message/time and per-user read timestamps                                                                                  |
| Message      | Conversation and sender references, text and timestamps; indexed by conversation/time                                                                                                                                                       |
| Notification | Recipient, type, text, navigation link and read state; indexed by recipient/read/time                                                                                                                                                       |
| SavedProject | User/project references; unique pair                                                                                                                                                                                                        |
| ActivityLog  | Project, actor, event text and timestamps; indexed by project/time                                                                                                                                                                          |

Projects have full-text, category/status/date, and role-skill indexes. Users have email and skill/role indexes. Applications, conversations, messages, tasks, notifications, and activity have access-pattern indexes. Public profiles omit email, password, token version, and Mongoose version metadata.

## REST API

Success responses contain named resources (`user`, `project`, `task`, `items`, etc.). Errors use `{ "error": "human-readable message" }` with a meaningful HTTP status. Collections use bounded pagination with `page`, `total`, and `pages`.

| Method        | Path                                                     | Purpose / authorization                                                                  |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| GET           | `/api/health`                                            | Database readiness                                                                       |
| POST          | `/api/auth/register`, `/api/auth/login`                  | Rate-limited account/session creation                                                    |
| GET           | `/api/auth/me`                                           | Current authenticated user                                                               |
| POST          | `/api/auth/logout`                                       | Revoke user sessions and disconnect sockets                                              |
| PUT           | `/api/profile`                                           | Validated profile/onboarding update for current user                                     |
| GET           | `/api/dashboard`                                         | Current user’s projects, applications, invitations, recommendations, people and activity |
| GET           | `/api/projects`                                          | Public filtered/searchable/paginated discovery                                           |
| POST          | `/api/projects`                                          | Create a project, owner conversation and initial activity                                |
| GET           | `/api/projects/:id`                                      | Public project details                                                                   |
| PUT / DELETE  | `/api/projects/:id`                                      | Owner-only edit / archive                                                                |
| POST / GET    | `/api/projects/:id/applications`                         | Submit application / owner-only review list                                              |
| PUT           | `/api/applications/:id`                                  | Owner accepts/rejects, applicant withdraws                                               |
| POST          | `/api/projects/:id/invitations`                          | Owner invites a person to an open role                                                   |
| PUT           | `/api/invitations/:id`                                   | Recipient accepts or declines                                                            |
| GET           | `/api/people`, `/api/people/:id`                         | Public people search/profile with project portfolio                                      |
| GET           | `/api/workspace/:id`                                     | Member-only project, tasks, activity and discussion ID                                   |
| POST          | `/api/projects/:id/tasks`                                | Member-only task creation                                                                |
| PUT / DELETE  | `/api/tasks/:id`                                         | Member-only task update / delete                                                         |
| DELETE        | `/api/projects/:id/members/:userId`                      | Owner removes member, frees opening, revokes discussion access, unassigns tasks          |
| POST          | `/api/projects/:id/resources`                            | Member adds a resource link                                                              |
| DELETE        | `/api/projects/:id/resources/:resourceId`                | Member removes a resource link                                                           |
| GET           | `/api/saved`                                             | Current user’s saved projects                                                            |
| POST / DELETE | `/api/saved/:id`                                         | Save / unsave a project                                                                  |
| GET           | `/api/notifications`                                     | Current user’s notification history/unread count                                         |
| PUT           | `/api/notifications/read`, `/api/notifications/:id/read` | Mark all / one owned notification as read                                                |
| GET / POST    | `/api/conversations`                                     | Current user’s conversations / create private direct conversation                        |
| GET / POST    | `/api/conversations/:id/messages`                        | Participant-authorized history / sending                                                 |
| POST          | `/api/uploads`                                           | Authenticated Cloudinary image upload, maximum 5 MB                                      |

Project discovery supports `q`, `category`, `skill`, `difficulty`, `projectType`, `status`, `sort=newest|oldest`, `page`, and `limit`. People discovery supports `q`, `skill`, `availability`, `role`, `page`, and `limit`. Search input is escaped before constructing MongoDB regular expressions.

## Atomic team admission

Application and invitation acceptance run in a MongoDB transaction. The service checks the pending record, decision-maker, recruiting status, recruitment deadline, selected role opening, existing membership, and overall team capacity. It updates membership and role occupancy, changes the application/invitation, adds the person to the project conversation, records activity, and creates notifications within the same transaction.

Competing acceptance requests write the same project document. MongoDB detects a write conflict; transaction retries recheck capacity. Unique indexes prevent duplicate applications, invitations, saved projects, and direct conversations. A MongoDB replica set is mandatory. Atlas supports transactions; the included local Compose setup creates a single-node development replica set.

## Sessions and messaging

JWTs are signed using a host-provided secret, verified with an explicit HS256 algorithm, expire after seven days, and live in HTTP-only SameSite=Lax cookies. Cookies are Secure in production. Logout increments the user’s token version, revoking all their sessions, and disconnects their sockets. Tokens are never placed in localStorage. Mutation requests validate browser origins in addition to cookie protections.

Socket.IO verifies the session cookie at connection and authenticates/authorizes each client operation. Events are `conversation:join`, `message:send`, and `typing`; server events are `message:new` and `typing`. Direct and project messages share the same persistence and permission service as the HTTP API. Delivery uses participant user rooms so removing a project member removes future message delivery. The REST API persists history and stores per-participant read timestamps. Notifications refresh in the app; they are stored events, not hardcoded alerts.

## Explainable matching

Compatibility is a bounded weighted sum:

- Skill overlap: 40% (matched required unique skills / all required unique skills)
- Category interest: 25%
- Availability alignment: 15%
- Experience: 10% (exact level = 1; compatible higher experience = 0.7)
- Collaboration preference: 10%

Missing inputs earn no points. Users who have not completed onboarding receive no match score. The API returns the score, matching reasons, and method. This is a deterministic rule-based recommendation system.
