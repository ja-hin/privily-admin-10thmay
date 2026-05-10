"use client";
import Sidebar from "./Sidebar";
import { useRequireAuth } from "@/lib/hooks";
import { usePathname } from "next/navigation";

const titles: Record<string, { title: string; desc: string }> = {
  "/dashboard":    { title: "Dashboard",        desc: "Platform overview & key metrics" },
  "/bookings":     { title: "Bookings",          desc: "Manage all pod bookings" },
  "/transactions": { title: "Transactions",      desc: "Payment history & revenue" },
  "/ratings":      { title: "Ratings & Reviews", desc: "Customer feedback & ratings" },
  "/users":        { title: "Users",             desc: "Manage registered users" },
  "/staff":        { title: "Staff",             desc: "Team members & permissions" },
  "/pods":         { title: "Pods",              desc: "Create, edit & manage pods" },
  "/locations":    { title: "Locations",         desc: "Office locations" },
  "/categories":   { title: "Categories",        desc: "Pod category types" },
  "/features":     { title: "Features",          desc: "Amenities & features" },
  "/pricing":      { title: "Pricing",           desc: "Global rates & discounts" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useRequireAuth();
  const pathname = usePathname();
  const meta = titles[pathname] || { title: "Admin", desc: "" };

  return (
    <div className="flex min-h-screen" style={{ background: "#f1f5f9" }}>
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200/80 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{meta.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500 font-medium">Live</span>
          </div>
        </header>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
