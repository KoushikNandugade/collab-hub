import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  Code2,
  Compass,
  GitBranch,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { api } from "../lib/api";
import { Badge, Empty, PersonCard, ProjectCard } from "../components/ui";
export default function Landing() {
  const [preview, setPreview] = useState("projects");
  const { data } = useQuery({
    queryKey: ["featured"],
    queryFn: () => api("/projects?limit=3"),
  });
  const { data: people } = useQuery({
    queryKey: ["featured-people"],
    queryFn: () => api("/people?limit=3"),
  });
  return (
    <div className="landing">
      <section className="hero container">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hero-copy"
        >
          <div className="hero-tag">
            <span className="live-indicator" /> FOR THE IDEAS YOU CAN’T BUILD
            ALONE <ArrowUpRight size={13} />
          </div>
          <h1>
            Great ideas need
            <br />
            <span>great people.</span>
          </h1>
          <p>
            Discover projects, find your people, and build
            <br className="desktop-break" /> something extraordinary together.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" to="/register">
              Start collaborating
              <ArrowUpRight size={17} />
            </Link>
            <Link className="btn secondary" to="/explore">
              <Compass size={17} />
              Explore projects
            </Link>
          </div>
          <div className="hero-proof">
            <div className="proof-icons">
              <Code2 size={15} />
              <GitBranch size={15} />
              <Braces size={15} />
            </div>
            <span>For students, makers, and the next big thing.</span>
          </div>
        </motion.div>
        <motion.div
          className="product-preview"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <div className="preview-bar">
            <div className="window-dots">
              <i />
              <i />
              <i />
            </div>
            <span>your next possibility</span>
            <Code2 size={14} />
          </div>
          <div className="preview-content">
            <div className="preview-heading">
              <span className="eyebrow">
                A LITTLE CONNECTION CHANGES EVERYTHING
              </span>
              <h3>Find your kind of ambitious.</h3>
            </div>
            <div className="preview-tabs">
              <button
                className={preview === "projects" ? "active" : ""}
                onClick={() => setPreview("projects")}
              >
                <Compass size={13} />
                Projects
              </button>
              <button
                className={preview === "people" ? "active" : ""}
                onClick={() => setPreview("people")}
              >
                <Users size={13} />
                People
              </button>
              <span>✳ Built together</span>
            </div>
            {preview === "projects" ? (
              <>
                <div className="preview-project">
                  <span className="preview-project-icon">
                    <Braces size={24} />
                  </span>
                  <div>
                    <Badge tone="success">● Open for collaborators</Badge>
                    <h4>{data?.items?.[0]?.title || "Your next big idea"}</h4>
                    <p>
                      {data?.items?.[0]?.tagline ||
                        "Find the team that brings it to life."}
                    </p>
                  </div>
                </div>
                <div className="skill-tags">
                  {(
                    data?.items?.[0]?.roles
                      ?.flatMap((r) => r.skills)
                      .slice(0, 4) || [
                      "Your skills",
                      "Shared ambition",
                      "A fresh perspective",
                    ]
                  ).map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
                <div className="preview-line">
                  <span>
                    <Users size={14} /> Great people. Shared purpose.
                  </span>
                  <Link
                    to={
                      data?.items?.[0]
                        ? "/projects/" + data.items[0]._id
                        : "/register"
                    }
                  >
                    Take a look
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="preview-people">
                  {people?.items?.length ? (
                    people.items.map((p) => (
                      <Link key={p._id} to={"/people/" + p._id}>
                        <span>{p.name[0]}</span>
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            {p.role} · {p.skills?.slice(0, 2).join(", ")}
                          </small>
                        </div>
                        <ArrowUpRight size={14} />
                      </Link>
                    ))
                  ) : (
                    <p>Your future collaborators are one introduction away.</p>
                  )}
                </div>
              </>
            )}
            <div className="preview-note">
              <Sparkles size={15} />
              <span>Less searching. More building.</span>
              <Check size={15} />
            </div>
          </div>
        </motion.div>
      </section>
      <div className="belief-strip">
        <div className="container">
          <span>DIFFERENT SKILLS. SHARED AMBITION.</span>
          {[
            "Build your portfolio",
            "Meet your co-founder",
            "Find your hackathon team",
            "Make a real impact",
          ].map((t) => (
            <span key={t}>
              <span>✳</span>
              {t}
            </span>
          ))}
        </div>
      </div>
      <section id="how-it-works" className="container section landing-section">
        <div className="section-intro">
          <div>
            <div className="eyebrow">FROM “WHAT IF” TO “WE BUILT IT”</div>
            <h2>
              A great team is closer
              <br />
              than you think.
            </h2>
          </div>
          <p>
            No endless group chats. No awkward introductions.
            <br />
            Just the right people, working on something that matters.
          </p>
        </div>
        <div className="steps-grid">
          {[
            {
              n: "01",
              icon: Users,
              title: "Show up as yourself.",
              text: "Share your skills, your interests, and what you want to build next.",
            },
            {
              n: "02",
              icon: Compass,
              title: "Find your next possibility.",
              text: "Explore real projects and meet people whose ambition matches yours.",
            },
            {
              n: "03",
              icon: GitBranch,
              title: "Make something happen.",
              text: "Join a team, open your workspace, and turn a good idea into something real.",
            },
          ].map((s) => (
            <article key={s.n}>
              <div>
                <s.icon size={22} />
                <span>{s.n}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="container section landing-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">LOOKING FOR SOMEONE LIKE YOU</div>
            <h2>Ideas worth joining.</h2>
            <p>Real projects. Open roles. Room for your perspective.</p>
          </div>
          <Link className="btn secondary" to="/explore">
            Explore all projects
            <ArrowUpRight size={15} />
          </Link>
        </div>
        {data?.items?.length ? (
          <div className="project-grid">
            {data.items.map((p) => (
              <ProjectCard key={p._id} project={p} />
            ))}
          </div>
        ) : (
          <Empty
            title="Be the beginning of something."
            description="The community is just getting started. Give your idea its first home."
            action={
              <Link className="btn primary" to="/register">
                Create the first project
                <ArrowRight size={15} />
              </Link>
            }
          />
        )}
      </section>
      <section className="container landing-section feature-section">
        <div>
          <div className="eyebrow">LESS FRICTION. MORE MOMENTUM.</div>
          <h2>
            Everything you need.
            <br />
            <span>Nothing in your way.</span>
          </h2>
          <p>
            From the first “hey” to the final launch, give your team a place to
            do its best work.
          </p>
          <Link className="text-link" to="/register">
            Find your people
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="features-grid">
          {[
            {
              icon: Sparkles,
              title: "A little more compatible",
              text: "Skill and interest matching helps you find projects that make sense for you.",
            },
            {
              icon: MessagesSquare,
              title: "Keep the conversation going",
              text: "Real-time messages, project discussions, and a shared place for ideas.",
            },
            {
              icon: Target,
              title: "Make progress visible",
              text: "A focused project workspace with tasks, resources, and team activity.",
            },
            {
              icon: ShieldCheck,
              title: "A space for your team",
              text: "Private workspaces and member-only conversations. Built with clear boundaries.",
            },
          ].map((f) => (
            <article key={f.title}>
              <f.icon size={21} />
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="container final-cta">
        <span>✳</span>
        <div className="eyebrow">YOUR NEXT CHAPTER IS A TEAM EFFORT</div>
        <h2>
          Find your people.
          <br />
          <em>Build something great.</em>
        </h2>
        <p>That idea you keep thinking about? Let’s give it a team.</p>
        <Link className="btn primary" to="/register">
          Start collaborating
          <ArrowUpRight size={16} />
        </Link>
        <small>No perfect idea required. Just a little ambition.</small>
      </section>
    </div>
  );
}
