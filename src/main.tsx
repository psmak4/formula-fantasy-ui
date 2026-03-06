import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { HomePage } from "./pages/HomePage";
import { LeaguePage } from "./pages/LeaguePage";
import { LeaguePredictPage } from "./pages/LeaguePredictPage";
import { LeagueLeaderboardPage } from "./pages/LeagueLeaderboardPage";
import { LeaguesPage } from "./pages/LeaguesPage";
import { CreateLeaguePage } from "./pages/CreateLeaguePage";
import { InvitePage } from "./pages/InvitePage";
import { AdminPage } from "./pages/AdminPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminLeaguesPage } from "./pages/AdminLeaguesPage";
import { AdminRacesPage } from "./pages/AdminRacesPage";
import { AdminRaceDetailsPage } from "./pages/AdminRaceDetailsPage";
import { AdminSessionsPage } from "./pages/AdminSessionsPage";
import { AdminConstructorsPage } from "./pages/AdminConstructorsPage";
import { AdminDriversPage } from "./pages/AdminDriversPage";
import { AdminSeasonsPage } from "./pages/AdminSeasonsPage";
import { AdminCountriesPage } from "./pages/AdminCountriesPage";
import { AdminCircuitsPage } from "./pages/AdminCircuitsPage";
import { AdminCountryDetailsPage } from "./pages/AdminCountryDetailsPage";
import { AdminCircuitDetailsPage } from "./pages/AdminCircuitDetailsPage";
import { AdminEntriesPage } from "./pages/AdminEntriesPage";
import { AdminDriverDetailsPage } from "./pages/AdminDriverDetailsPage";
import { AdminConstructorDetailsPage } from "./pages/AdminConstructorDetailsPage";
import { AdminSeasonDetailsPage } from "./pages/AdminSeasonDetailsPage";
import { AdminLayout } from "./pages/AdminLayout";
import { ProfilePage } from "./pages/ProfilePage";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { Toaster } from "./components/ui/sonner";
import { queryClient } from "./lib/queryClient";
import "./styles.css";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
