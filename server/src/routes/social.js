import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import {
  User,
  Project,
  Invitation,
  Conversation,
  Message,
  Notification,
  SavedProject,
} from "../models/index.js";
import { member } from "../middleware/auth.js";
import { admitMember } from "../services/membership.js";
import { notify } from "../services/events.js";
import { allowedConversation, sendMessage } from "../services/messages.js";
import { fail, idEquals, pageParams } from "../utils/index.js";
import { parse } from "../validators/index.js";
export function socialRoutes() {
  const r = Router();
  r.post("/projects/:id/invitations", async (req, res) => {
    const p = await member(req.params.id, req.user._id, true);
    const { recipient, roleId } = parse(
      z.object({
        recipient: z.string().regex(/^[a-f\d]{24}$/i),
        roleId: z.string().regex(/^[a-f\d]{24}$/i),
      }),
      req.body,
    );
    if (!(await User.exists({ _id: recipient })))
      throw fail(404, "User not found.");
    if (
      idEquals(recipient, req.user._id) ||
      p.members.some((m) => idEquals(m.user, recipient))
    )
      throw fail(409, "This person is already on the team.");
    const role = p.roles.id(roleId);
    if (
      p.status !== "recruiting" ||
      !role ||
      role.filled >= role.positions ||
      p.members.length + 1 >= p.maxTeamSize
    )
      throw fail(409, "This project has no opening for the selected role.");
    let invitation;
    await mongoose.connection.transaction(async (session) => {
      [invitation] = await Invitation.create(
        [{ project: p._id, sender: req.user._id, recipient, roleId }],
        { session },
      );
      await notify(
        recipient,
        "invitation",
        `${req.user.name} invited you to ${p.title}.`,
        "/app",
        session,
      );
    });
    res.status(201).json({ invitation });
  });
  r.put("/invitations/:id", async (req, res) => {
    const { decision } = parse(
      z.object({ decision: z.enum(["accepted", "rejected"]) }),
      req.body,
    );
    let result;
    await mongoose.connection.transaction(async (session) => {
      const i = await Invitation.findById(req.params.id).session(session);
      if (!i) throw fail(404, "Invitation not found.");
      if (!idEquals(i.recipient, req.user._id))
        throw fail(403, "This invitation is not yours.");
      if (i.status !== "pending")
        throw fail(409, "This invitation has already been decided.");
      if (decision === "accepted")
        await admitMember(
          i.project,
          req.user._id,
          i.roleId,
          req.user._id,
          session,
        );
      i.status = decision;
      await i.save({ session });
      await notify(
        i.sender,
        "invitation",
        `${req.user.name} ${decision} your invitation.`,
        "/app/workspace/" + i.project,
        session,
      );
      result = i;
    });
    res.json({ invitation: result });
  });
  r.get("/saved", async (req, res) => {
    const items = await SavedProject.find({ user: req.user._id })
      .populate({
        path: "project",
        populate: { path: "owner", select: "name avatar role" },
      })
      .sort({ createdAt: -1 });
    res.json({
      items: items
        .filter((s) => s.project && s.project.status !== "archived")
        .map((s) => s.project),
    });
  });
  r.post("/saved/:id", async (req, res) => {
    if (!(await Project.exists({ _id: req.params.id })))
      throw fail(404, "Project not found.");
    await SavedProject.updateOne(
      { user: req.user._id, project: req.params.id },
      { $setOnInsert: { user: req.user._id, project: req.params.id } },
      { upsert: true },
    );
    res.json({ ok: true });
  });
  r.delete("/saved/:id", async (req, res) => {
    await SavedProject.deleteOne({
      user: req.user._id,
      project: req.params.id,
    });
    res.json({ ok: true });
  });
  r.get("/notifications", async (req, res) => {
    const { page, limit } = pageParams(req.query);
    const [items, unread, total] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments({ user: req.user._id, read: false }),
      Notification.countDocuments({ user: req.user._id }),
    ]);
    res.json({ items, unread, total, page, pages: Math.ceil(total / limit) });
  });
  r.put("/notifications/read", async (req, res) => {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } },
    );
    res.json({ ok: true });
  });
  r.put("/notifications/:id/read", async (req, res) => {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
    );
    if (!n) throw fail(404, "Notification not found.");
    res.json({ ok: true });
  });
  r.get("/conversations", async (req, res) => {
    const items = await Conversation.find({ participants: req.user._id })
      .populate("participants", "name avatar role")
      .populate("project", "title")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(50);
    const result = await Promise.all(
      items.map(async (c) => ({
        ...c.toJSON(),
        unread: await Message.countDocuments({
          conversation: c._id,
          sender: { $ne: req.user._id },
          createdAt: { $gt: c.readAt.get(String(req.user._id)) || new Date(0) },
        }),
      })),
    );
    res.json({ items: result });
  });
  r.post("/conversations", async (req, res) => {
    const { recipient } = parse(
      z.object({ recipient: z.string().regex(/^[a-f\d]{24}$/i) }),
      req.body,
    );
    if (idEquals(recipient, req.user._id))
      throw fail(400, "Choose another collaborator.");
    if (!(await User.exists({ _id: recipient })))
      throw fail(404, "User not found.");
    const key = [recipient, String(req.user._id)].sort().join(":");
    const c = await Conversation.findOneAndUpdate(
      { directKey: key },
      {
        $setOnInsert: {
          kind: "direct",
          participants: [recipient, req.user._id],
          directKey: key,
        },
      },
      { upsert: true, new: true },
    );
    res.json({ conversation: c });
  });
  r.get("/conversations/:id/messages", async (req, res) => {
    const c = await allowedConversation(req.params.id, req.user._id);
    const { page, limit } = pageParams({
      ...req.query,
      limit: req.query.limit || 50,
    });
    const filter = { conversation: c._id };
    const [items, total] = await Promise.all([
      Message.find(filter)
        .populate("sender", "name avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Message.countDocuments(filter),
    ]);
    await Conversation.updateOne(
      { _id: c._id },
      { $set: { [`readAt.${req.user._id}`]: new Date() } },
    );
    res.json({
      items: items.reverse(),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  });
  r.post("/conversations/:id/messages", async (req, res) =>
    res
      .status(201)
      .json({
        message: await sendMessage(
          req.params.id,
          req.user,
          req.body.text,
          req.app.get("io"),
        ),
      }),
  );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
      cb(
        null,
        ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype),
      );
    },
  });
  r.post("/uploads", upload.single("image"), async (req, res) => {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    )
      throw fail(
        503,
        "Image uploads need Cloudinary configuration. You can use an image URL instead.",
      );
    if (!req.file)
      throw fail(400, "Choose a JPEG, PNG, or WebP image under 5 MB.");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "collabhub",
            resource_type: "image",
            allowed_formats: ["jpg", "png", "webp"],
            transformation: [{ width: 1600, height: 1200, crop: "limit" }],
          },
          (error, result) => (error ? reject(error) : resolve(result)),
        )
        .end(req.file.buffer);
    });
    res.status(201).json({ url: result.secure_url });
  });
  return r;
}
