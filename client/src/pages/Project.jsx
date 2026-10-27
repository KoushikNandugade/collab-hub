import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  Code2,
  Globe,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { api, categories, dateLabel, skills } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  ErrorState,
  Field,
  Heading,
  Loading,
  Modal,
  Page,
  TagsInput,
  useToast,
} from "../components/ui";
export function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const toast = useToast();
  const [applying, setApplying] = useState(null);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api("/projects/" + id),
  });
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api("/dashboard"),
    enabled: !!user,
  });
  const form = useForm();
  const [applyError, setApplyError] = useState("");
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  const p = data.project;
  const owner = user?._id === p.owner._id;
  const isMember = owner || p.members.some((m) => m.user._id === user?._id);
  const existing = dashboard?.applications.find((a) => a.project?._id === id);
  async function submit(fields) {
    setApplyError("");
    try {
      await api("/projects/" + id + "/applications", "POST", {
        ...fields,
        roleId: applying._id,
      });
      setApplying(null);
      cache.invalidateQueries();
      toast("Application sent. Your next chapter could start here.");
    } catch (e) {
      setApplyError(e.message);
    }
  }
  return (
    <div className="container detail-page">
      <Page>
        <Link className="back-link" to="/explore">
          <ArrowLeft size={14} />
          Back to projects
        </Link>
        {p.image && (
          <img className="detail-cover" src={p.image} alt={p.title} />
        )}
        <div className="project-detail-grid">
          <div>
            <div className="detail-badges">
              <Badge>{p.category}</Badge>
              <Badge tone={p.status === "recruiting" ? "success" : ""}>
                {p.status}
              </Badge>
            </div>
            <h1>{p.title}</h1>
            <p className="detail-tagline">{p.tagline}</p>
            <div className="detail-creator">
              <Avatar user={p.owner} />
              <span>
                Created by{" "}
                <Link to={"/people/" + p.owner._id}>{p.owner.name}</Link>
              </span>
            </div>
            <div className="detail-section">
              <h2>The idea</h2>
              <p className="preserve-lines">{p.description}</p>
            </div>
            <div className="detail-section">
              <h2>The team this idea needs</h2>
              <p className="muted">
                Bring your perspective. There’s room for a fresh one.
              </p>
              {p.roles.map((role) => (
                <div className="role-card" key={role._id}>
                  <div>
                    <h3>{role.title}</h3>
                    <div className="skill-tags">
                      {role.skills.map((s) => (
                        <Badge key={s}>{s}</Badge>
                      ))}
                    </div>
                    <small>
                      {Math.max(0, role.positions - role.filled)} open{" "}
                      {role.positions - role.filled === 1
                        ? "position"
                        : "positions"}
                    </small>
                  </div>
                  {!isMember && p.status === "recruiting" && (
                    <Button
                      variant="secondary"
                      disabled={!!existing || role.filled >= role.positions}
                      onClick={() =>
                        user ? setApplying(role) : navigate("/login")
                      }
                    >
                      {existing
                        ? existing.status === "pending"
                          ? "Applied"
                          : existing.status
                        : "Apply"}
                      <ArrowUpRight size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="detail-section">
              <h2>The people behind it</h2>
              <div className="team-list">
                <Link to={"/people/" + p.owner._id}>
                  <Avatar user={p.owner} />
                  <div>
                    {p.owner.name}
                    <small>Project lead</small>
                  </div>
                </Link>
                {p.members.map((m) => (
                  <Link key={m._id} to={"/people/" + m.user._id}>
                    <Avatar user={m.user} />
                    <div>
                      {m.user.name}
                      <small>{m.role}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <aside className="project-summary panel">
            <h3>The big picture</h3>
            {[
              [
                Users,
                "Team",
                `${p.members.length + 1} / ${p.maxTeamSize} members`,
              ],
              [Code2, "Experience", p.difficulty],
              [Clock, "Duration", p.duration],
              [Globe, "Collaboration", p.collaborationMode],
              [CalendarDays, "Apply by", dateLabel(p.deadline)],
            ].map(([Icon, label, value]) => (
              <div className="summary-row" key={label}>
                <Icon size={16} />
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
            {isMember ? (
              <Link className="btn primary full" to={"/app/workspace/" + id}>
                Open workspace
                <ArrowRight size={15} />
              </Link>
            ) : (
              <Button
                className="full"
                disabled={p.status !== "recruiting" || !!existing}
                onClick={() =>
                  user
                    ? setApplying(
                        p.roles.find((r) => r.filled < r.positions) ||
                          p.roles[0],
                      )
                    : navigate("/login")
                }
              >
                {existing
                  ? "Application " + existing.status
                  : p.status === "recruiting"
                    ? "Join this project"
                    : "Recruitment closed"}
                <ArrowUpRight size={15} />
              </Button>
            )}
            {existing?.status === "pending" && (
              <Button
                variant="ghost"
                className="full"
                onClick={async () => {
                  try {
                    await api("/applications/" + existing._id, "PUT", {
                      decision: "withdrawn",
                    });
                    cache.invalidateQueries();
                    toast("Application withdrawn.");
                  } catch (e) {
                    toast(e.message);
                  }
                }}
              >
                Withdraw application
              </Button>
            )}
            {p.github && (
              <a
                className="btn secondary full"
                href={p.github}
                target="_blank"
                rel="noreferrer"
              >
                GitHub repository
                <ArrowUpRight size={14} />
              </a>
            )}
            <p className="summary-note">
              Great teams start with an introduction.
            </p>
          </aside>
        </div>
      </Page>
      {applying && (
        <Modal
          title={"Apply as " + applying.title}
          onClose={() => setApplying(null)}
        >
          <p className="muted">
            Tell {p.owner.name.split(" ")[0]} why you’d be a great addition.
          </p>
          <form onSubmit={form.handleSubmit(submit)}>
            <Field label="Introduce yourself">
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                {...form.register("introduction")}
              />
            </Field>
            <Field label="Why this project?">
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                {...form.register("motivation")}
              />
            </Field>
            <Field label="Relevant experience">
              <textarea
                maxLength={5000}
                rows={2}
                {...form.register("experience")}
              />
            </Field>
            <Field label="Portfolio URL — optional">
              <input type="url" {...form.register("portfolio")} />
            </Field>
            {applyError && <p className="form-error">{applyError}</p>}
            <Button loading={form.formState.isSubmitting}>
              Send application
              <ArrowRight size={15} />
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
export function ProjectEditor() {
  const { id } = useParams();
  const { data, isPending } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api("/projects/" + id),
    enabled: !!id,
  });
  if (id && isPending) return <Loading />;
  return <ProjectEditorForm key={id || "new"} project={data?.project} />;
}
function ProjectEditorForm({ project }) {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const defaults = project
    ? {
        ...project,
        deadline: project.deadline?.slice(0, 10) || "",
        roles: project.roles.map((r) => ({
          _id: r._id,
          title: r.title,
          skills: r.skills,
          positions: r.positions,
        })),
      }
    : {
        title: "",
        tagline: "",
        description: "",
        category: "Web development",
        projectType: "Side project",
        difficulty: "beginner",
        duration: "4–6 weeks",
        maxTeamSize: 4,
        roles: [{ title: "Frontend developer", skills: [], positions: 1 }],
        deadline: "",
        collaborationMode: "remote",
        availability: "part-time",
        image: "",
        github: "",
        status: "recruiting",
      };
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm({ defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control, name: "roles" });
  async function submit(fields) {
    setError("");
    try {
      const { project: p } = await api(
        "/projects" + (project ? "/" + project._id : ""),
        project ? "PUT" : "POST",
        fields,
      );
      cache.invalidateQueries();
      toast(project ? "Project updated." : "Your idea is out in the world.");
      navigate("/projects/" + p._id);
    } catch (e) {
      setError(e.message);
    }
  }
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      setValue("image", (await api("/uploads", "POST", body)).url);
      toast("Image uploaded.");
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <Page>
      <Heading
        eyebrow="BRING YOUR NEXT BIG THING TO LIFE"
        title={project ? "A little fine-tuning." : "It starts with your idea."}
        description="Give the right people a reason to say, ‘let’s build this.’"
      />
      <form className="editor-form" onSubmit={handleSubmit(submit)}>
        <section className="form-section">
          <h3>01 — The idea</h3>
          <Field label="Project title">
            <input
              required
              maxLength={100}
              placeholder="Give your idea a name"
              {...register("title")}
            />
          </Field>
          <Field label="One-line pitch">
            <input
              required
              maxLength={180}
              placeholder="The big idea, in a little sentence"
              {...register("tagline")}
            />
          </Field>
          <Field label="Tell the story">
            <textarea
              required
              minLength={20}
              maxLength={10000}
              rows={6}
              placeholder="What are you building, why does it matter, and who is it for?"
              {...register("description")}
            />
          </Field>
          <div className="form-grid">
            <Field label="Category">
              <select {...register("category")}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Project type">
              <select {...register("projectType")}>
                {[
                  "Side project",
                  "Hackathon",
                  "Startup",
                  "Open source",
                  "Research",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Experience level">
              <select {...register("difficulty")}>
                {["beginner", "intermediate", "advanced"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Expected duration">
              <input required maxLength={100} {...register("duration")} />
            </Field>
          </div>
        </section>
        <section className="form-section">
          <h3>02 — The people</h3>
          <div className="form-grid">
            <Field label="Maximum team size (including you)">
              <input
                type="number"
                required
                min="2"
                max="30"
                {...register("maxTeamSize", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Collaboration mode">
              <select {...register("collaborationMode")}>
                {["remote", "hybrid", "in-person"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Availability">
              <select {...register("availability")}>
                {["part-time", "full-time", "weekends"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Application deadline — optional">
              <input type="date" {...register("deadline")} />
            </Field>
          </div>
          {fields.map((field, index) => (
            <div className="role-editor" key={field.id}>
              <div className="form-grid">
                <Field label="Role title">
                  <input
                    required
                    maxLength={100}
                    {...register(`roles.${index}.title`)}
                  />
                </Field>
                <Field label="Open positions">
                  <input
                    type="number"
                    required
                    min="1"
                    max="20"
                    {...register(`roles.${index}.positions`, {
                      valueAsNumber: true,
                    })}
                  />
                </Field>
              </div>
              <Field label="Skills for this role">
                <Controller
                  name={`roles.${index}.skills`}
                  control={control}
                  render={({ field }) => (
                    <TagsInput {...field} suggestions={skills} />
                  )}
                />
              </Field>
              {fields.length > 1 && (
                <button
                  type="button"
                  className="text-link danger"
                  onClick={() => remove(index)}
                >
                  <Trash2 size={13} />
                  Remove role
                </button>
              )}
            </div>
          ))}
          <Button
            variant="secondary"
            type="button"
            onClick={() => append({ title: "", skills: [], positions: 1 })}
          >
            <Plus size={15} />
            Add another role
          </Button>
        </section>
        <section className="form-section">
          <h3>03 — A little more context</h3>
          <Field label="Project image URL — optional">
            <input type="url" {...register("image")} />
          </Field>
          <label className="btn secondary">
            {uploading ? "Uploading…" : "Upload project image"}
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp"
              onChange={upload}
              disabled={uploading}
            />
          </label>
          <Field label="GitHub repository — optional">
            <input
              type="url"
              placeholder="https://github.com/…"
              {...register("github")}
            />
          </Field>
          {project && (
            <Field label="Project status">
              <select {...register("status")}>
                {["recruiting", "in-progress", "completed", "archived"].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </Field>
          )}
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button loading={isSubmitting}>
            {project ? "Save changes" : "Publish project"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Page>
  );
}
