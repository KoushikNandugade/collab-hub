import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { emitToAuthorizedUser } from "../services/socket-delivery.js";
import { authenticateToken } from "../middleware/auth.js";
import { allowedConversation, sendMessage } from "../services/messages.js";
export function attachSockets(server, secret, origin, app) {
  const io = new Server(server, {
    cors: { origin, credentials: true },
    maxHttpBufferSize: 16384,
  });
  app?.set("io", io);
  io.use(async (socket, next) => {
    try {
      const cookie = (socket.handshake.headers.cookie || "")
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("collabhub_session="));
      socket.realtimeToken = Boolean(socket.handshake.auth?.token);
      socket.token =
        socket.handshake.auth?.token ||
        cookie?.slice("collabhub_session=".length);
      socket.user = await authenticateToken(socket.token, secret, {
        realtime: socket.realtimeToken,
      });
      next();
    } catch {
      next(new Error("Please sign in."));
    }
  });
  io.on("connection", (socket) => {
    socket.data.sessionVersion = socket.user.tokenVersion;
    socket.data.expiresAt = jwt.decode(socket.token).exp * 1000;
    socket.join("user:" + socket.user._id);
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.max(1, jwt.decode(socket.token).exp * 1000 - Date.now()),
    );
    expiry.unref();
    socket.on("disconnect", () => clearTimeout(expiry));
    let sent = 0;
    let windowStart = Date.now();
    const safely =
      (handler) =>
      async (payload = {}, ack = () => {}) => {
        try {
          socket.user = await authenticateToken(socket.token, secret, {
            realtime: socket.realtimeToken,
          });
          await handler(payload, ack);
        } catch (e) {
          if (typeof ack === "function")
            ack({
              error: e.status ? e.message : "Unable to process this event.",
            });
        }
      };
    socket.on(
      "conversation:join",
      safely(async ({ conversationId }, ack) => {
        await allowedConversation(conversationId, socket.user._id);
        socket.join("conversation:" + conversationId);
        if (typeof ack === "function") ack({ ok: true });
      }),
    );
    socket.on(
      "message:send",
      safely(async ({ conversationId, text }, ack) => {
        if (Date.now() - windowStart > 60000) {
          sent = 0;
          windowStart = Date.now();
        }
        if (++sent > 60) {
          if (typeof ack === "function")
            ack({ error: "Please slow down and try again shortly." });
          return;
        }
        const message = await sendMessage(
          conversationId,
          socket.user,
          text,
          io,
        );
        if (typeof ack === "function") ack({ message });
      }),
    );
    let lastTyping = 0;
    socket.on(
      "typing",
      safely(async ({ conversationId, typing }) => {
        if (Date.now() - lastTyping < 500) return;
        lastTyping = Date.now();
        const c = await allowedConversation(conversationId, socket.user._id);
        for (const p of c.participants)
          if (String(p) !== String(socket.user._id))
            await emitToAuthorizedUser(io, p, "typing", {
              conversationId,
              user: socket.user.name,
              typing: !!typing,
            });
      }),
    );
  });
  return io;
}
