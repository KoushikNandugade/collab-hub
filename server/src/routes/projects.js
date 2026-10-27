import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import {
  Project,
  Application,
  Task,
  Conversation,
  ActivityLog,
} from "../models/index.js";
import { member } from "../middleware/auth.js";
import {
  parse,
  project as projectSchema,
  application,
  task as taskSchema,
} from "../validators/index.js";
import { fail, idEquals, pageParams } from "../utils/index.js";
import { notify, activity } from "../services/events.js";
import { admitMember } from "../services/membership.js";
export function projectRoutes() {
  const r = Router();
  r.post("/projects", async (req, res) => {
    const fields = parse(projectSchema, req.body);
    let result;
    await mongoose.connection.transaction(async (session) => {
      [result] = await Project.create([{ ...fields, owner: req.user._id }], {
        session,
      });
      await Conversation.create(
        [
          {
            kind: "project",
            project: result._id,
            participants: [req.user._id],
          },
        ],
        { session },
      );
      await activity(result._id, req.user._id, "Created the project.", session);
    });
    res.status(201).json({ project: result });
  });
  r.put("/projects/:id", async (req, res) => {
    const fields = parse(projectSchema, req.body);
    let updated;
    await mongoose.connection.transaction(async (session) => {
      const current = await Project.findById(req.params.id).session(session);
      if (!current) throw fail(404, "Project not found.");
      if (!idEquals(current.owner, req.user._id))
        throw fail(403, "Only the project owner can edit this project.");
      if (fields.maxTeamSize < current.members.length + 1)
        throw fail(409, "Team size cannot be smaller than current membership.");
      const roles = fields.roles.map((role) => ({
        ...role,
        filled: role._id ? current.roles.id(role._id)?.filled || 0 : 0,
      }));
      for (const role of current.roles) {
        if (
          role.filled &&
          (!roles.some((r) => r._id === String(role._id)) ||
            roles.find((r) => r._id === String(role._id)).positions <
              role.filled)
        )
          throw fail(
            409,
            "An occupied role cannot be removed or reduced below its membership.",
          );
      }
      Object.assign(current, fields, { roles });
      await current.save({ session });
      for (const m of current.members)
        await notify(
          m.user,
          "project-update",
          `${current.title} was updated.`,
          "/projects/" + current._id,
          session,
        );
      await activity(
        current._id,
        req.user._id,
        "Updated project details.",
        session,
      );
      updated = current;
    });
    res.json({ project: updated });
  });
  r.delete("/projects/:id", async (req, res) => {
    await member(req.params.id, req.user._id, true);
    await Project.updateOne(
      { _id: req.params.id },
      { $set: { status: "archived" } },
    );
    await activity(req.params.id, req.user._id, "Archived the project.");
    res.json({
      ok: true,
      message: "Project archived. Its workspace and history are preserved.",
    });
  });
  r.post("/projects/:id/applications", async (req, res) => {
    const fields = parse(application, req.body);
    const p = await Project.findById(req.params.id);
    if (!p) throw fail(404, "Project not found.");
    if (p.status !== "recruiting" || (p.deadline && p.deadline < new Date()))
      throw fail(409, "This project is not accepting applications.");
    if (
      idEquals(p.owner, req.user._id) ||
      p.members.some((m) => idEquals(m.user, req.user._id))
    )
      throw fail(409, "You are already on this team.");
    const role = p.roles.id(fields.roleId);
    if (
      !role ||
      role.filled >= role.positions ||
      p.members.length + 1 >= p.maxTeamSize
    )
      throw fail(409, "This role or team has no opening.");
    let result;
    await mongoose.connection.transaction(async (session) => {
      [result] = await Application.create(
        [{ ...fields, project: p._id, user: req.user._id }],
        { session },
      );
      await notify(
        p.owner,
        "application",
        `${req.user.name} applied to ${p.title}.`,
        "/app/workspace/" + p._id + "?tab=applications",
        session,
      );
    });
    res.status(201).json({ application: result });
  });
  r.get("/projects/:id/applications", async (req, res) => {
    await member(req.params.id, req.user._id, true);
    const { page, limit } = pageParams(req.query);
    const filter = { project: req.params.id };
    const [items, total] = await Promise.all([
      Application.find(filter)
        .populate("user", "name avatar role skills bio portfolio")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Application.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  });
  r.put("/applications/:id", async (req, res) => {
    const { decision } = parse(
      z.object({ decision: z.enum(["accepted", "rejected", "withdrawn"]) }),
      req.body,
    );
    let result;
    await mongoose.connection.transaction(async (session) => {
      const a = await Application.findById(req.params.id).session(session);
      if (!a) throw fail(404, "Application not found.");
      if (a.status !== "pending")
        throw fail(409, "This application has already been decided.");
      if (decision === "withdrawn") {
        if (!idEquals(a.user, req.user._id))
          throw fail(403, "This application is not yours.");
      } else {
        const p = await Project.findById(a.project).session(session);
        if (!p || !idEquals(p.owner, req.user._id))
          throw fail(403, "Only the project owner can decide applications.");
        if (decision === "accepted")
          await admitMember(a.project, a.user, a.roleId, req.user._id, session);
        else
          await notify(
            a.user,
            "application-decision",
            `Your application to ${p.title} was not selected.`,
            "/projects/" + p._id,
            session,
          );
      }
      a.status = decision;
      await a.save({ session });
      result = a;
    });
    res.json({ application: result });
  });
  r.get("/workspace/:id", async (req, res) => {
    const project = await member(req.params.id, req.user._id);
    const [tasks, logs, conversation] = await Promise.all([
      Task.find({ project: project._id })
        .populate("assignee", "name avatar")
        .sort({ createdAt: -1 }),
      ActivityLog.find({ project: project._id })
        .populate("actor", "name avatar")
        .sort({ createdAt: -1 })
        .limit(50),
      Conversation.findOne({ project: project._id }).select("_id"),
    ]);
    res.json({ project, tasks, activity: logs, conversation });
  });
  r.post("/projects/:id/tasks", async (req, res) => {
    const p = await member(req.params.id, req.user._id);
    const fields = parse(taskSchema, req.body);
    validateAssignee(p, fields.assignee);
    const task = await Task.create({
      ...fields,
      project: p._id,
      creator: req.user._id,
    });
    if (fields.assignee)
      await notify(
        fields.assignee,
        "task-assignment",
        `You were assigned: ${task.title}`,
        "/app/workspace/" + p._id + "?tab=tasks",
      );
    await activity(p._id, req.user._id, `Created task: ${task.title}`);
    res.status(201).json({ task });
  });
  r.put("/tasks/:id", async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) throw fail(404, "Task not found.");
    const p = await member(task.project, req.user._id);
    const fields = parse(taskSchema, {
      ...task.toObject(),
      assignee: task.assignee ? String(task.assignee) : "",
      dueDate: task.dueDate?.toISOString() || "",
      ...req.body,
    });
    validateAssignee(p, fields.assignee);
    const previous = String(task.assignee || "");
    Object.assign(task, fields);
    await task.save();
    if (fields.assignee && previous !== fields.assignee)
      await notify(
        fields.assignee,
        "task-assignment",
        `You were assigned: ${task.title}`,
        "/app/workspace/" + p._id + "?tab=tasks",
      );
    await activity(p._id, req.user._id, `Updated task: ${task.title}`);
    res.json({ task });
  });
  r.delete("/tasks/:id", async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) throw fail(404, "Task not found.");
    await member(task.project, req.user._id);
    await task.deleteOne();
    await activity(task.project, req.user._id, `Deleted task: ${task.title}`);
    res.json({ ok: true });
  });
  r.post("/projects/:id/resources", async (req, res) => {
    const p = await member(req.params.id, req.user._id);
    const fields = parse(
      z.object({
        title: z.string().trim().min(1).max(100),
        url: z.url().refine((u) => /^https?:\/\//.test(u)),
      }),
      req.body,
    );
    await Project.updateOne({ _id: p._id }, { $push: { resources: fields } });
    await activity(p._id, req.user._id, `Added resource: ${fields.title}`);
    res.status(201).json({ ok: true });
  });
  r.delete("/projects/:id/resources/:resourceId", async (req, res) => {
    await member(req.params.id, req.user._id);
    await Project.updateOne(
      { _id: req.params.id },
      { $pull: { resources: { _id: req.params.resourceId } } },
    );
    res.json({ ok: true });
  });
  r.delete("/projects/:id/members/:userId", async (req, res) => {
    await member(req.params.id, req.user._id, true);
    await mongoose.connection.transaction(async (session) => {
      const p = await Project.findById(req.params.id).session(session);
      const m = p.members.find((m) => idEquals(m.user, req.params.userId));
      if (!m) throw fail(404, "Member not found.");
      const role = p.roles.id(m.roleId);
      if (role) role.filled = Math.max(0, role.filled - 1);
      p.members = p.members.filter((m) => !idEquals(m.user, req.params.userId));
      await p.save({ session });
      await Conversation.updateOne(
        { project: p._id },
        { $pull: { participants: req.params.userId } },
        { session },
      );
      await Task.updateMany(
        { project: p._id, assignee: req.params.userId },
        { $set: { assignee: null } },
        { session },
      );
      await notify(
        req.params.userId,
        "project-update",
        `Your membership in ${p.title} has ended.`,
        "/projects/" + p._id,
        session,
      );
    });
    res.json({ ok: true });
  });
  return r;
}
function validateAssignee(project, id) {
  if (
    id &&
    !idEquals(project.owner, id) &&
    !project.members.some((m) => idEquals(m.user, id))
  )
    throw fail(400, "Assign tasks only to project members.");
}
