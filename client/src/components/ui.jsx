import React, {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  LoaderCircle,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { motion } from "motion/react";
const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 4500);
      return () => clearTimeout(t);
    }
  }, [message]);
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      {message && (
        <div className="toast" role="status">
          <Check size={17} />
          {message}
          <button aria-label="Dismiss" onClick={() => setMessage("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function Logo() {
  return (
    <Link className="logo" to="/">
      <span>
        <Code2 size={22} />
      </span>
      collab<span className="logo-weight">hub</span>
      <i />
    </Link>
  );
}
export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  ...props
}) {
  return (
    <button
      className={`btn ${variant} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <LoaderCircle size={15} className="spin" />}
      {children}
    </button>
  );
}
export function Avatar({ user, size = "normal" }) {
  return user?.avatar ? (
    <img className={"avatar " + size} src={user.avatar} alt={user.name} />
  ) : (
    <span className={"avatar " + size}>
      {user?.name
        ?.split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("") || "?"}
    </span>
  );
}
export function Badge({ children, tone = "" }) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      {children}
    </motion.div>
  );
}
export function Heading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  description = "Your next collaboration starts with a small step.",
  action,
}) {
  return (
    <div className="empty">
      <span>
        <Sparkles size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>Loading your next possibility…</span>
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <Empty
      title="Something didn’t load"
      description={error?.message || "Please try again."}
      action={
        retry && (
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        )
      }
    />
  );
}
export function Field({ label, error, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
      {error && <small className="error">{error.message || error}</small>}
    </label>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector("input,button,select,textarea")?.focus();
    function key(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll(
          "input,button:not(:disabled),select,textarea,a[href]",
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = before;
      previous?.focus();
      document.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function TagsInput({
  value = [],
  onChange,
  placeholder = "Type a skill and press Enter",
  suggestions = [],
}) {
  const [text, setText] = useState("");
  function add(v) {
    v = v.trim();
    if (v && !value.includes(v) && value.length < 25) onChange([...value, v]);
    setText("");
  }
  return (
    <div>
      <div className="tags-input">
        {value.map((v) => (
          <span key={v}>
            {v}
            <button
              type="button"
              aria-label={"Remove " + v}
              onClick={() => onChange(value.filter((x) => x !== v))}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(text);
            }
          }}
          onBlur={() => text && add(text)}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button type="button" key={s} onClick={() => add(s)}>
                <Plus size={10} />
                {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
export function Pagination({ page, pages, onChange }) {
  return (
    pages > 1 && (
      <div className="pagination">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} />
          Previous
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button
          variant="secondary"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    )
  );
}
export function ProjectCard({ project, saved, onSave }) {
  const p = project;
  return (
    <article className="project-card">
      {p.image && (
        <img className="project-cover" src={p.image} alt="" loading="lazy" />
      )}
      <div className="project-card-inner">
        <div className="card-top">
          <span
            className={
              "category-icon " + p.category?.replace(/\W/g, "").toLowerCase()
            }
          >
            <Code2 size={21} />
          </span>
          <Badge tone={p.status === "recruiting" ? "success" : ""}>
            {p.status === "recruiting" ? "● Recruiting" : p.status}
          </Badge>
          {onSave && (
            <button
              className={"save-button " + (saved ? "saved" : "")}
              aria-label={saved ? "Unsave project" : "Save project"}
              onClick={() => onSave(p._id)}
            >
              <span>{saved ? "★" : "☆"}</span>
            </button>
          )}
        </div>
        <div className="card-category">
          {p.category} <span>·</span> {p.projectType}
        </div>
        <Link to={"/projects/" + p._id}>
          <h3>{p.title}</h3>
        </Link>
        <p>{p.tagline}</p>
        <div className="skill-tags">
          {[...new Set(p.roles.flatMap((r) => r.skills))]
            .slice(0, 4)
            .map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
        </div>
        <div className="card-role">
          <Users size={14} />
          {p.members.length + 1}/{p.maxTeamSize} members<span>·</span>
          <span className="capitalize">{p.difficulty}</span>
        </div>
        <div className="card-bottom">
          <Link to={"/people/" + p.owner?._id} className="creator">
            <Avatar user={p.owner} size="tiny" />
            {p.owner?.name?.split(" ")[0] || "Creator"}
          </Link>
          {p.match ? (
            <span className="match" title={p.match.reasons.join(" ")}>
              <Sparkles size={12} />
              {p.match.score}% match
            </span>
          ) : (
            <Link className="card-link" to={"/projects/" + p._id}>
              View project
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
        {p.match && <p className="match-explanation">{p.match.reasons[0]}</p>}
      </div>
    </article>
  );
}
export function PersonCard({ person, action }) {
  return (
    <article className="person-card">
      <div className="person-head">
        <Avatar user={person} size="large" />
        <Badge tone="success">{person.availability || "part-time"}</Badge>
      </div>
      <Link to={"/people/" + person._id}>
        <h3>{person.name}</h3>
      </Link>
      <p>
        {person.role || "Builder"} <span>·</span>{" "}
        {person.college || "Independent creator"}
      </p>
      <div className="skill-tags">
        {person.skills?.slice(0, 4).map((s) => (
          <Badge key={s}>{s}</Badge>
        ))}
      </div>
      <div className="person-bottom">
        <span className="capitalize">
          {person.experience} · {person.completedProjects || 0} completed
        </span>
        {action || (
          <Link to={"/people/" + person._id}>
            View profile
            <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}
