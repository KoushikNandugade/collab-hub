import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  Clock,
  FolderKanban,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { api, dateLabel } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Button,
  Empty,
  ErrorState,
  Heading,
  Loading,
  Page,
  PersonCard,
  ProjectCard,
  useToast,
} from "../components/ui";
export default function Dashboard({ myProjects = false }) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const toast = useToast();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api("/dashboard"),
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  async function invitation(id, decision) {
    try {
      await api("/invitations/" + id, "PUT", { decision });
      cache.invalidateQueries();
      toast(
        decision === "accepted"
          ? "You joined the team!"
          : "Invitation declined.",
      );
    } catch (e) {
      toast(e.message);
    }
  }
  return (
    <Page>
      <Heading
        eyebrow="A LITTLE CONNECTION. A LOT OF POSSIBILITY."
        title={
          myProjects
            ? "Your ideas, in motion."
            : `Good to see you, ${user.name.split(" ")[0]}.`
        }
        description="Here’s what’s happening in your corner of the community."
        action={
          <Link className="btn primary" to="/app/projects/new">
            <Plus size={16} />
            Create project
          </Link>
        }
      />
      {!myProjects && (
        <>
          <div className="stats-grid">
            {[
              {
                icon: FolderKanban,
                label: "Active projects",
                value: data.projects.filter(
                  (p) => !["completed", "archived"].includes(p.status),
                ).length,
              },
              {
                icon: Clock,
                label: "Pending applications",
                value: data.applications.filter((a) => a.status === "pending")
                  .length,
              },
              {
                icon: Users,
                label: "Invitations",
                value: data.invitations.length,
              },
              {
                icon: CheckCheck,
                label: "Completed collaborations",
                value: data.projects.filter((p) => p.status === "completed")
                  .length,
              },
            ].map((s) => (
              <div className="stat" key={s.label}>
                <s.icon size={18} />
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="dashboard-banner">
            <div>
              <div className="eyebrow">BUILT BETTER, TOGETHER</div>
              <h2>
                Your next great project
                <br />
                starts with a connection.
              </h2>
              <Link to="/explore">
                Explore your possibilities
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="banner-art" aria-hidden="true">
              <CodeMark />
              <span>you + the right people</span>
            </div>
          </div>
        </>
      )}
      <section className="section">
        <div className="section-heading">
          <h2>
            Your projects<span>{data.projects.length}</span>
          </h2>
          {!myProjects && (
            <Link to="/app/my-projects">
              View all
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
        {data.projects.length ? (
          <div className="project-grid">
            {data.projects.map((p) => (
              <div key={p._id}>
                <ProjectCard project={p} />
                <Link className="workspace-link" to={"/app/workspace/" + p._id}>
                  Open workspace
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Something great starts here."
            description="Create your first project or join a team that needs someone like you."
            action={
              <Link className="btn secondary" to="/explore">
                Explore projects
                <ArrowRight size={15} />
              </Link>
            }
          />
        )}
      </section>
      {!myProjects && (
        <>
          <section className="section">
            <div className="section-heading">
              <h2>
                Picked for your potential
                <Sparkles size={16} />
              </h2>
              <Link to="/explore">
                Explore all
                <ArrowRight size={14} />
              </Link>
            </div>
            <p className="section-description">
              Recommendations based on your skills, interests, and availability.
            </p>
            {data.recommended.length ? (
              <div className="project-grid">
                {data.recommended.map((p) => (
                  <ProjectCard key={p._id} project={p} />
                ))}
              </div>
            ) : (
              <Empty
                title="Fresh possibilities are on their way."
                description="Explore the community or create a project others can join."
              />
            )}
          </section>
          <section className="section">
            <div className="section-heading">
              <h2>People to build with</h2>
              <Link to="/people">
                Meet the community
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="people-grid">
              {data.people.map((p) => (
                <PersonCard key={p._id} person={p} />
              ))}
            </div>
            {!data.people.length && (
              <Empty
                title="Be one of the first builders."
                description="Share CollabHub with your friends and start the community."
              />
            )}
          </section>
          <div className="dashboard-columns">
            <section className="panel">
              <h3>Your applications</h3>
              {data.applications.map((a) => (
                <Link
                  className="list-item"
                  to={"/projects/" + a.project?._id}
                  key={a._id}
                >
                  <div>
                    {a.project?.title || "Project removed"}
                    <small>{dateLabel(a.createdAt)}</small>
                  </div>
                  <span
                    className={
                      "badge " + (a.status === "accepted" ? "success" : "")
                    }
                  >
                    {a.status}
                  </span>
                </Link>
              ))}
              {!data.applications.length && (
                <p className="muted padded">
                  Find a project you believe in. Your first application goes
                  here.
                </p>
              )}
            </section>
            <section className="panel">
              <h3>Team invitations</h3>
              {data.invitations.map((i) => (
                <div className="list-item" key={i._id}>
                  <div>
                    <Link to={"/projects/" + i.project?._id}>
                      {i.project?.title}
                    </Link>
                    <small>Invited by {i.sender?.name}</small>
                  </div>
                  <div className="inline-actions">
                    <Button onClick={() => invitation(i._id, "accepted")}>
                      Accept
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => invitation(i._id, "rejected")}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
              {!data.invitations.length && (
                <p className="muted padded">
                  Your next team could be one invitation away.
                </p>
              )}
            </section>
          </div>
          <section className="section panel">
            <h3>Recent activity</h3>
            {data.activity.map((a) => (
              <Link
                className="list-item"
                key={a._id}
                to={"/app/workspace/" + a.project}
              >
                <span>{a.text}</span>
                <small>{dateLabel(a.createdAt)}</small>
              </Link>
            ))}
            {!data.activity.length && (
              <p className="muted padded">
                Your story starts with your first project.
              </p>
            )}
          </section>
        </>
      )}
    </Page>
  );
}
function CodeMark() {
  return (
    <div className="code-mark">
      &lt; <span>+</span> /&gt;
    </div>
  );
}
