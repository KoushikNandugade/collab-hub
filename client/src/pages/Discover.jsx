import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { api, categories, queryString, skills } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  Button,
  Empty,
  ErrorState,
  Heading,
  Loading,
  Page,
  Pagination,
  PersonCard,
  ProjectCard,
  useToast,
} from "../components/ui";
export default function Discover({ people = false, saved = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const cache = useQueryClient();
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    skill: "",
    difficulty: "",
    projectType: "",
    status: "",
    availability: "",
    role: "",
    sort: "newest",
    page: 1,
  });
  const [input, setInput] = useState("");
  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => ({ ...f, q: input, page: 1 })),
      300,
    );
    return () => clearTimeout(t);
  }, [input]);
  const path = saved ? "/saved" : people ? "/people" : "/projects";
  const { data, isPending, error, refetch } = useQuery({
    queryKey: [path, filters],
    queryFn: () => api(path + (saved ? "" : "?" + queryString(filters))),
  });
  const { data: savedData } = useQuery({
    queryKey: ["saved"],
    queryFn: () => api("/saved"),
    enabled: !!user && !people,
  });
  async function save(id) {
    if (!user) return navigate("/login");
    try {
      const exists = savedData?.items?.some((p) => p._id === id);
      await api("/saved/" + id, exists ? "DELETE" : "POST");
      cache.invalidateQueries({ queryKey: ["saved"] });
      if (saved) refetch();
      toast(
        exists
          ? "Project removed from saved."
          : "Saved for your next possibility.",
      );
    } catch (e) {
      toast(e.message);
    }
  }
  function filter(key, value) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }
  return (
    <div className="container discovery-page">
      <Page>
        <Heading
          eyebrow={people ? "YOUR KIND OF PEOPLE" : "A WORLD OF POSSIBILITIES"}
          title={
            saved
              ? "Keep a good idea close."
              : people
                ? "Find your missing piece."
                : "Find your next “let’s build this.”"
          }
          description={
            saved
              ? "Projects you’ve bookmarked for a little later."
              : people
                ? "Different skills. Shared ambition. Meet your next collaborator."
                : "Discover projects that need your skills, your perspective, and your spark."
          }
          action={
            !people && (
              <Link
                className="btn primary"
                to={user ? "/app/projects/new" : "/register"}
              >
                <Plus size={16} />
                Post a project
              </Link>
            )
          }
        />
        {!saved && (
          <div className="filter-bar">
            <div className="search-box">
              <Search size={17} />
              <input
                aria-label={people ? "Search people" : "Search projects"}
                placeholder={
                  people
                    ? "Search names, colleges, or interests…"
                    : "Search projects, ideas, or keywords…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <div className="filters">
              <SlidersHorizontal size={16} />
              {(people
                ? [
                    [
                      "role",
                      "Any role",
                      [
                        "Developer",
                        "Designer",
                        "Product manager",
                        "Creator",
                        "Entrepreneur",
                        "Researcher",
                      ],
                    ],
                    [
                      "availability",
                      "Any availability",
                      ["part-time", "full-time", "weekends"],
                    ],
                  ]
                : [
                    ["category", "All categories", categories],
                    [
                      "difficulty",
                      "Any level",
                      ["beginner", "intermediate", "advanced"],
                    ],
                    [
                      "projectType",
                      "All types",
                      [
                        "Side project",
                        "Hackathon",
                        "Startup",
                        "Open source",
                        "Research",
                      ],
                    ],
                    [
                      "status",
                      "Any status",
                      ["recruiting", "in-progress", "completed"],
                    ],
                  ]
              ).map(([key, label, options]) => (
                <select
                  key={key}
                  aria-label={label}
                  value={filters[key]}
                  onChange={(e) => filter(key, e.target.value)}
                >
                  <option value="">{label}</option>
                  {options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ))}
              <select
                aria-label="Filter by skill"
                value={filters.skill}
                onChange={(e) => filter("skill", e.target.value)}
              >
                <option value="">All skills</option>
                {skills.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="results-heading">
          <span>
            {data?.total ?? data?.items?.length ?? 0}{" "}
            {people ? "collaborators" : "projects"}
            <span className="muted">
              {" "}
              · Your next possibility could be here
            </span>
          </span>
          {!people && !saved && (
            <select
              aria-label="Sort projects"
              value={filters.sort}
              onChange={(e) => filter("sort", e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          )}
        </div>
        {isPending ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} retry={refetch} />
        ) : data?.items?.length ? (
          <div className={people ? "people-grid" : "project-grid"}>
            {data.items.map((item) =>
              people ? (
                <PersonCard key={item._id} person={item} />
              ) : (
                <ProjectCard
                  key={item._id}
                  project={item}
                  saved={savedData?.items?.some((p) => p._id === item._id)}
                  onSave={save}
                />
              ),
            )}
          </div>
        ) : (
          <Empty
            title={
              saved ? "Your collection starts here." : "No matches just yet."
            }
            description={
              saved
                ? "Save projects that spark your curiosity. They’ll be waiting here."
                : "Try a different search or clear a filter. Your people are out there."
            }
            action={
              saved ? (
                <Link className="btn secondary" to="/explore">
                  Explore projects
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setInput("");
                    setFilters({
                      q: "",
                      category: "",
                      skill: "",
                      difficulty: "",
                      projectType: "",
                      status: "",
                      availability: "",
                      role: "",
                      sort: "newest",
                      page: 1,
                    });
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        )}
        <Pagination
          page={filters.page}
          pages={data?.pages || 0}
          onChange={(page) => filter("page", page)}
        />
      </Page>
    </div>
  );
}
