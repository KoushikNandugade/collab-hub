import { Project, Conversation } from "../models/index.js";
import { fail, idEquals } from "../utils/index.js";
import { notify, activity } from "./events.js";
export async function admitMember(projectId, userId, roleId, actorId, session) {
  const project = await Project.findById(projectId).session(session);
  if (!project) throw fail(404, "Project not found.");
  if (project.status !== "recruiting")
    throw fail(409, "This project is not recruiting.");
  if (project.deadline && project.deadline < new Date())
    throw fail(409, "The recruitment deadline has passed.");
  if (
    idEquals(project.owner, userId) ||
    project.members.some((m) => idEquals(m.user, userId))
  )
    throw fail(409, "This person is already a member.");
  const role = project.roles.id(roleId);
  if (!role || role.filled >= role.positions)
    throw fail(409, "This role has no open positions.");
  if (project.members.length + 1 >= project.maxTeamSize)
    throw fail(409, "The team is at capacity.");
  project.members.push({ user: userId, role: role.title, roleId: role._id });
  role.filled += 1;
  project.admissionVersion += 1;
  await project.save({ session });
  await Conversation.updateOne(
    { project: project._id },
    { $addToSet: { participants: userId } },
    { session },
  );
  await notify(
    userId,
    "application-decision",
    `You joined ${project.title}!`,
    "/app/workspace/" + project._id,
    session,
  );
  await activity(
    project._id,
    actorId,
    "A new collaborator joined the team.",
    session,
  );
  return project;
}
