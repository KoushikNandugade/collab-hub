import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { AuthProvider } from "./lib/auth";
import { ToastProvider, Empty, Loading, Button } from "./components/ui";
import { Protected, PublicLayout, AppLayout } from "./components/layout";
import "./styles.css";
const Landing = lazy(() => import("./pages/Landing"));
const AuthPage = lazy(() =>
  import("./pages/Auth").then((module) => ({ default: module.AuthPage })),
);
const ProfileForm = lazy(() =>
  import("./pages/Auth").then((module) => ({ default: module.ProfileForm })),
);
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Discover = lazy(() => import("./pages/Discover"));
const ProjectDetail = lazy(() =>
  import("./pages/Project").then((module) => ({
    default: module.ProjectDetail,
  })),
);
const ProjectEditor = lazy(() =>
  import("./pages/Project").then((module) => ({
    default: module.ProjectEditor,
  })),
);
const Workspace = lazy(() => import("./pages/Workspace"));
const Messages = lazy(() => import("./pages/Messages"));
const Profile = lazy(() =>
  import("./pages/Community").then((module) => ({ default: module.Profile })),
);
const Notifications = lazy(() =>
  import("./pages/Community").then((module) => ({
    default: module.Notifications,
  })),
);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10000 },
  },
});
class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="container section">
        <Empty
          title="A small bump in the road."
          description="Reload the page to reconnect with your workspace."
          action={
            <Button onClick={() => window.location.reload()}>
              Reload page
            </Button>
          }
        />
      </div>
    ) : (
      this.props.children
    );
  }
}
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/explore" element={<Discover />} />
          <Route path="/people" element={<Discover people />} />
          <Route path="/people/:id" element={<Profile />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
        </Route>
        <Route path="/register" element={<AuthPage key="register" signup />} />
        <Route path="/login" element={<AuthPage key="login" />} />
        <Route element={<Protected />}>
          <Route
            path="/onboarding"
            element={
              <div className="onboarding-page">
                <ProfileForm onboarding />
              </div>
            }
          />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="my-projects" element={<Dashboard myProjects />} />
            <Route path="projects/new" element={<ProjectEditor />} />
            <Route path="projects/:id/edit" element={<ProjectEditor />} />
            <Route path="workspace/:id" element={<Workspace />} />
            <Route path="profile" element={<ProfileForm />} />
            <Route path="messages" element={<Messages />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="saved" element={<Discover saved />} />
          </Route>
        </Route>
        <Route
          path="*"
          element={
            <Empty
              title="A little off the beaten path."
              description="This page doesn’t exist. Your next possibility is back home."
              action={
                <Link className="btn primary" to="/">
                  Back to CollabHub
                </Link>
              }
            />
          }
        />
      </Routes>
    </Suspense>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <MotionConfig reducedMotion="user">
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </MotionConfig>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
