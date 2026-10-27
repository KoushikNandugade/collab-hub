import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { parse, registration, login, profile } from "../validators/index.js";
import { fail } from "../utils/index.js";
export function authController({ secret, production }) {
  const cookie = {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400000,
  };
  const session = (user, res) => {
    res.cookie(
      "collabhub_session",
      jwt.sign({ v: user.tokenVersion || 0 }, secret, {
        subject: String(user._id),
        expiresIn: "7d",
        algorithm: "HS256",
      }),
      cookie,
    );
    return user.toJSON();
  };
  return {
    async register(req, res) {
      const fields = parse(registration, req.body);
      if (await User.exists({ email: fields.email }))
        throw fail(409, "This email is already registered.");
      const user = await User.create({
        ...fields,
        password: await bcrypt.hash(fields.password, 12),
      });
      res.status(201).json({ user: session(user, res) });
    },
    async login(req, res) {
      const fields = parse(login, req.body);
      const user = await User.findOne({ email: fields.email }).select(
        "+password +tokenVersion",
      );
      if (!user || !(await bcrypt.compare(fields.password, user.password)))
        throw fail(401, "Email or password is incorrect.");
      res.json({ user: session(user, res) });
    },
    async logout(req, res) {
      await User.updateOne(
        { _id: req.user._id },
        { $inc: { tokenVersion: 1 } },
      );
      req.app
        .get("io")
        ?.in("user:" + req.user._id)
        .disconnectSockets(true);
      res.clearCookie("collabhub_session", { ...cookie, maxAge: undefined });
      res.json({ ok: true });
    },
    async profile(req, res) {
      const fields = parse(profile, req.body);
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { ...fields, onboarded: true } },
        { new: true, runValidators: true },
      );
      res.json({ user });
    },
  };
}
