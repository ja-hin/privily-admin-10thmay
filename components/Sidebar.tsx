"use client";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getUser } from "@/lib/api";

const nav = [
  { href: "/dashboard",    label: "Dashboard",    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/bookings",     label: "Bookings",     icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/transactions", label: "Transactions", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { href: "/ratings",      label: "Ratings",      icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { href: "/users",        label: "Users",        icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/staff",        label: "Staff",        icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { href: "/pods",         label: "Pods",         icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { href: "/locations",    label: "Locations",    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/categories",   label: "Categories",   icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { href: "/features",     label: "Features",     icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
  { href: "/pricing",      label: "Pricing",      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 18, height: 18 }}>
      {d.split(" M").map((part, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={i === 0 ? part : "M" + part} />
      ))}
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside
      className="w-64 min-h-screen flex flex-col fixed top-0 left-0 z-40"
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-tight">Privily</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Admin Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div key={item.href} className="flex items-center group">
              <a
                href={item.href}
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault();
                    router.push(item.href);
                  }
                }}
                className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={active
                  ? { background: "rgba(99,102,241,0.18)", color: "#a5b4fc" }
                  : { color: "rgba(255,255,255,0.5)" }
                }
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; }}
                onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; } }}
              >
                {active && (
                  <span className="absolute left-3 w-0.5 h-5 rounded-full" style={{ background: "#6366f1" }} />
                )}
                <NavIcon d={item.icon} />
                <span>{item.label}</span>
              </a>
              <a href={item.href} target="_blank" rel="noopener noreferrer"
                aria-label={`Open ${item.label} in new tab`}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-opacity"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            {user?.firstname?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user ? `${user.firstname} ${user.lastname}` : "Admin"}</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{user?.email}</p>
          </div>
          <button type="button" onClick={handleLogout} title="Logout"
            className="shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
