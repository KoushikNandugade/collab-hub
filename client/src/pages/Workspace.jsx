import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { api, dateLabel } from "../lib/api";
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
  Pagination,
  useToast,
} from "../components/ui";
import { ChatPane } from "./Messages";
const statuses = [
  ["todo", "To do"],
  ["in-progress", "In progress"],
  ["review", "In review"],
  ["completed", "Completed"],
];
export default function Workspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const [task, setTask] = useState(null);
  const [resource, setResource] = useState(false);
  const [removeMember, setRemoveMember] = useState(null);
  const [archive, setArchive] = useState(false);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => api("/workspace/" + id),
  });
  function refresh() {
    cache.invalidateQueries({ queryKey: ["workspace", id] });
    cache.invalidateQueries({ queryKey: ["dashboard"] });
  }
  async function updateTask(t, status) {
    try {
      await api("/tasks/" + t._id, "PUT", { status });
      refresh();
    } catch (e) {
      toast(e.message);
    }
  }
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  const p = data.project;
  const owner = p.owner._id === user._id;
  const members = [{ user: p.owner, role: "Project lead" }, ...p.members];
  const completed = data.tasks.filter((t) => t.status === "completed").length;
  return (
    <Page>
      <Link className="back-link" to="/app/my-projects">
        ← Your projects
      </Link>
      <Heading
        eyebrow={p.category.toUpperCase()}
        title={p.title}
        description={p.tagline}
        action={
          owner && (
            <Link
              className="btn secondary"
              to={"/app/projects/" + id + "/edit"}
            >
              <Settings size={15} />
              Edit project
            </Link>
          )
        }
      />
      <div className="workspace-tabs">
        {[
          ["overview", "Overview", LayoutDashboard],
          ["tasks", "Tasks", ClipboardList],
          ["team", "Team", Users],
          ["discussion", "Discussion", MessageSquare],
          ["resources", "Resources", Link2],
          ["activity", "Activity", Activity],
          ...(owner ? [["applications", "Applications", FileText]] : []),
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setParams({ tab: key })}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <>
          <div className="stats-grid">
            <div className="stat">
              <Users size={18} />
              <strong>{members.length}</strong>
              <span>Team members</span>
            </div>
            <div className="stat">
              <ClipboardList size={18} />
              <strong>{data.tasks.length}</strong>
              <span>Total tasks</span>
            </div>
            <div className="stat">
              <CheckCheck size={18} />
              <strong>{completed}</strong>
              <span>Completed tasks</span>
            </div>
            <div className="stat">
              <FolderKanban size={18} />
              <strong>
                {data.tasks.length
                  ? Math.round((completed / data.tasks.length) * 100)
                  : 0}
                %
              </strong>
              <span>Progress</span>
            </div>
          </div>
          <div className="dashboard-columns">
            <section className="panel padded">
              <h3>The shared vision</h3>
              <p className="preserve-lines">{p.description}</p>
              <div className="skill-tags">
                <Badge>{p.status}</Badge>
                <Badge>{p.collaborationMode}</Badge>
                <Badge>{p.duration}</Badge>
              </div>
            </section>
            <section className="panel padded">
              <h3>The next small step</h3>
              <p>
                Keep your momentum. Give the team something to move forward.
              </p>
              <Button onClick={() => setTask({})}>
                <Plus size={15} />
                Create a task
              </Button>
              <Link
                className="text-link spaced"
                to={"/app/workspace/" + id + "?tab=discussion"}
              >
                Start a discussion
                <ArrowRight size={14} />
              </Link>
            </section>
          </div>
        </>
      )}
      {tab === "tasks" && (
        <>
          <div className="section-heading">
            <h2>
              A little progress, every day.<span>{data.tasks.length}</span>
            </h2>
            <Button onClick={() => setTask({})}>
              <Plus size={15} />
              New task
            </Button>
          </div>
          <div className="kanban">
            {statuses.map(([status, label]) => (
              <div
                className="kanban-column"
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const t = data.tasks.find(
                    (t) => t._id === e.dataTransfer.getData("taskId"),
                  );
                  if (t) updateTask(t, status);
                }}
              >
                <h3>
                  <span className={"status-dot " + status} />
                  {label}
                  <small>
                    {data.tasks.filter((t) => t.status === status).length}
                  </small>
                </h3>
                {data.tasks
                  .filter((t) => t.status === status)
                  .map((t) => (
                    <article
                      className="task-card"
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("taskId", t._id)
                      }
                      key={t._id}
                    >
                      <div>
                        <Badge tone={t.priority === "high" ? "warning" : ""}>
                          {t.priority}
                        </Badge>
                        <button
                          aria-label={"Edit " + t.title}
                          onClick={() => setTask(t)}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                      <button
                        className="task-card-title"
                        onClick={() => setTask(t)}
                      >
                        {t.title}
                      </button>
                      {t.description && <p>{t.description}</p>}
                      <select
                        aria-label={"Status of " + t.title}
                        value={t.status}
                        onChange={(e) => updateTask(t, e.target.value)}
                      >
                        {statuses.map(([s, l]) => (
                          <option key={s} value={s}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <footer>
                        <span>
                          <CalendarDays size={12} />
                          {dateLabel(t.dueDate)}
                        </span>
                        {t.assignee ? (
                          <Avatar user={t.assignee} size="tiny" />
                        ) : (
                          <span>Unassigned</span>
                        )}
                      </footer>
                    </article>
                  ))}
                <button
                  className="kanban-add"
                  onClick={() => setTask({ status })}
                >
                  <Plus size={14} />
                  Add task
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "team" && (
        <section className="panel">
          <div className="panel-title">
            <h3>The people making it happen</h3>
            <span className="muted">
              {members.length}/{p.maxTeamSize} members
            </span>
          </div>
          {members.map((m) => (
            <div className="list-item" key={m.user._id}>
              <Link className="creator" to={"/people/" + m.user._id}>
                <Avatar user={m.user} />
                <div>
                  {m.user.name}
                  <small>{m.role}</small>
                </div>
              </Link>
              {owner && m.user._id !== p.owner._id && (
                <Button variant="ghost" onClick={() => setRemoveMember(m)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
        </section>
      )}
      {tab === "discussion" && (
        <ChatPane
          conversationId={data.conversation?._id}
          title={p.title + " · Team discussion"}
        />
      )}
      {tab === "resources" && (
        <section className="section">
          <div className="section-heading">
            <h2>A shared toolbox.</h2>
            <Button onClick={() => setResource(true)}>
              <Plus size={15} />
              Add resource
            </Button>
          </div>
          {p.github && (
            <a
              className="resource-card"
              href={p.github}
              target="_blank"
              rel="noreferrer"
            >
              <Link2 size={20} />
              <div>
                GitHub repository<small>{p.github}</small>
              </div>
              <ExternalLink size={15} />
            </a>
          )}
          {p.resources?.map((r) => (
            <div className="resource-card" key={r._id}>
              <Link2 size={20} />
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.title}
                <small>{r.url}</small>
              </a>
              <button
                aria-label={"Delete " + r.title}
                onClick={async () => {
                  try {
                    await api(
                      "/projects/" + id + "/resources/" + r._id,
                      "DELETE",
                    );
                    refresh();
                    toast("Resource removed.");
                  } catch (e) {
                    toast(e.message);
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {!p.resources?.length && !p.github && (
            <Empty
              title="A home for the useful things."
              description="Add the links, docs, and tools your team needs."
            />
          )}
        </section>
      )}
      {tab === "activity" && (
        <section className="panel">
          <h3 className="panel-title">Your project’s story</h3>
          {data.activity.map((a) => (
            <div className="list-item" key={a._id}>
              <Avatar user={a.actor} />
              <div className="activity-text">
                <strong>{a.actor?.name || "A teammate"}</strong>
                <p>{a.text}</p>
              </div>
              <small>{dateLabel(a.createdAt)}</small>
            </div>
          ))}
        </section>
      )}
      {tab === "applications" && owner && (
        <Applications project={p} onChange={refresh} />
      )}
      {owner && tab === "overview" && (
        <div className="danger-zone">
          <div>
            <strong>Archive project</strong>
            <p>Close recruitment and preserve your team’s workspace.</p>
          </div>
          <Button variant="secondary" onClick={() => setArchive(true)}>
            Archive project
          </Button>
        </div>
      )}
      {task && (
        <Modal
          title={
            task._id
              ? "Fine-tune your next step."
              : "One small step for the team."
          }
          onClose={() => setTask(null)}
        >
          <TaskForm
            task={task}
            members={members}
            projectId={id}
            onSaved={() => {
              setTask(null);
              refresh();
            }}
          />
        </Modal>
      )}
      {resource && (
        <Modal
          title="A useful link, in the right place."
          onClose={() => setResource(false)}
        >
          <ResourceForm
            projectId={id}
            onSaved={() => {
              setResource(false);
              refresh();
            }}
          />
        </Modal>
      )}
      {removeMember && (
        <Modal
          title={"Remove " + removeMember.user.name + "?"}
          onClose={() => setRemoveMember(null)}
        >
          <p className="muted">
            Their workspace access will end. Their assigned tasks will become
            unassigned.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setRemoveMember(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  await api(
                    "/projects/" + id + "/members/" + removeMember.user._id,
                    "DELETE",
                  );
                  setRemoveMember(null);
                  refresh();
                  toast("Membership ended.");
                } catch (e) {
                  toast(e.message);
                }
              }}
            >
              Remove member
            </Button>
          </div>
        </Modal>
      )}
      {archive && (
        <Modal
          title="Put this chapter on the shelf?"
          onClose={() => setArchive(false)}
        >
          <p className="muted">
            This project will leave discovery. Your team can still access its
            workspace and history.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setArchive(false)}>
              Keep building
            </Button>
            <Button
              onClick={async () => {
                try {
                  await api("/projects/" + id, "DELETE");
                  setArchive(false);
                  refresh();
                  toast("Project archived.");
                } catch (e) {
                  toast(e.message);
                }
              }}
            >
              Archive project
            </Button>
          </div>
        </Modal>
      )}
    </Page>
  );
}
function TaskForm({ task, members, projectId, onSaved }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      title: task.title || "",
      description: task.description || "",
      assignee: task.assignee?._id || "",
      priority: task.priority || "medium",
      dueDate: task.dueDate?.slice(0, 10) || "",
      status: task.status || "todo",
    },
  });
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function submit(fields) {
    try {
      await api(
        task._id ? "/tasks/" + task._id : "/projects/" + projectId + "/tasks",
        task._id ? "PUT" : "POST",
        fields,
      );
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)}>
      <Field label="Task title">
        <input required maxLength={180} {...register("title")} />
      </Field>
      <Field label="Description">
        <textarea rows={3} maxLength={5000} {...register("description")} />
      </Field>
      <div className="form-grid">
        <Field label="Assigned to">
          <select {...register("assignee")}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option value={m.user._id} key={m.user._id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select {...register("priority")}>
            {["low", "medium", "high"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select {...register("status")}>
            {statuses.map(([s, l]) => (
              <option key={s} value={s}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date">
          <input type="date" {...register("dueDate")} />
        </Field>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-footer">
        {task._id && (
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              if (!confirm) return setConfirm(true);
              try {
                await api("/tasks/" + task._id, "DELETE");
                onSaved();
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            <Trash2 size={14} />
            {confirm ? "Confirm delete" : "Delete task"}
          </Button>
        )}
        <Button loading={isSubmitting}>
          {task._id ? "Save task" : "Create task"}
        </Button>
      </div>
    </form>
  );
}
function ResourceForm({ projectId, onSaved }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm();
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={handleSubmit(async (fields) => {
        try {
          await api("/projects/" + projectId + "/resources", "POST", fields);
          onSaved();
        } catch (e) {
          setError(e.message);
        }
      })}
    >
      <Field label="Link title">
        <input required maxLength={100} {...register("title")} />
      </Field>
      <Field label="URL">
        <input type="url" required {...register("url")} />
      </Field>
      {error && <p className="form-error">{error}</p>}
      <Button loading={isSubmitting}>Add resource</Button>
    </form>
  );
}
function Applications({ project, onChange }) {
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const cache = useQueryClient();
  const toast = useToast();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["applications", project._id, page],
    queryFn: () =>
      api("/projects/" + project._id + "/applications?page=" + page),
  });
  async function decide(id, decision) {
    setBusy(id);
    try {
      await api("/applications/" + id, "PUT", { decision });
      cache.invalidateQueries();
      onChange();
      toast(
        decision === "accepted"
          ? "A new teammate. A new possibility."
          : "Application declined.",
      );
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy("");
    }
  }
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  return (
    <>
      <div className="section-heading">
        <h2>Your next teammate could be here.</h2>
        <span className="muted">{data.total} applications</span>
      </div>
      {data.items.map((a) => (
        <article className="application-card panel" key={a._id}>
          <div className="application-head">
            <Link className="creator" to={"/people/" + a.user._id}>
              <Avatar user={a.user} />
              <div>
                {a.user.name}
                <small>
                  {project.roles.find((r) => r._id === a.roleId)?.title ||
                    "Collaborator"}
                </small>
              </div>
            </Link>
            <Badge>{a.status}</Badge>
          </div>
          <h4>Introduction</h4>
          <p>{a.introduction}</p>
          <h4>Why this project</h4>
          <p>{a.motivation}</p>
          {a.experience && (
            <>
              <h4>Experience</h4>
              <p>{a.experience}</p>
            </>
          )}
          {a.portfolio && (
            <a
              className="text-link"
              href={a.portfolio}
              target="_blank"
              rel="noreferrer"
            >
              View portfolio
              <ArrowUpRight size={14} />
            </a>
          )}
          {a.status === "pending" && (
            <div className="application-actions">
              <Button
                loading={busy === a._id}
                onClick={() => decide(a._id, "accepted")}
              >
                Accept application
              </Button>
              <Button
                variant="secondary"
                disabled={!!busy}
                onClick={() => decide(a._id, "rejected")}
              >
                Decline
              </Button>
            </div>
          )}
        </article>
      ))}
      {!data.items.length && (
        <Empty
          title="The right people are on their way."
          description="Share your project with the community. Applications will appear here."
        />
      )}
      <Pagination page={page} pages={data.pages} onChange={setPage} />
    </>
  );
}
