import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import("./pages/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminLeaguesPage = lazy(() =>
  import("./pages/AdminLeaguesPage").then((module) => ({
    default: module.AdminLeaguesPage,
  })),
);
const AdminRacesPage = lazy(() =>
  import("./pages/AdminRacesPage").then((module) => ({
    default: module.AdminRacesPage,
  })),
);
const AdminRaceDetailsPage = lazy(() =>
  import("./pages/AdminRaceDetailsPage").then((module) => ({
    default: module.AdminRaceDetailsPage,
  })),
);
const AdminSessionsPage = lazy(() =>
  import("./pages/AdminSessionsPage").then((module) => ({
    default: module.AdminSessionsPage,
  })),
);
const AdminConstructorsPage = lazy(() =>
  import("./pages/AdminConstructorsPage").then((module) => ({
    default: module.AdminConstructorsPage,
  })),
);
const AdminDriversPage = lazy(() =>
  import("./pages/AdminDriversPage").then((module) => ({
    default: module.AdminDriversPage,
  })),
);
const AdminSeasonsPage = lazy(() =>
  import("./pages/AdminSeasonsPage").then((module) => ({
    default: module.AdminSeasonsPage,
  })),
);
const AdminCountriesPage = lazy(() =>
  import("./pages/AdminCountriesPage").then((module) => ({
    default: module.AdminCountriesPage,
  })),
);
const AdminCircuitsPage = lazy(() =>
  import("./pages/AdminCircuitsPage").then((module) => ({
    default: module.AdminCircuitsPage,
  })),
);
const AdminCountryDetailsPage = lazy(() =>
  import("./pages/AdminCountryDetailsPage").then((module) => ({
    default: module.AdminCountryDetailsPage,
  })),
);
const AdminCircuitDetailsPage = lazy(() =>
  import("./pages/AdminCircuitDetailsPage").then((module) => ({
    default: module.AdminCircuitDetailsPage,
  })),
);
const AdminEntriesPage = lazy(() =>
  import("./pages/AdminEntriesPage").then((module) => ({
    default: module.AdminEntriesPage,
  })),
);
const AdminDriverDetailsPage = lazy(() =>
  import("./pages/AdminDriverDetailsPage").then((module) => ({
    default: module.AdminDriverDetailsPage,
  })),
);
const AdminConstructorDetailsPage = lazy(() =>
  import("./pages/AdminConstructorDetailsPage").then((module) => ({
    default: module.AdminConstructorDetailsPage,
  })),
);
const AdminSeasonDetailsPage = lazy(() =>
  import("./pages/AdminSeasonDetailsPage").then((module) => ({
    default: module.AdminSeasonDetailsPage,
  })),
);
const AdminLayout = lazy(() =>
  import("./pages/AdminLayout").then((module) => ({
    default: module.AdminLayout,
  })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
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
              <Route path="/leagues" element={<LeaguesPage />} />
              <Route path="/leagues/create" element={<CreateLeaguePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminPage />} />
                <Route path="leagues" element={<AdminLeaguesPage />} />
                <Route path="races" element={<AdminRacesPage />} />
                <Route path="races/:raceId" element={<AdminRaceDetailsPage />} />
                <Route path="sessions" element={<AdminSessionsPage />} />
                <Route path="constructors" element={<AdminConstructorsPage />} />
                <Route path="constructors/:constructorId" element={<AdminConstructorDetailsPage />} />
                <Route path="drivers" element={<AdminDriversPage />} />
                <Route path="drivers/:driverId" element={<AdminDriverDetailsPage />} />
                <Route path="seasons" element={<AdminSeasonsPage />} />
                <Route path="seasons/:seasonId" element={<AdminSeasonDetailsPage />} />
                <Route path="countries" element={<AdminCountriesPage />} />
                <Route path="countries/:countryId" element={<AdminCountryDetailsPage />} />
                <Route path="circuits" element={<AdminCircuitsPage />} />
                <Route path="circuits/:circuitId" element={<AdminCircuitDetailsPage />} />
                <Route path="entries" element={<AdminEntriesPage />} />
              </Route>
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
              <Route path="/invite/:token" element={<InvitePage />} />
              <Route path="/league/:leagueId" element={<LeaguePage />} />
              <Route path="/league/:leagueId/predict" element={<LeaguePredictPage />} />
              <Route
                path="/league/:leagueId/races/:raceId/leaderboard"
                element={<LeagueLeaderboardPage />}
              />
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
