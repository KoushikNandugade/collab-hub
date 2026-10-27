import { test, expect } from "@playwright/test";
test("new user can register, onboard, publish, manage tasks, and return after logout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `browser-${Date.now()}@example.com`;
  let projectId;
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Great ideas need great people." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Start collaborating", exact: true })
    .first()
    .click();
  await page.getByLabel("Full name", { exact: true }).fill("Browser Builder");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-test-password");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page
    .getByLabel("College / organization")
    .fill("Browser Test Institute");
  await page.getByRole("button", { name: "React", exact: true }).click();
  await page
    .getByRole("button", { name: "Web development", exact: true })
    .click();
  await page.getByRole("button", { name: "Find my people" }).click();
  await expect(
    page.getByRole("heading", { name: "Good to see you, Browser." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create project", exact: true }).click();
  await page.getByLabel("Project title").fill("Browser collaboration test");
  await page
    .getByLabel("One-line pitch")
    .fill("A complete project created in the browser.");
  await page
    .getByLabel("Tell the story")
    .fill(
      "A meaningful browser-tested collaboration project with a clear goal and real persistent data.",
    );
  await page.getByRole("button", { name: "Publish project" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Browser collaboration test",
      exact: true,
    }),
  ).toBeVisible();
  projectId = page.url().split("/").pop();
  await page.getByRole("link", { name: "Open workspace" }).click();
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title").fill("Ship the first version");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ship the first version", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Status of Ship the first version")
    .selectOption("review");
  await page.reload();
  await expect(page.getByLabel("Status of Ship the first version")).toHaveValue(
    "review",
  );
  await page.getByRole("button", { name: "Resources", exact: true }).click();
  await page.getByRole("button", { name: "Add resource", exact: true }).click();
  await page.getByLabel("Link title").fill("Project repository");
  await page
    .getByLabel("URL", { exact: true })
    .fill("https://github.com/example/project");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add resource", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Project repository" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Discussion", exact: true }).click();
  await page
    .getByLabel("Message", { exact: true })
    .fill("Hello future teammates!");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText("Hello future teammates!", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-test-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Browser collaboration test",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Good to see you, Browser." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.request.delete("/api/projects/" + projectId);
});
test("mobile discovery is usable and has no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Great ideas need great people." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Explore projects", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Find your next “let’s build this.”" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search projects" })
    .fill("CampusLoop");
  await expect(
    page.getByRole("heading", { name: "CampusLoop", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("two people can apply, accept, join a workspace, and exchange direct messages", async ({
  browser,
}) => {
  const ownerContext = await browser.newContext(),
    applicantContext = await browser.newContext();
  const stamp = Date.now();
  const profile = {
    college: "Collaboration Institute",
    role: "Developer",
    skills: ["React"],
    interests: ["Web development"],
    experience: "beginner",
    availability: "part-time",
    collaborationMode: "remote",
  };
  async function account(context, name) {
    let r = await context.request.post("/api/auth/register", {
      data: {
        name,
        email: `${name.toLowerCase().replaceAll(" ", "")}-${stamp}@example.com`,
        password: "browser-collaboration-password",
      },
    });
    expect(r.status()).toBe(201);
    const user = (await r.json()).user;
    r = await context.request.put("/api/profile", {
      data: { ...profile, name },
    });
    expect(r.status()).toBe(200);
    return user;
  }
  try {
    const owner = await account(ownerContext, "Team Owner");
    const applicant = await account(applicantContext, "Team Applicant");
    const created = await ownerContext.request.post("/api/projects", {
      data: {
        title: "Two-person browser project",
        tagline: "A real collaboration verified in two browsers.",
        description:
          "A meaningful collaboration project used to verify the complete application and private workspace flow.",
        category: "Web development",
        projectType: "Side project",
        difficulty: "beginner",
        duration: "2 weeks",
        maxTeamSize: 2,
        roles: [
          { title: "Frontend developer", skills: ["React"], positions: 1 },
        ],
        collaborationMode: "remote",
        availability: "part-time",
      },
    });
    expect(created.status()).toBe(201);
    const project = (await created.json()).project;
    const ownerPage = await ownerContext.newPage(),
      applicantPage = await applicantContext.newPage();
    await applicantPage.goto("/projects/" + project._id);
    await applicantPage
      .getByRole("button", { name: "Apply", exact: true })
      .click();
    await applicantPage
      .getByLabel("Introduce yourself")
      .fill(
        "I build thoughtful React interfaces and enjoy working with a team.",
      );
    await applicantPage
      .getByLabel("Why this project?")
      .fill("I want to help bring this useful collaborative idea to life.");
    await applicantPage
      .getByRole("button", { name: "Send application", exact: true })
      .click();
    await expect(
      applicantPage.getByRole("button", { name: "Applied", exact: true }),
    ).toBeVisible();
    await ownerPage.goto("/app/workspace/" + project._id + "?tab=applications");
    await expect(
      ownerPage.getByRole("main").getByRole("link", { name: /Team Applicant/ }),
    ).toBeVisible();
    await ownerPage
      .getByRole("button", { name: "Accept application", exact: true })
      .click();
    await expect(
      ownerPage.getByText("accepted", { exact: true }),
    ).toBeVisible();
    await applicantPage.goto("/app/workspace/" + project._id + "?tab=team");
    await expect(
      applicantPage.getByRole("main").getByRole("link", { name: /Team Applicant/ }),
    ).toBeVisible();
    await applicantPage.goto("/people/" + owner._id);
    await applicantPage
      .getByRole("button", { name: "Say hello", exact: true })
      .click();
    await applicantPage
      .getByLabel("Message", { exact: true })
      .fill("Ready to build something great?");
    await applicantPage.getByRole("button", { name: "Send message" }).click();
    await expect(
      applicantPage.locator(".message-history").getByText("Ready to build something great?", {
        exact: true,
      }),
    ).toBeVisible();
    await ownerPage.goto("/app/messages");
    await ownerPage.getByRole("button", { name: /Team Applicant/ }).click();
    await expect(
      ownerPage
        .getByText("Ready to build something great?", { exact: true })
        .last(),
    ).toBeVisible();
    await ownerPage
      .getByLabel("Message", { exact: true })
      .fill("Absolutely. Welcome to the team!");
    await ownerPage.getByRole("button", { name: "Send message" }).click();
    await expect(
      applicantPage.locator(".message-history").getByText("Absolutely. Welcome to the team!", {
        exact: true,
      }),
    ).toBeVisible();
    await ownerContext.request.delete("/api/projects/" + project._id);
  } finally {
    await ownerContext.close();
    await applicantContext.close();
  }
});
