import mongoose from "mongoose";
const { Schema } = mongoose;
const ref = (model, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required,
});
const options = {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.__v;
      delete ret.password;
      delete ret.tokenVersion;
      return ret;
    },
  },
};
const roleSchema = new Schema({
  title: { type: String, required: true },
  skills: [String],
  positions: { type: Number, min: 1, max: 20, required: true },
  filled: { type: Number, default: 0, min: 0 },
});
const userSchema = new Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
    college: String,
    graduationYear: Number,
    role: String,
    bio: String,
    skills: [String],
    interests: [String],
    experience: { type: String, default: "beginner" },
    availability: { type: String, default: "part-time" },
    goals: String,
    collaborationMode: { type: String, default: "remote" },
    avatar: String,
    github: String,
    linkedin: String,
    portfolio: String,
    onboarded: { type: Boolean, default: false },
  },
  options,
);
userSchema.index({ skills: 1, role: 1 });
const projectSchema = new Schema(
  {
    title: String,
    tagline: String,
    description: String,
    category: String,
    projectType: String,
    difficulty: String,
    duration: String,
    maxTeamSize: { type: Number, min: 2, max: 30 },
    roles: [roleSchema],
    deadline: Date,
    collaborationMode: String,
    availability: String,
    image: String,
    github: String,
    status: {
      type: String,
      enum: ["recruiting", "in-progress", "completed", "archived"],
      default: "recruiting",
    },
    owner: ref("User"),
    members: [
      { user: ref("User"), role: String, roleId: Schema.Types.ObjectId },
    ],
    resources: [{ title: String, url: String }],
    admissionVersion: { type: Number, default: 0 },
  },
  options,
);
projectSchema.index({ title: "text", tagline: "text", description: "text" });
projectSchema.index({ category: 1, status: 1, createdAt: -1 });
projectSchema.index({ "roles.skills": 1 });
const applicationSchema = new Schema(
  {
    project: ref("Project"),
    user: ref("User"),
    roleId: Schema.Types.ObjectId,
    introduction: String,
    motivation: String,
    experience: String,
    portfolio: String,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },
  },
  options,
);
applicationSchema.index({ project: 1, user: 1 }, { unique: true });
const invitationSchema = new Schema(
  {
    project: ref("Project"),
    sender: ref("User"),
    recipient: ref("User"),
    roleId: Schema.Types.ObjectId,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  options,
);
invitationSchema.index({ project: 1, recipient: 1 }, { unique: true });
const taskSchema = new Schema(
  {
    project: ref("Project"),
    creator: ref("User"),
    title: String,
    description: String,
    assignee: ref("User", false),
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "completed"],
      default: "todo",
    },
  },
  options,
);
taskSchema.index({ project: 1, status: 1 });
const conversationSchema = new Schema(
  {
    kind: { type: String, enum: ["direct", "project"] },
    participants: [ref("User")],
    project: ref("Project", false),
    directKey: { type: String, unique: true, sparse: true },
    lastMessage: String,
    lastMessageAt: Date,
    readAt: { type: Map, of: Date, default: {} },
  },
  options,
);
conversationSchema.index({ participants: 1 });
conversationSchema.index({ project: 1 }, { unique: true, sparse: true });
const messageSchema = new Schema(
  { conversation: ref("Conversation"), sender: ref("User"), text: String },
  options,
);
messageSchema.index({ conversation: 1, createdAt: -1 });
const notificationSchema = new Schema(
  {
    user: ref("User"),
    type: String,
    text: String,
    link: String,
    read: { type: Boolean, default: false },
  },
  options,
);
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
const savedSchema = new Schema(
  { user: ref("User"), project: ref("Project") },
  options,
);
savedSchema.index({ user: 1, project: 1 }, { unique: true });
const activitySchema = new Schema(
  { project: ref("Project"), actor: ref("User"), text: String },
  options,
);
activitySchema.index({ project: 1, createdAt: -1 });
export const User = mongoose.model("User", userSchema);
export const Project = mongoose.model("Project", projectSchema);
export const Application = mongoose.model("Application", applicationSchema);
export const Invitation = mongoose.model("Invitation", invitationSchema);
export const Task = mongoose.model("Task", taskSchema);
export const Conversation = mongoose.model("Conversation", conversationSchema);
export const Message = mongoose.model("Message", messageSchema);
export const Notification = mongoose.model("Notification", notificationSchema);
export const SavedProject = mongoose.model("SavedProject", savedSchema);
export const ActivityLog = mongoose.model("ActivityLog", activitySchema);
export async function initializeModels() {
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init()),
  );
}
