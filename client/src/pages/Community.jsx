import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  Globe,
  MessageSquare,
  Plus,
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
  ProjectCard,
  useToast,
} from "../components/ui";
export function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [inviting, setInviting] = useState(false);
  const [portfolioTab, setPortfolioTab] = useState("all");
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["person", id],
    queryFn: () => api("/people/" + id),
  });
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api("/dashboard"),
    enabled: !!user,
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  const p = data.user;
  const mine = p._id === user?._id;
  const visibleProjects = data.projects.filter(
    (project) =>
      portfolioTab === "all" ||
      (portfolioTab === "created" && project.owner._id === p._id) ||
      (portfolioTab === "joined" && project.owner._id !== p._id) ||
      (portfolioTab === "completed" && project.status === "completed"),
  );
  const owned =
    dashboard?.projects.filter(
      (p) => p.owner._id === user?._id && p.status === "recruiting",
    ) || [];
  const selectedProject = owned.find((p) => p._id === selected);
  async function message() {
    if (!user) return navigate("/login");
    setBusy(true);
    try {
      const { conversation } = await api("/conversations", "POST", {
        recipient: id,
      });
      navigate("/app/messages?conversation=" + conversation._id);
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function invite(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/projects/" + selected + "/invitations", "POST", {
        recipient: id,
        roleId: role,
      });
      setInviting(false);
      toast("Invitation sent. Great things start here.");
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container profile-page">
      <Page>
        <Link className="back-link" to="/people">
          ← Meet the community
        </Link>
        <div className="profile-hero">
          <Avatar user={p} size="huge" />
          <div>
            <Badge tone="success">Open to {p.availability} collaboration</Badge>
            <h1>{p.name}</h1>
            <p>
              {p.role} <span>·</span> {p.college || "Independent builder"}
            </p>
            <div className="skill-tags">
              <Badge>{p.experience}</Badge>
              <Badge>{p.collaborationMode}</Badge>
              {p.graduationYear && <Badge>Class of {p.graduationYear}</Badge>}
            </div>
          </div>
          <div className="profile-actions">
            {mine ? (
              <Link className="btn secondary" to="/app/profile">
                Edit profile
              </Link>
            ) : (
              <>
                <Button loading={busy} onClick={message}>
                  <MessageSquare size={15} />
                  Say hello
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    user ? setInviting(true) : navigate("/login")
                  }
                >
                  <Plus size={15} />
                  Invite to project
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="profile-body">
          <section className="panel padded">
            <h3>A little about {p.name.split(" ")[0]}</h3>
            <p className="preserve-lines">
              {p.bio || "The best introduction is a conversation."}
            </p>
            <h4>Skills & superpowers</h4>
            <div className="skill-tags">
              {p.skills.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
            <h4>Curious about</h4>
            <div className="skill-tags">
              {p.interests.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
            {p.goals && (
              <>
                <h4>Looking to build</h4>
                <p>{p.goals}</p>
              </>
            )}
            <div className="profile-links">
              {["github", "linkedin", "portfolio"]
                .filter((k) => p[k])
                .map((k) => (
                  <a
                    className="text-link"
                    key={k}
                    href={p[k]}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {k}
                    <ArrowUpRight size={14} />
                  </a>
                ))}
            </div>
          </section>
          <section className="section">
            <div className="section-heading">
              <h2>
                Ideas in motion<span>{visibleProjects.length}</span>
              </h2>
              <span className="muted">
                {data.projects.filter((p) => p.status === "completed").length}{" "}
                completed
              </span>
            </div>
            <div className="portfolio-tabs">
              {["all", "created", "joined", "completed"].map((tab) => (
                <button
                  key={tab}
                  className={portfolioTab === tab ? "active" : ""}
                  onClick={() => setPortfolioTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {visibleProjects.length ? (
              <div className="project-grid profile-projects">
                {visibleProjects.map((project) => (
                  <ProjectCard key={project._id} project={project} />
                ))}
              </div>
            ) : (
              <Empty
                title="The next chapter is unwritten."
                description="Their next great collaboration could be with you."
              />
            )}
          </section>
        </div>
      </Page>
      {inviting && (
        <Modal title="A place on your team." onClose={() => setInviting(false)}>
          {owned.length ? (
            <form onSubmit={invite}>
              <p className="muted">
                Invite {p.name} to build something together.
              </p>
              <Field label="Project">
                <select
                  required
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setRole("");
                  }}
                >
                  <option value="">Choose a project</option>
                  {owned.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Role">
                <select
                  value={role}
                  required
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="">Choose an open role</option>
                  {selectedProject?.roles
                    .filter((r) => r.filled < r.positions)
                    .map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.title}
                      </option>
                    ))}
                </select>
              </Field>
              <Button loading={busy}>
                Send invitation
                <ArrowRight size={15} />
              </Button>
            </form>
          ) : (
            <Empty
              title="Give your idea a home first."
              description="Create a recruiting project to invite teammates."
              action={
                <Link className="btn primary" to="/app/projects/new">
                  Create a project
                </Link>
              }
            />
          )}
        </Modal>
      )}
    </div>
  );
}
export function Notifications() {
  const [page, setPage] = useState(1);
  const cache = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => api("/notifications?page=" + page),
  });
  async function readAll() {
    try {
      await api("/notifications/read", "PUT");
      cache.invalidateQueries({ queryKey: ["notifications"] });
      toast("You’re all caught up.");
    } catch (e) {
      toast(e.message);
    }
  }
  return (
    <Page>
      <Heading
        eyebrow="STAY IN THE LOOP"
        title="Your community, in motion."
        description="Applications, invitations, and the things worth knowing."
        action={
          <Button variant="secondary" onClick={readAll}>
            <Check size={15} />
            Mark all as read
          </Button>
        }
      />
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : data?.items.length ? (
        <section className="panel notification-list">
          {data.items.map((n) => (
            <button
              className={"notification " + (!n.read ? "unread" : "")}
              key={n._id}
              onClick={async () => {
                try {
                  await api("/notifications/" + n._id + "/read", "PUT");
                  cache.invalidateQueries({ queryKey: ["notifications"] });
                  navigate(n.link || "/app");
                } catch (e) {
                  toast(e.message);
                }
              }}
            >
              <span className="notification-icon">
                <Bell size={18} />
              </span>
              <span>
                <strong>{n.text}</strong>
                <small>
                  {dateLabel(n.createdAt)} · {n.type.replaceAll("-", " ")}
                </small>
              </span>
              {!n.read && <i />}
              <ArrowRight size={15} />
            </button>
          ))}
        </section>
      ) : (
        <Empty
          title="All quiet. All possibility."
          description="Your updates will find a home here as you start collaborating."
        />
      )}
      <Pagination page={page} pages={data?.pages || 0} onChange={setPage} />
    </Page>
  );
}
