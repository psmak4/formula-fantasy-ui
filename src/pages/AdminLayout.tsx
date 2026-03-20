import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/admin", label: "Race Ops", end: true },
  { to: "/admin/incidents", label: "Incidents" },
  { to: "/admin/season-assignments", label: "Season Assignments" },
  { to: "/admin/leagues", label: "Leagues" },
  { to: "/admin/users", label: "Users" },
];

function navItemClass(isActive: boolean): string {
  if (isActive) {
    return "block rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700";
  }
  return "block rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-neutral-100";
}

export function AdminLayout() {
  return (
    <section className="relative w-full pb-12 pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, rgba(0,0,0,0) 9px, rgba(0,0,0,0) 14px)",
          opacity: 0.02,
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-3 lg:sticky lg:top-24">
            <nav className="space-y-1" aria-label="Admin navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => navItemClass(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </section>
  );
}
