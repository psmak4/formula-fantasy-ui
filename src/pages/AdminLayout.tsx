import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/admin", label: "Race Ops", end: true, code: "R-01" },
  { to: "/admin/incidents", label: "Incidents", code: "I-02" },
  { to: "/admin/season-assignments", label: "Assignments", code: "S-03" },
  { to: "/admin/leagues", label: "Leagues", code: "L-04" },
  { to: "/admin/users", label: "Users", code: "U-05" },
  { to: "/admin/hero-preview", label: "Hero Lab", code: "H-06" },
];

function railLinkClass(isActive: boolean): string {
  if (isActive) {
    return "grid gap-2 bg-primary-container px-4 py-4 text-on-primary-container";
  }

  return "grid gap-2 bg-surface-container-low px-4 py-4 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface";
}

function mobileLinkClass(isActive: boolean): string {
  if (isActive) {
    return "ff-display border-b-2 border-primary px-1 pb-2 text-[11px] tracking-[0.16em] text-on-surface";
  }

  return "ff-display border-b-2 border-transparent px-1 pb-2 text-[11px] tracking-[0.16em] text-on-surface-variant transition-colors hover:text-on-surface";
}

export function AdminLayout() {
  return (
    <section className="px-6 py-12 md:py-16">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden bg-surface-container">
          <div className="flex flex-col gap-6 px-8 py-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="ff-kicker bg-primary px-3 py-2 text-on-primary">Admin Control</span>
                <span className="ff-kicker bg-surface-container-high px-3 py-2 text-on-surface-variant">Operational Surface</span>
              </div>
              <div className="space-y-2">
                <p className="ff-kicker">Formula Fantasy Ops Console</p>
                <h1 className="ff-display text-4xl text-on-surface md:text-6xl">
                  Control Room
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base">
                  Audit ingestion, repair data, and manage users and leagues from a single operational workspace.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="bg-surface-container-lowest px-4 py-4">
                <p className="ff-kicker">Mode</p>
                <p className="mt-2 text-2xl font-black text-on-surface">Live</p>
              </div>
              <div className="bg-surface-container-lowest px-4 py-4">
                <p className="ff-kicker">Audit</p>
                <p className="mt-2 text-2xl font-black text-warning">Required</p>
              </div>
              <div className="bg-surface-container-lowest px-4 py-4">
                <p className="ff-kicker">Scope</p>
                <p className="mt-2 text-2xl font-black text-on-surface">Admin</p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <nav
            className="flex items-center gap-5 overflow-x-auto pt-2"
            aria-label="Admin mobile navigation"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => mobileLinkClass(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-5 bg-surface-container-low p-4">
              <div className="space-y-2 pb-4">
                <p className="ff-kicker">Navigation Rail</p>
                <p className="ff-display text-2xl text-on-surface">Admin Systems</p>
              </div>

              <nav className="space-y-3" aria-label="Admin navigation">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => railLinkClass(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <span className="ff-display text-sm tracking-[0.12em]">
                            {item.label}
                          </span>
                          <span
                            className={`ff-kicker ${
                              isActive ? "text-on-primary-container" : "text-on-surface-variant"
                            }`}
                          >
                            {item.code}
                          </span>
                        </div>
                        <span className="text-xs text-on-surface-variant">
                          {item.label === "Race Ops"
                            ? "Ingestion and scoring health"
                            : item.label === "Incidents"
                              ? "Operational repair queue"
                              : item.label === "Hero Lab"
                                ? "Race hero preview surface"
                              : item.label === "Assignments"
                                ? "Season-entry management"
                                : item.label === "Leagues"
                                  ? "League administration"
                                  : "User operations and access"}
                        </span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </section>
  );
}
