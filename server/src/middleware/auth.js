import jwt from "jsonwebtoken";
import { User, Project } from "../models/index.js";
import { fail, idEquals } from "../utils/index.js";
export async function authenticateToken(
  token,
  secret,
  { realtime = false } = {},
) {
  try {
    const payload = jwt.verify(token || "", secret, {
      algorithms: ["HS256"],
      ...(realtime ? { audience: "collabhub-realtime" } : {}),
    });
    if (!realtime && payload.aud) throw new Error();
    const user = await User.findById(payload.sub).select("+tokenVersion");
    if (!user || user.tokenVersion !== payload.v) throw new Error();
    return user;
  } catch {
    throw fail(401, "Please sign in to continue.");
  }
}
export const auth = (secret) => async (req, res, next) => {
  req.user = await authenticateToken(req.cookies.collabhub_session, secret);
  next();
};
export async function member(projectId, userId, ownerOnly = false) {
  const project = await Project.findById(projectId)
    .populate("owner", "name avatar role")
    .populate("members.user", "name avatar role");
  if (!project) throw fail(404, "Project not found.");
  if (
    !idEquals(project.owner, userId) &&
    (ownerOnly || !project.members.some((m) => idEquals(m.user, userId)))
  )
    throw fail(403, "You do not have access to this project.");
  return project;
}
