export const fail = (status, message) =>
  Object.assign(new Error(message), { status });
export const idEquals = (a, b) => String(a?._id || a) === String(b?._id || b);
export function pageParams(query) {
  return {
    page: Math.max(1, Math.min(10000, parseInt(query.page) || 1)),
    limit: Math.max(1, Math.min(50, parseInt(query.limit) || 12)),
  };
}
export const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function publicProfile(user) {
  const data = user.toObject ? user.toObject() : { ...user };
  for (const key of ["password", "tokenVersion", "__v", "email"])
    delete data[key];
  return data;
}
