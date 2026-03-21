import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/admin", label: "Race Ops", end: true, code: "R-01" },
  { to: "/admin/incidents", label: "Incidents", code: "I-02" },
  { to: "/admin/season-assignments", label: "Assignments", code: "S-03" },
  { to: "/admin/leagues", label: "Leagues", code: "L-04" },
  { to: "/admin/users", label: "Users", code: "U-05" },
];

function railLinkClass(isActive: boolean): string {
  if (isActive) {
    return "grid gap-2 border border-[#5a1010] bg-[linear-gradient(180deg,#2a0c0c_0%,#160b0b_100%)] px-4 py-4 text-white";
  }

  return "grid gap-2 border border-white/6 bg-white/3 px-4 py-4 text-[#b8bac2] transition hover:border-white/12 hover:bg-white/5 hover:text-white";
}

function mobileLinkClass(isActive: boolean): string {
  if (isActive) {
    return "ff-display border-b-2 border-[#cc0000] px-1 pb-2 text-[11px] tracking-[0.16em] text-white";
  }

  return "ff-display border-b-2 border-transparent px-1 pb-2 text-[11px] tracking-[0.16em] text-[#7f828b] transition-colors hover:text-white";
}

export function AdminLayout() {
  return (
    <section className="px-6 py-12 md:py-16">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(204,0,0,0.18),transparent_24%),linear-gradient(135deg,#0d0e12_0%,#15171c_52%,#20232b_100%)]">
          <div className="flex flex-col gap-6 px-8 py-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="ff-kicker bg-[#cc0000] px-3 py-2 text-white">Admin Control</span>
                <span className="ff-kicker bg-white/6 px-3 py-2 text-[#d0d3d9]">Operational Surface</span>
              </div>
              <div className="space-y-2">
                <p className="ff-kicker">Formula Fantasy Ops Console</p>
                <h1 className="ff-display text-4xl text-white md:text-6xl">
                  Control Room
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-[#c2c4cb] md:text-base">
                  Audit ingestion, repair data, and manage users and leagues from a single operational workspace.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="border border-white/8 bg-black/20 px-4 py-4">
                <p className="ff-kicker">Mode</p>
                <p className="mt-2 text-2xl font-black text-white">Live</p>
              </div>
              <div className="border border-white/8 bg-black/20 px-4 py-4">
                <p className="ff-kicker">Audit</p>
                <p className="mt-2 text-2xl font-black text-[#e9c400]">Required</p>
              </div>
              <div className="border border-white/8 bg-black/20 px-4 py-4">
                <p className="ff-kicker">Scope</p>
                <p className="mt-2 text-2xl font-black text-white">Admin</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-white/6 md:hidden">
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
            <div className="sticky top-28 space-y-5 border border-white/8 bg-[#15161b] p-4">
              <div className="space-y-2 border-b border-white/6 pb-4">
                <p className="ff-kicker">Navigation Rail</p>
                <p className="ff-display text-2xl text-white">Admin Systems</p>
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
                              isActive ? "text-[#ff7373]" : "text-[#7f828b]"
                            }`}
                          >
                            {item.code}
                          </span>
                        </div>
                        <span className="text-xs text-[#989aa2]">
                          {item.label === "Race Ops"
                            ? "Ingestion and scoring health"
                            : item.label === "Incidents"
                              ? "Operational repair queue"
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
