"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";

interface Stats {
  overview: { totalUsers: number; totalBookings: number; totalPods: number; totalLocations: number; totalStaff: number; totalTransactions: number; totalRevenue: number };
  bookingsByStatus: Record<string, number>;
  recentBookings: { _id: string; podTitle: string; status: string; bookingDate: string; user?: { firstname: string; lastname: string; email: string } }[];
  recentTransactions: { _id: string; amount: number; currency: string; status: string; createdAt: string }[];
  monthlyRevenue: { _id: { year: number; month: number }; revenue: number; count: number }[];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STATUS_COLORS: Record<string, string> = {
  Completed: "#22c55e", Confirmed: "#3b82f6", Pending: "#f59e0b",
  Processing: "#8b5cf6", Cancelled: "#ef4444", Rated: "#d946ef",
};

function fmt(d?: string) {
  return d ? new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" }) : "—";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Stats>("/admin/stats").then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    </AdminLayout>
  );

  const o = stats!.overview;
  const maxRevenue = Math.max(...stats!.monthlyRevenue.map((m) => m.revenue), 1);
  const statusEntries = Object.entries(stats!.bookingsByStatus).filter(([, v]) => v > 0);

  return (
    <AdminLayout>
      <div className="space-y-7">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Revenue" value={`R ${(o.totalRevenue / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`} icon="💰" gradient="linear-gradient(135deg, #10b981, #059669)" sub="from completed payments" />
          <StatCard title="Total Bookings" value={o.totalBookings} icon="📅" gradient="linear-gradient(135deg, #6366f1, #8b5cf6)" />
          <StatCard title="Active Users" value={o.totalUsers} icon="👥" gradient="linear-gradient(135deg, #3b82f6, #06b6d4)" />
          <StatCard title="Transactions" value={o.totalTransactions} icon="💳" gradient="linear-gradient(135deg, #f59e0b, #ef4444)" />
          <StatCard title="Total Pods" value={o.totalPods} icon="🏢" gradient="linear-gradient(135deg, #8b5cf6, #ec4899)" />
          <StatCard title="Locations" value={o.totalLocations} icon="📍" gradient="linear-gradient(135deg, #14b8a6, #06b6d4)" />
          <StatCard title="Staff Members" value={o.totalStaff} icon="🧑‍💼" gradient="linear-gradient(135deg, #f97316, #ef4444)" />
          <StatCard title="Completed" value={stats!.bookingsByStatus.Completed || 0} icon="✅" gradient="linear-gradient(135deg, #22c55e, #10b981)" sub="bookings" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Revenue Bar Chart */}
          <div className="card p-6 lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Revenue Overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">Monthly revenue (last 12 months)</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">R {(o.totalRevenue / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
            </div>
            {stats!.monthlyRevenue.length === 0 ? (
              <div className="h-40 flex items-center justify-center">
                <p className="text-slate-400 text-sm">No revenue data yet</p>
              </div>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {stats!.monthlyRevenue.map((m) => {
                  const pct = (m.revenue / maxRevenue) * 100;
                  return (
                    <div key={`${m._id.year}-${m._id.month}`} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="relative w-full flex flex-col justify-end" style={{ height: "120px" }}>
                        <div
                          className="w-full rounded-t-lg transition-all group-hover:opacity-80"
                          style={{
                            height: `${Math.max(pct, 3)}%`,
                            background: "linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)",
                          }}
                          title={`R ${(m.revenue / 100).toFixed(2)}`}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{MONTHS[m._id.month - 1]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Booking Status Donut */}
          <div className="card p-6 lg:col-span-2">
            <h3 className="text-base font-bold text-slate-900 mb-1">Booking Status</h3>
            <p className="text-xs text-slate-400 mb-5">All time distribution</p>
            <div className="space-y-3">
              {statusEntries.map(([status, count]) => {
                const pct = o.totalBookings ? Math.round((count / o.totalBookings) * 100) : 0;
                const color = STATUS_COLORS[status] || "#94a3b8";
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-xs font-medium text-slate-700">{status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{count}</span>
                        <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent Bookings */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Bookings</h3>
                <p className="text-xs text-slate-400 mt-0.5">Latest 10 bookings</p>
              </div>
              <a href="/bookings" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View all
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </a>
            </div>
            <div className="divide-y divide-slate-50">
              {stats!.recentBookings.length === 0 ? (
                <p className="px-6 py-6 text-sm text-slate-400 text-center">No bookings yet</p>
              ) : stats!.recentBookings.map((b) => (
                <div key={b._id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                    {b.user?.firstname?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{b.podTitle}</p>
                    <p className="text-xs text-slate-400 truncate">{b.user ? `${b.user.firstname} ${b.user.lastname}` : "—"} · {fmt(b.bookingDate)}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
                <p className="text-xs text-slate-400 mt-0.5">Latest 10 payments</p>
              </div>
              <a href="/transactions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View all
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </a>
            </div>
            <div className="divide-y divide-slate-50">
              {stats!.recentTransactions.length === 0 ? (
                <p className="px-6 py-6 text-sm text-slate-400 text-center">No transactions yet</p>
              ) : stats!.recentTransactions.map((t) => (
                <div key={t._id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${t.status === "successful" || t.status === "success" ? "bg-emerald-100" : "bg-red-100"}`}>
                    {t.status === "successful" || t.status === "success" ? "✓" : "✗"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{t.currency} {(t.amount / 100).toFixed(2)}</p>
                    <p className="text-xs text-slate-400 font-mono">{t._id.slice(-10)} · {fmt(t.createdAt)}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
