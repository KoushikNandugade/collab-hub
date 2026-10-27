import { User } from "../models/index.js";
// Session revocation can happen in the Vercel API while sockets live on Render.
export async function emitToAuthorizedUser(io, userId, event, payload) {
  if (!io) return;
  const room = io.sockets.adapter.rooms.get("user:" + userId);
  if (!room?.size) return;
  const user = await User.findById(userId).select("+tokenVersion");
  for (const socketId of [...room]) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;
    if (
      !user ||
      socket.data.sessionVersion !== user.tokenVersion ||
      socket.data.expiresAt <= Date.now()
    ) {
      socket.disconnect(true);
      continue;
    }
    socket.emit(event, payload);
  }
}
