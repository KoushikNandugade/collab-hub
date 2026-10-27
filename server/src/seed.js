import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import {
  User,
  Project,
  Conversation,
  Task,
  ActivityLog,
  initializeModels,
} from "./models/index.js";
if (!process.env.MONGODB_URI)
  throw new Error("Set MONGODB_URI before seeding.");
await mongoose.connect(process.env.MONGODB_URI);
await initializeModels();
try {
  const definitions = [
    [
      "Alex Morgan",
      "Developer",
      ["React", "Node.js", "MongoDB"],
      "Northstar Institute",
      "Web development",
    ],
    [
      "Maya Patel",
      "Designer",
      ["Figma", "UI/UX", "CSS"],
      "Design Institute",
      "Design",
    ],
    [
      "Rohan Desai",
      "Developer",
      ["Python", "Machine learning", "React"],
      "Tech University",
      "AI & ML",
    ],
    [
      "Sofia Chen",
      "Product manager",
      ["Figma", "React", "JavaScript"],
      "City University",
      "Social impact",
    ],
    [
      "Arjun Rao",
      "Developer",
      ["Flutter", "Node.js", "MongoDB"],
      "Engineering College",
      "Mobile apps",
    ],
    [
      "Zara Khan",
      "Creator",
      ["UI/UX", "Figma", "JavaScript"],
      "Creative Academy",
      "Open source",
    ],
  ];
  const users = [];
  const password = await bcrypt.hash(
    process.env.SEED_PASSWORD || randomBytes(32).toString("hex"),
    12,
  );
  for (const [name, role, skills, college, interest] of definitions) {
    const email = name.toLowerCase().replace(" ", ".") + "@demo.invalid";
    let user = await User.findOne({ email });
    if (!user)
      user = await User.create({
        name,
        email,
        password,
        role,
        skills,
        college,
        interests: [interest],
        experience: "intermediate",
        availability: "part-time",
        collaborationMode: "remote",
        goals: "Meet curious people and make something useful.",
        bio: "A curious builder who believes the best ideas get better when you share them. Always up for a thoughtful project and a fresh perspective.",
        graduationYear: 2027,
        onboarded: true,
      });
    users.push(user);
  }
  const defs = [
    [
      "CampusLoop",
      "A better campus, one connection at a time.",
      "Web development",
      "Side project",
      "intermediate",
      ["React", "Node.js", "MongoDB"],
      0,
    ],
    [
      "Mindful — make space for you",
      "Small moments. A little more peace.",
      "Design",
      "Startup",
      "beginner",
      ["Figma", "UI/UX"],
      1,
    ],
    [
      "OpenHarvest",
      "Make food waste a thing of the past.",
      "Social impact",
      "Open source",
      "beginner",
      ["React", "Python"],
      3,
    ],
    [
      "Context AI",
      "Your research, with a little more clarity.",
      "AI & ML",
      "Research",
      "advanced",
      ["Python", "Machine learning"],
      2,
    ],
    [
      "TrailMate",
      "Good trails. Better company.",
      "Mobile apps",
      "Hackathon",
      "intermediate",
      ["Flutter", "Node.js"],
      4,
    ],
    [
      "Devfolio Kit",
      "A home for the work you’re proud of.",
      "Open source",
      "Open source",
      "beginner",
      ["React", "JavaScript", "CSS"],
      5,
    ],
  ];
  for (const [
    title,
    tagline,
    category,
    projectType,
    difficulty,
    skills,
    index,
  ] of defs) {
    const owner = users[index];
    if (await Project.exists({ owner: owner._id, title })) continue;
    const deadline = new Date(Date.now() + 21 * 86400000);
    const project = await Project.create({
      title,
      tagline,
      category,
      projectType,
      difficulty,
      roles: [
        {
          title:
            category === "Design" ? "Product designer" : "Frontend developer",
          skills,
          positions: 2,
        },
        {
          title: "Backend developer",
          skills: ["Node.js", "MongoDB"],
          positions: 1,
        },
      ],
      description: `${tagline}\n\nWe’re building ${title}: a thoughtful, community-driven project with a real problem to solve. We’re looking for curious collaborators who care about the details and want to learn by making.\n\nYou’ll help shape the product from the first sketch to a working release. We value clear communication, small consistent steps, and different perspectives. Come build something you’ll be proud to share.`,
      owner: owner._id,
      maxTeamSize: 5,
      duration: "4–6 weeks",
      deadline,
      collaborationMode: "remote",
      availability: "part-time",
    });
    await Conversation.create({
      kind: "project",
      project: project._id,
      participants: [owner._id],
    });
    await Task.create({
      project: project._id,
      creator: owner._id,
      title: "Define the first milestone",
      description:
        "Agree on the smallest useful version we can build together.",
      priority: "high",
      status: "todo",
    });
    await ActivityLog.create({
      project: project._id,
      actor: owner._id,
      text: "Shared a new idea with the community.",
    });
  }
  console.log(
    "Seed complete: six community profiles and six projects. Existing data was preserved. Demo accounts use random passwords unless SEED_PASSWORD is supplied.",
  );
} finally {
  await mongoose.disconnect();
}
