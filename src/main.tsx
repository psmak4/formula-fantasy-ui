import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { Toaster } from "./components/ui/sonner";
import { queryClient } from "./lib/queryClient";
import "./styles.css";

const AppShell = lazy(() =>
  import("./components/AppShell").then((module) => ({
    default: module.AppShell,
  })),
);

const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({
    default: module.HomePage,
  })),
);
const LeaguePage = lazy(() =>
  import("./pages/LeaguePage").then((module) => ({
    default: module.LeaguePage,
  })),
);
const LeaguePredictPage = lazy(() =>
  import("./pages/LeaguePredictPage").then((module) => ({
    default: module.LeaguePredictPage,
  })),
);
const LeagueLeaderboardPage = lazy(() =>
  import("./pages/LeagueLeaderboardPage").then((module) => ({
    default: module.LeagueLeaderboardPage,
  })),
);
const LeaguesPage = lazy(() =>
  import("./pages/LeaguesPage").then((module) => ({
    default: module.LeaguesPage,
  })),
);
const CreateLeaguePage = lazy(() =>
  import("./pages/CreateLeaguePage").then((module) => ({
    default: module.CreateLeaguePage,
  })),
);
const InvitePage = lazy(() =>
  import("./pages/InvitePage").then((module) => ({
    default: module.InvitePage,
  })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);
const MyResultsPage = lazy(() =>
  import("./pages/MyResultsPage").then((module) => ({
    default: module.MyResultsPage,
  })),
);
const SignInPage = lazy(() =>
  import("./pages/SignInPage").then((module) => ({
    default: module.SignInPage,
  })),
);
const SignUpPage = lazy(() =>
  import("./pages/SignUpPage").then((module) => ({
    default: module.SignUpPage,
  })),
);

function RouteLoadingFallback() {
  return (
    <div
      className="mx-auto flex min-h-[calc(100svh-133px)] w-full max-w-7xl items-center justify-center px-6 py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm text-neutral-600">Loading page…</p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
              <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/leagues"
                element={
                  <RequireAuth>
                    <LeaguesPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/leagues/create"
                element={
                  <RequireAuth>
                    <CreateLeaguePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/results"
                element={
                  <RequireAuth>
                    <MyResultsPage />
                  </RequireAuth>
                }
              />
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
              <Route path="/invite/:token" element={<InvitePage />} />
              <Route
                path="/league/:leagueId"
                element={
                  <RequireAuth>
                    <LeaguePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/league/:leagueId/predict"
                element={
                  <RequireAuth>
                    <LeaguePredictPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/league/:leagueId/races/:raceId/leaderboard"
                element={
                  <RequireAuth>
                    <LeagueLeaderboardPage />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<HomePage />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
