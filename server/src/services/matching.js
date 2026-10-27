export function matchProject(user, project) {
  if (!user?.onboarded) return null;
  const skills = [
    ...new Set(
      project.roles.flatMap((role) => role.skills).map((s) => s.toLowerCase()),
    ),
  ];
  const overlaps = (user.skills || []).filter((skill) =>
    skills.includes(skill.toLowerCase()),
  );
  const skill = skills.length ? overlaps.length / skills.length : 0;
  const interest = (user.interests || []).some(
    (i) => i.toLowerCase() === project.category.toLowerCase(),
  )
    ? 1
    : 0;
  const availability = user.availability === project.availability ? 1 : 0;
  const experience =
    user.experience === project.difficulty
      ? 1
      : user.experience === "advanced" ||
          (user.experience === "intermediate" &&
            project.difficulty === "beginner")
        ? 0.7
        : 0;
  const preference =
    user.collaborationMode === project.collaborationMode ? 1 : 0;
  const score = Math.round(
    Math.min(
      100,
      skill * 40 +
        interest * 25 +
        availability * 15 +
        experience * 10 +
        preference * 10,
    ),
  );
  return {
    score,
    reasons: [
      overlaps.length
        ? `Your ${overlaps.join(" and ")} skills match this project.`
        : "Explore a new skill set.",
      ...(interest ? ["This project matches your interests."] : []),
      ...(availability ? ["Your availability aligns with the team."] : []),
    ],
    method:
      "Rule-based: skills 40%, interests 25%, availability 15%, experience 10%, collaboration preference 10%.",
  };
}
