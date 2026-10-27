import { Conversation, Message } from "../models/index.js";
import { member } from "../middleware/auth.js";
import { fail, idEquals } from "../utils/index.js";
import { notify } from "./events.js";
import { emitToAuthorizedUser } from "./socket-delivery.js";
export async function allowedConversation(id, userId) {
  const c = await Conversation.findById(id);
  if (!c) throw fail(404, "Conversation not found.");
  if (!c.participants.some((p) => idEquals(p, userId)))
    throw fail(403, "This conversation is private.");
  if (c.project) await member(c.project, userId);
  return c;
}
export async function sendMessage(conversationId, user, text, io) {
  if (typeof text !== "string" || !text.trim() || text.trim().length > 4000)
    throw fail(400, "Messages must contain 1 to 4000 characters.");
  const c = await allowedConversation(conversationId, user._id);
  const message = await Message.create({
    conversation: c._id,
    sender: user._id,
    text: text.trim(),
  });
  await Conversation.updateOne(
    { _id: c._id },
    {
      $set: {
        lastMessage: message.text,
        lastMessageAt: message.createdAt,
        [`readAt.${user._id}`]: new Date(),
      },
    },
  );
  await message.populate("sender", "name avatar");
  for (const id of c.participants) {
    await emitToAuthorizedUser(io, id, "message:new", message);
    if (!idEquals(id, user._id))
      await notify(
        id,
        "message",
        `${user.name}: ${message.text.slice(0, 80)}`,
        "/app/messages?conversation=" + c._id,
      );
  }
  return message;
}
