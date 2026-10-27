import React, { useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Compass,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Avatar, Button, ErrorState, Loading, Logo, useToast } from "./ui";
export function Protected() {
  const { user, loading, error } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (error)
    return <ErrorState error={error} retry={() => window.location.reload()} />;
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!user.onboarded && location.pathname !== "/onboarding")
    return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
export function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="public-nav">
        <div className="container nav-content">
          <Logo />
          <nav className={open ? "open" : ""}>
            <NavLink to="/explore" onClick={() => setOpen(false)}>
              Explore projects
            </NavLink>
            <NavLink to="/people" onClick={() => setOpen(false)}>
              Find people
            </NavLink>
            <a href="/#how-it-works" onClick={() => setOpen(false)}>
              How it works
            </a>
          </nav>
          <div className="nav-actions">
            {user ? (
              <Link className="btn primary" to="/app">
                Your workspace
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link className="login-link" to="/login">
                  Log in
                </Link>
                <Link className="btn primary" to="/register">
                  Get started
                  <ArrowUpRightIcon />
                </Link>
              </>
            )}
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer container">
        <Logo />
        <span>Find your people. Build something great.</span>
        <div>
          <Link to="/explore">Projects</Link>
          <Link to="/people">Community</Link>
          <a
            href="https://github.com/KoushikNandugade/collab-hub"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </div>
        <small>© {new Date().getFullYear()} CollabHub</small>
      </footer>
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={14} />;
}
export function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api("/notifications"),
    refetchInterval: 20000,
    retry: false,
  });
  return (
    <div className="app-shell">
      {open && (
        <button
          className="nav-shade"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={"sidebar " + (open ? "open" : "")}>
        <Logo />
        <div className="workspace-label">
          <span className="workspace-initial">{user.name[0]}</span>
          <div>
            Personal workspace<small>Let’s build something great</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {[
            { to: "/app", end: true, label: "Overview", icon: LayoutDashboard },
            { to: "/explore", label: "Explore projects", icon: Compass },
            {
              to: "/app/my-projects",
              label: "My projects",
              icon: FolderKanban,
            },
            { to: "/people", label: "Find people", icon: Users },
            { to: "/app/messages", label: "Messages", icon: MessageSquare },
            { to: "/app/saved", label: "Saved projects", icon: Bookmark },
            { to: "/app/notifications", label: "Notifications", icon: Bell },
          ].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
            >
              <n.icon size={18} />
              {n.label}
              {n.label === "Notifications" && data?.unread > 0 && (
                <span className="nav-count">{data.unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-callout">
          <span>YOUR NEXT BIG THING</span>
          <h3>It starts with an idea.</h3>
          <p>Find the people who’ll help bring it to life.</p>
          <Link to="/app/projects/new">
            Create a project
            <Plus size={14} />
          </Link>
        </div>
        <div className="sidebar-account">
          <Link to="/app/profile">
            <Avatar user={user} />
            <div>
              {user.name}
              <small>Edit your profile</small>
            </div>
          </Link>
          <button
            aria-label="Log out"
            onClick={async () => {
              try {
                await logout();
              } catch (e) {
                toast(e.message);
              }
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <span>
            Your workspace <span className="muted">/</span>{" "}
            <strong>CollabHub</strong>
          </span>
          <div>
            <span className="live-indicator" />
            Make something that matters
            <Link aria-label="Notifications" to="/app/notifications">
              <Bell size={18} />
              {data?.unread > 0 && <i />}
            </Link>
            <Link to={"/people/" + user._id}>
              <Avatar user={user} size="small" />
            </Link>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
