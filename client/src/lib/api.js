export async function api(path, method = "GET", body) {
  const response = await fetch("/api" + path, {
    method,
    credentials: "include",
    headers:
      body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });
  const data = await response
    .json()
    .catch(() => ({ error: "Unable to reach the server." }));
  if (
    response.status === 401 &&
    !path.startsWith("/auth/") &&
    typeof window !== "undefined"
  ) {
    window.dispatchEvent(new Event("collabhub:session-expired"));
  }
  if (!response.ok)
    throw Object.assign(new Error(data.error || "Something went wrong."), {
      status: response.status,
    });
  return data;
}
export const queryString = (object) =>
  new URLSearchParams(
    Object.entries(object).filter(([, v]) => v !== "" && v !== undefined),
  ).toString();
export const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Flexible";
export const categories = [
  "Web development",
  "Mobile apps",
  "AI & ML",
  "Design",
  "Open source",
  "Social impact",
  "Other",
];
export const skills = [
  "React",
  "Node.js",
  "JavaScript",
  "Python",
  "Figma",
  "MongoDB",
  "TypeScript",
  "UI/UX",
  "Machine learning",
  "Flutter",
  "Java",
  "CSS",
];
