import { z } from "zod";
import { fail } from "../utils/index.js";
const short = z.string().trim().min(1).max(100);
const long = z.string().trim().max(5000).default("");
const url = z
  .union([
    z.literal(""),
    z
      .url()
      .refine(
        (value) => /^https?:\/\//.test(value),
        "Use an http or https URL",
      ),
  ])
  .optional()
  .default("");
const list = z.array(z.string().trim().min(1).max(50)).max(25).default([]);
const date = z
  .union([z.literal(""), z.iso.date(), z.iso.datetime()])
  .optional()
  .transform((value) => (value ? new Date(value) : undefined));
export const registration = z.object({
  name: short,
  email: z.email().toLowerCase(),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= 72,
      "Password must be at most 72 UTF-8 bytes",
    ),
});
export const login = registration.pick({ email: true, password: true });
export const profile = z.object({
  name: short,
  college: z.string().trim().max(150).default(""),
  graduationYear: z.coerce.number().int().min(1950).max(2100).optional(),
  role: short,
  bio: z.string().max(1000).default(""),
  skills: list,
  interests: list,
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  availability: z.enum(["part-time", "full-time", "weekends"]),
  goals: z.string().max(1000).default(""),
  collaborationMode: z
    .enum(["remote", "hybrid", "in-person"])
    .default("remote"),
  github: url,
  linkedin: url,
  portfolio: url,
  avatar: url,
});
export const project = z.object({
  title: short,
  tagline: z.string().trim().min(1).max(180),
  description: z.string().trim().min(20).max(10000),
  category: z.enum([
    "Web development",
    "Mobile apps",
    "AI & ML",
    "Design",
    "Open source",
    "Social impact",
    "Other",
  ]),
  projectType: z.enum([
    "Side project",
    "Hackathon",
    "Startup",
    "Open source",
    "Research",
  ]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  duration: short,
  maxTeamSize: z.coerce.number().int().min(2).max(30),
  roles: z
    .array(
      z.object({
        _id: z
          .string()
          .regex(/^[a-f\d]{24}$/i)
          .optional(),
        title: short,
        skills: list,
        positions: z.coerce.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(10),
  deadline: date,
  collaborationMode: z.enum(["remote", "hybrid", "in-person"]),
  availability: z
    .enum(["part-time", "full-time", "weekends"])
    .default("part-time"),
  image: url,
  github: url,
  status: z
    .enum(["recruiting", "in-progress", "completed", "archived"])
    .default("recruiting"),
});
export const application = z.object({
  roleId: z.string().regex(/^[a-f\d]{24}$/i),
  introduction: z.string().trim().min(10).max(2000),
  motivation: z.string().trim().min(10).max(2000),
  experience: long,
  portfolio: url,
});
export const task = z.object({
  title: z.string().trim().min(1).max(180),
  description: long,
  assignee: z
    .union([z.string().regex(/^[a-f\d]{24}$/i), z.literal("")])
    .optional()
    .transform((v) => v || null),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: date,
  status: z
    .enum(["todo", "in-progress", "review", "completed"])
    .default("todo"),
});
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success)
    throw fail(
      400,
      result.error.issues
        .map((e) => `${e.path.join(".") || "Input"}: ${e.message}`)
        .join("; "),
    );
  return result.data;
}
