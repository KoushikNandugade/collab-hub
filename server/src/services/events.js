import { Notification, ActivityLog } from "../models/index.js";
export async function notify(user, type, text, link, session) {
  return (
    await Notification.create(
      [{ user, type, text, link }],
      session ? { session } : {},
    )
  )[0];
}
export async function activity(project, actor, text, session) {
  return (
    await ActivityLog.create(
      [{ project, actor, text }],
      session ? { session } : {},
    )
  )[0];
}
