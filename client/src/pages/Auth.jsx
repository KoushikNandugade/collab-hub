import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Code2, Sparkles, Users } from "lucide-react";
import { api, categories, skills } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Avatar,
  Button,
  Field,
  Logo,
  TagsInput,
  useToast,
} from "../components/ui";
const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.email(),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});
const loginSchema = signupSchema.omit({ name: true });
export function AuthPage({ signup = false }) {
  const { setUser, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(signup ? signupSchema : loginSchema) });
  async function submit(fields) {
    setError("");
    try {
      const { user } = await api(
        signup ? "/auth/register" : "/auth/login",
        "POST",
        fields,
      );
      setUser(user);
      navigate(user.onboarded ? location.state?.from || "/app" : "/onboarding");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Logo />
        <div>
          <BadgeText />
          <h1>
            Great ideas.
            <br />
            Even better
            <br />
            <em>together.</em>
          </h1>
          <p>
            Your next co-founder, hackathon teammate, or creative partner is out
            there. Let’s find them.
          </p>
          <div className="auth-quote">
            <Code2 size={26} />
            <p>
              “The best projects don’t start with a perfect plan. They start
              with the right people.”
            </p>
            <span>THE COLLABHUB WAY</span>
          </div>
        </div>
        <small>BUILT FOR PEOPLE WHO BUILD.</small>
      </section>
      <section className="auth-form">
        <div className="auth-form-inner">
          <Link className="back-link" to="/">
            ← Back to CollabHub
          </Link>
          <h2>
            {signup
              ? "Your next chapter starts here."
              : "Welcome back, builder."}
          </h2>
          <p>
            {signup
              ? "One account. A world of people to build with."
              : "Pick up where your next big idea left off."}
          </p>
          <form onSubmit={handleSubmit(submit)}>
            {signup && (
              <Field label="Full name" error={errors.name}>
                <input
                  autoComplete="name"
                  placeholder="Your full name"
                  {...register("name")}
                />
              </Field>
            )}
            <Field label="Email address" error={errors.email}>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@college.edu"
                {...register("email")}
              />
            </Field>
            <Field label="Password" error={errors.password}>
              <input
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder="At least 8 characters"
                {...register("password")}
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button className="full" loading={isSubmitting}>
              {signup ? "Create your account" : "Log in"}
              <ArrowRight size={16} />
            </Button>
          </form>
          <p className="auth-switch">
            {signup ? "Already part of the community?" : "New to CollabHub?"}{" "}
            <Link to={signup ? "/login" : "/register"}>
              {signup ? "Log in" : "Create an account"}
            </Link>
          </p>
          <div className="auth-assurance">
            <span>✳</span> Real people. Real projects. Real possibilities.
          </div>
        </div>
      </section>
    </div>
  );
}
function BadgeText() {
  return (
    <div className="eyebrow">
      <span className="live-indicator" /> A PLACE FOR YOUR NEXT BIG THING
    </div>
  );
}
export function ProfileForm({ onboarding = false }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: user.name,
      college: user.college || "",
      graduationYear: user.graduationYear || new Date().getFullYear() + 1,
      role: user.role || "Developer",
      bio: user.bio || "",
      skills: user.skills || [],
      interests: user.interests || [],
      experience: user.experience || "beginner",
      availability: user.availability || "part-time",
      collaborationMode: user.collaborationMode || "remote",
      goals: user.goals || "",
      github: user.github || "",
      linkedin: user.linkedin || "",
      portfolio: user.portfolio || "",
      avatar: user.avatar || "",
    },
  });
  async function submit(fields) {
    setError("");
    try {
      const result = await api("/profile", "PUT", fields);
      setUser(result.user);
      toast(
        onboarding ? "You’re in. Let’s find your people." : "Profile updated.",
      );
      navigate("/app");
    } catch (e) {
      setError(e.message);
    }
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("image", file);
      const result = await api("/uploads", "POST", data);
      setValue("avatar", result.url);
      toast("Photo uploaded.");
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="profile-editor">
      <div className="eyebrow">
        {onboarding ? "01 / YOUR INTRODUCTION" : "YOUR PUBLIC IDENTITY"}
      </div>
      <h1>{onboarding ? "First, a little about you." : "Make it yours."}</h1>
      <p>
        {onboarding
          ? "Help the right people and projects find you."
          : "Tell the community what you bring to the table."}
      </p>
      <form onSubmit={handleSubmit(submit)}>
        <div className="form-section">
          <h3>The basics</h3>
          <div className="form-grid">
            <Field label="Full name">
              <input required maxLength={100} {...register("name")} />
            </Field>
            <Field label="Primary role">
              <select {...register("role")}>
                {[
                  "Developer",
                  "Designer",
                  "Product manager",
                  "Creator",
                  "Entrepreneur",
                  "Researcher",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="College / organization">
              <input
                maxLength={150}
                placeholder="Where are you building from?"
                {...register("college")}
              />
            </Field>
            <Field label="Graduation year">
              <input
                type="number"
                min="1950"
                max="2100"
                {...register("graduationYear", { valueAsNumber: true })}
              />
            </Field>
          </div>
          <Field label="A little about you">
            <textarea
              maxLength={1000}
              rows={3}
              placeholder="What do you love working on?"
              {...register("bio")}
            />
          </Field>
        </div>
        <div className="form-section">
          <h3>Your superpowers</h3>
          <Field label="Skills">
            <Controller
              name="skills"
              control={control}
              render={({ field }) => (
                <TagsInput {...field} suggestions={skills} />
              )}
            />
          </Field>
          <Field label="Interests">
            <Controller
              name="interests"
              control={control}
              render={({ field }) => (
                <TagsInput
                  {...field}
                  placeholder="Add an interest"
                  suggestions={categories}
                />
              )}
            />
          </Field>
          <div className="form-grid">
            <Field label="Experience">
              <select {...register("experience")}>
                <option value="beginner">Just getting started</option>
                <option value="intermediate">Some experience</option>
                <option value="advanced">Experienced builder</option>
              </select>
            </Field>
            <Field label="Availability">
              <select {...register("availability")}>
                <option value="part-time">Part-time</option>
                <option value="full-time">Full-time</option>
                <option value="weekends">Weekends</option>
              </select>
            </Field>
            <Field label="Collaboration preference">
              <select {...register("collaborationMode")}>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="in-person">In person</option>
              </select>
            </Field>
          </div>
          <Field label="What are you hoping to build?">
            <textarea rows={2} maxLength={1000} {...register("goals")} />
          </Field>
        </div>
        <div className="form-section">
          <h3>
            Find you elsewhere <span className="muted">— optional</span>
          </h3>
          <div className="form-grid">
            {["github", "linkedin", "portfolio"].map((f) => (
              <Field key={f} label={f}>
                <input type="url" placeholder="https://" {...register(f)} />
              </Field>
            ))}
            <Field label="Profile image URL">
              <input
                type="url"
                placeholder="https://res.cloudinary.com/…"
                {...register("avatar")}
              />
            </Field>
          </div>
          <div className="upload-row">
            <Avatar user={{ name: watch("name"), avatar: watch("avatar") }} />
            <label className="btn secondary">
              {uploading ? "Uploading…" : "Upload profile image"}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={upload}
                disabled={uploading}
              />
            </label>
            <small>Cloudinary must be configured by the host.</small>
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button loading={isSubmitting}>
          {onboarding ? "Find my people" : "Save profile"}
          <ArrowRight size={16} />
        </Button>
      </form>
    </div>
  );
}
