import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { auth } from "./middleware/auth.js";
import { authController } from "./controllers/auth.js";
import {
  User,
  Project,
  Application,
  Invitation,
  ActivityLog,
} from "./models/index.js";
import { publicProfile, pageParams, escapeRegex } from "./utils/index.js";
import { matchProject } from "./services/matching.js";
import { projectRoutes } from "./routes/projects.js";
import { socialRoutes } from "./routes/social.js";
export function createApp({
  secret,
  production = false,
  origin = "http://localhost:5173",
}) {
  if (!secret || secret.length < 32)
    throw new Error("JWT_SECRET must be at least 32 characters.");
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:", "https:"],
          "connect-src": ["'self'", "ws:", "wss:"],
          "upgrade-insecure-requests": production ? [] : null,
        },
      },
    }),
  );
  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 240,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests. Please try again shortly." },
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") &&
      ![origin, `${req.protocol}://${req.get("host")}`].includes(
        req.get("origin"),
      )
    )
      return res.status(403).json({ error: "Request origin is not allowed." });
    next();
  });
  app.get("/api/health", (req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({
        status: mongoose.connection.readyState === 1 ? "ok" : "unavailable",
      }),
  );
  const controller = authController({ secret, production });
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 35,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again in 15 minutes." },
  });
  app.post("/api/auth/register", authLimit, controller.register);
  app.post("/api/auth/login", authLimit, controller.login);
  app.get("/api/projects", async (req, res) => {
    let user = null;
    try {
      if (req.cookies.collabhub_session) {
        const { authenticateToken } = await import("./middleware/auth.js");
        user = await authenticateToken(req.cookies.collabhub_session, secret);
      }
    } catch {}
    const query = { status: { $ne: "archived" } };
    if (req.query.q)
      query.$or = ["title", "tagline", "description"].map((field) => ({
        [field]: {
          $regex: escapeRegex(String(req.query.q).slice(0, 150)),
          $options: "i",
        },
      }));
    for (const key of ["category", "difficulty", "projectType", "status"])
      if (typeof req.query[key] === "string" && req.query[key])
        query[key] = req.query[key];
    if (req.query.skill)
      query["roles.skills"] = {
        $regex: `^${escapeRegex(String(req.query.skill).slice(0, 50))}$`,
        $options: "i",
      };
    const { page, limit } = pageParams(req.query);
    const sort =
      req.query.sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
    const [items, total] = await Promise.all([
      Project.find(query)
        .populate("owner", "name avatar role")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Project.countDocuments(query),
    ]);
    res.json({
      items: items.map((p) => ({
        ...p.toJSON(),
        match: matchProject(user, p),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  });
  app.get("/api/projects/:id", async (req, res) => {
    const p = await Project.findById(req.params.id)
      .populate("owner", "name avatar role college")
      .populate("members.user", "name avatar role");
    if (!p) return res.status(404).json({ error: "Project not found." });
    res.json({ project: p });
  });
  app.get("/api/people", async (req, res) => {
    const query = { onboarded: true };
    if (req.query.q)
      query.$or = ["name", "college", "bio"].map((k) => ({
        [k]: {
          $regex: escapeRegex(String(req.query.q).slice(0, 100)),
          $options: "i",
        },
      }));
    for (const key of ["role", "availability"])
      if (typeof req.query[key] === "string" && req.query[key])
        query[key] = req.query[key];
    if (req.query.skill)
      query.skills = {
        $regex: `^${escapeRegex(String(req.query.skill).slice(0, 50))}$`,
        $options: "i",
      };
    const { page, limit } = pageParams(req.query);
    const [items, total] = await Promise.all([
      User.find(query)
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);
    res.json({
      items: await Promise.all(
        items.map(async (person) => ({
          ...publicProfile(person),
          completedProjects: await Project.countDocuments({
            status: "completed",
            $or: [{ owner: person._id }, { "members.user": person._id }],
          }),
        })),
      ),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  });
  app.get("/api/people/:id", async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Profile not found." });
    const projects = await Project.find({
      $or: [{ owner: user._id }, { "members.user": user._id }],
      status: { $ne: "archived" },
    }).populate("owner", "name avatar role");
    res.json({ user: publicProfile(user), projects });
  });
  app.use("/api", auth(secret));
  app.get("/api/auth/me", (req, res) => res.json({ user: req.user }));
  app.post("/api/auth/logout", controller.logout);
  app.put("/api/profile", controller.profile);
  app.get("/api/dashboard", async (req, res) => {
    const id = req.user._id;
    const [projects, applications, invitations, activity, recommended, people] =
      await Promise.all([
        Project.find({ $or: [{ owner: id }, { "members.user": id }] }).populate(
          "owner",
          "name avatar role",
        ),
        Application.find({ user: id }).populate(
          "project",
          "title tagline status",
        ),
        Invitation.find({ recipient: id, status: "pending" })
          .populate("project", "title roles")
          .populate("sender", "name"),
        ActivityLog.find({ actor: id }).sort({ createdAt: -1 }).limit(8),
        Project.find({
          status: "recruiting",
          owner: { $ne: id },
          "members.user": { $ne: id },
        })
          .populate("owner", "name avatar role")
          .limit(100),
        User.find({ _id: { $ne: id }, onboarded: true }).limit(4),
      ]);
    const ranked = recommended
      .map((p) => ({ ...p.toJSON(), match: matchProject(req.user, p) }))
      .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0));
    res.json({
      projects,
      applications,
      invitations,
      activity,
      recommended: ranked.slice(0, 4),
      people: people.map(publicProfile),
    });
  });
  app.use("/api", projectRoutes());
  app.use("/api", socialRoutes());
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );
  const dist = fileURLToPath(new URL("../../client/dist", import.meta.url));
  if (existsSync(dist + "/index.html")) {
    app.use(express.static(dist, { index: false }));
    app.get("/{*path}", (req, res) => res.sendFile(dist + "/index.html"));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.status ||
      (error.code === 11000
        ? 409
        : ["ValidationError", "CastError"].includes(error.name)
          ? 400
          : 500);
    if (status === 500) console.error(error);
    res
      .status(status)
      .json({
        error:
          status === 500
            ? "Something went wrong. Please try again."
            : error.code === 11000
              ? "This record already exists."
              : error.message,
      });
  });
  return app;
}
